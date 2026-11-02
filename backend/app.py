import os
import re
import psycopg2
from psycopg2.extras import RealDictCursor
from flask import Flask, request, jsonify, g
from flask_cors import CORS
from werkzeug.security import generate_password_hash, check_password_hash

# ================================================================ app & DB
app = Flask(__name__)
CORS(app)

DB_HOST = "localhost"
DB_NAME = "warkop99"
DB_USER = "postgres"
DB_PASS = "passlokal"


def get_conn():
    """Satu koneksi per request, disimpan di Flask g."""
    if "db" not in g:
        g.db = psycopg2.connect(
            host=DB_HOST, database=DB_NAME, user=DB_USER, password=DB_PASS,
            cursor_factory=RealDictCursor,
        )
    return g.db


@app.teardown_appcontext
def close_conn(exc=None):
    conn = g.pop("db", None)
    if conn is not None:
        conn.close()


# ================================================================ constants (orders)
STATUSES       = ("MENUNGGU", "DITERIMA", "DIPROSES", "DIKIRIM", "SELESAI", "DIBATALKAN")
FINAL_STATUSES = ("SELESAI", "DIBATALKAN")
TRANSITIONS    = {
    "MENUNGGU":   ("DITERIMA", "DIBATALKAN"),
    "DITERIMA":   ("DIPROSES", "DIBATALKAN"),
    "DIPROSES":   ("DIKIRIM",  "DIBATALKAN"),
    "DIKIRIM":    ("SELESAI",),
    "SELESAI":    (),
    "DIBATALKAN": (),
}
PAYMENT_METHODS  = ("QRIS", "CASH")
MAX_QTY_PER_ITEM = 99

PASSWORD_RE = {
    "upper":  (re.compile(r"[A-Z]"),       "Password harus mengandung minimal 1 huruf besar (A-Z)."),
    "lower":  (re.compile(r"[a-z]"),       "Password harus mengandung minimal 1 huruf kecil (a-z)."),
    "digit":  (re.compile(r"[0-9]"),       "Password harus mengandung minimal 1 angka (0-9)."),
    "symbol": (re.compile(r"[^A-Za-z0-9]"),"Password harus mengandung minimal 1 karakter simbol."),
}


# ================================================================ helpers
def json_body():
    body = request.get_json(silent=True)
    if not isinstance(body, dict):
        return jsonify(status="error", message="Body request harus berupa JSON object."), 400
    return body, None   # (body, err_response) — caller checks err_response is not None


def ok(data=None, message=None, **extra):
    payload = {"status": "success"}
    if message:
        payload["message"] = message
    if data is not None:
        payload.update(data)
    payload.update(extra)
    return jsonify(payload)


def err(message, code=400, **extra):
    return jsonify(status="error", message=message, **extra), code


def validate_password_strength(pw):
    """Returns (True, None) kalau kuat, (False, error_response) kalau tidak."""
    if len(pw) < 8:
        return False, err("Password minimal 8 karakter.")
    for _, (pattern, msg) in PASSWORD_RE.items():
        if not pattern.search(pw):
            return False, err(msg)
    return True, None


def fetch_order(cur, order_id, customer_id=None):
    """Detail order lengkap. Jika customer_id diisi, order milik orang lain -> None."""
    cur.execute(
        """SELECT o.order_id, o.order_date, o.total_price, o.delivery_address, o.status,
                  o.customer_id, u.nama AS customer_nama
           FROM orders o JOIN users u ON u.user_id = o.customer_id
           WHERE o.order_id = %s""",
        (order_id,),
    )
    order = cur.fetchone()
    if order is None or (customer_id is not None and order["customer_id"] != customer_id):
        return None

    cur.execute(
        """SELECT menu_id, name, quantity, unit_price, quantity * unit_price AS subtotal
           FROM order_items WHERE order_id = %s ORDER BY item_id""",
        (order_id,),
    )
    order["items"] = cur.fetchall()

    cur.execute(
        """SELECT s.status, s.updated_at, u.nama AS updated_by
           FROM order_status s LEFT JOIN users u ON u.user_id = s.updated_by
           WHERE s.order_id = %s ORDER BY s.status_id""",
        (order_id,),
    )
    order["status_history"] = cur.fetchall()

    cur.execute("SELECT method, status FROM payments WHERE order_id = %s", (order_id,))
    order["payment"] = cur.fetchone()
    return order


def change_status(cur, order_id, new_status, employee_id, invalid_msg=None):
    """Satu-satunya pintu untuk ganti status. Wajib dipanggil di dalam transaksi aktif."""
    if new_status not in STATUSES:
        return err(f"Status harus salah satu dari: {', '.join(STATUSES)}.")

    cur.execute("SELECT status FROM orders WHERE order_id = %s FOR UPDATE", (order_id,))
    row = cur.fetchone()
    if row is None:
        return err("Pesanan tidak ditemukan.", 404)

    current = row["status"]
    if current in FINAL_STATUSES:
        return err(invalid_msg or "Status pesanan tidak dapat diubah.", 409)
    if new_status not in TRANSITIONS[current]:
        return err(invalid_msg or f"Status tidak bisa diubah dari {current} ke {new_status}.", 409)

    cur.execute(
        "UPDATE orders SET status = %s, employee_id = COALESCE(employee_id, %s) WHERE order_id = %s",
        (new_status, employee_id, order_id),
    )
    cur.execute(
        "INSERT INTO order_status (order_id, status, updated_by) VALUES (%s, %s, %s)",
        (order_id, new_status, employee_id),
    )

    if new_status == "DIBATALKAN":
        cur.execute(
            """SELECT 1 FROM menu_items
               WHERE menu_id IN (SELECT menu_id FROM order_items WHERE order_id = %s)
               ORDER BY menu_id FOR UPDATE""",
            (order_id,),
        )
        cur.execute(
            """UPDATE menu_items m SET stock = m.stock + oi.quantity
               FROM order_items oi WHERE oi.order_id = %s AND oi.menu_id = m.menu_id""",
            (order_id,),
        )
        cur.execute(
            "UPDATE payments SET status = 'CANCELLED' WHERE order_id = %s AND status = 'PENDING'",
            (order_id,),
        )
    return None   # None = tidak ada error


# ================================================================ UC #3 — Login
@app.post("/api/auth/login")
def login():
    body, e = json_body()
    if e:
        return e
    username = str(body.get("username", "")).strip()
    password = str(body.get("password", ""))

    conn = get_conn()
    with conn.cursor() as cur:
        cur.execute(
            "SELECT user_id, nama, role, password_hash FROM users WHERE username = %s",
            (username,),
        )
        user = cur.fetchone()

    if user is None or not check_password_hash(user["password_hash"], password):
        return err("Username atau password tidak sesuai.", 401)

    return ok({"user": {"user_id": user["user_id"], "nama": user["nama"], "role": user["role"]}})


# ================================================================ UC #4 — Register (customer)
@app.post("/api/auth/register")
def register():
    body, e = json_body()
    if e:
        return e
    nama     = str(body.get("nama",     "")).strip()
    username = str(body.get("username", "")).strip()
    email    = str(body.get("email",    "")).strip().lower()
    phone    = str(body.get("phone",    "")).strip()
    password = str(body.get("password", ""))

    if not all([nama, username, email, phone, password]):
        return err("Semua field wajib diisi.")
    if not re.match(r"^[^@\s]+@[^@\s]+\.[^@\s]+$", email):
        return err("Format email tidak valid.")
    if len(password) < 8:
        return err("Password minimal 8 karakter.")

    conn = get_conn()
    try:
        with conn, conn.cursor() as cur:
            cur.execute(
                """INSERT INTO users (nama, username, email, phone, password_hash, role)
                   VALUES (%s, %s, %s, %s, %s, 'customer')
                   RETURNING user_id, nama, username, email, role""",
                (nama, username, email, phone, generate_password_hash(password)),
            )
            user = cur.fetchone()
    except psycopg2.errors.UniqueViolation:
        return err("Username atau email sudah terdaftar.", 409)

    return ok({"user": user}, message="Registrasi berhasil."), 201


# ================================================================ UC #5 — Logout
@app.post("/api/auth/logout")
def logout():
    # Stateless: tidak ada session/token di server, cukup konfirmasi ke client.
    return ok(message="Logout berhasil.")


# ================================================================ UC #6 — Forgot password
@app.post("/api/auth/forgot-password")
def forgot_password():
    body, e = json_body()
    if e:
        return e
    username     = str(body.get("username",     "")).strip()
    nama_lengkap = str(body.get("nama",         "")).strip()
    new_password = str(body.get("new_password", "")).strip()

    if not username or not nama_lengkap:
        return err("Username dan nama lengkap wajib diisi.")

    conn = get_conn()
    with conn.cursor() as cur:
        cur.execute(
            "SELECT user_id FROM users WHERE username = %s AND LOWER(nama) = LOWER(%s)",
            (username, nama_lengkap),
        )
        user = cur.fetchone()

    if not user:
        return err("Kombinasi username dan nama lengkap tidak ditemukan.", 404)

    # Kalau new_password dikirim sekaligus, langsung reset
    if new_password:
        ok_pw, e_pw = validate_password_strength(new_password)
        if not ok_pw:
            return e_pw
        with conn, conn.cursor() as cur:
            cur.execute(
                "UPDATE users SET password_hash = %s WHERE user_id = %s",
                (generate_password_hash(new_password), user["user_id"]),
            )
        return ok(message="Password berhasil direset.")

    # Tahap 1: verifikasi identitas saja
    return ok(message="Identitas cocok, lanjutkan reset password.")


# ================================================================ UC #7 — Update password
@app.put("/api/users/<int:user_id>/password")
def update_password(user_id):
    body, e = json_body()
    if e:
        return e
    old_password = str(body.get("old_password", ""))
    new_password = str(body.get("new_password", ""))

    if not old_password or not new_password:
        return err("Password lama dan baru wajib diisi.")

    ok_pw, e_pw = validate_password_strength(new_password)
    if not ok_pw:
        return e_pw

    conn = get_conn()
    with conn.cursor() as cur:
        cur.execute("SELECT password_hash FROM users WHERE user_id = %s", (user_id,))
        user = cur.fetchone()

    if not user or not check_password_hash(user["password_hash"], old_password):
        return err("Password lama yang dimasukkan salah.", 401)

    with conn, conn.cursor() as cur:
        cur.execute(
            "UPDATE users SET password_hash = %s WHERE user_id = %s",
            (generate_password_hash(new_password), user_id),
        )
    return ok(message="Password berhasil diperbarui.")


# ================================================================ UC #8 — Update profile image
@app.put("/api/users/<int:user_id>/profile-image")
def update_profile_image(user_id):
    body, e = json_body()
    if e:
        return e
    profile_url = body.get("profile_url")
    if not profile_url:
        return err("profile_url wajib diisi.")

    conn = get_conn()
    with conn, conn.cursor() as cur:
        cur.execute("UPDATE users SET profile_url = %s WHERE user_id = %s", (profile_url, user_id))
    return ok(message="Foto profil berhasil diperbarui.")


@app.get("/api/users/<int:user_id>")
def get_user(user_id):
    with get_conn().cursor() as cur:
        cur.execute("SELECT user_id, nama, role, email, phone, profile_url FROM users WHERE user_id = %s", (user_id,))
        user = cur.fetchone()
    if not user:
        return err("User tidak ditemukan.", 404)
    return ok({"user": user})


# ================================================================ UC #0 — Lihat daftar menu (publik)
@app.get("/api/menu")
def list_menu():
    with get_conn().cursor() as cur:
        cur.execute(
            """SELECT menu_id, name, description, price, stock, (stock > 0) AS tersedia
               FROM menu_items WHERE is_active ORDER BY menu_id"""
        )
        items = cur.fetchall()
    return jsonify(items)


# ================================================================ UC #1 — Customer: Memesan makanan
@app.post("/api/orders")
def create_order():
    body, e = json_body()
    if e:
        return e

    # — validasi items
    raw = body.get("items")
    if not isinstance(raw, list) or not raw:
        return err("Pilih minimal satu item menu.")
    wanted = {}
    for it in raw:
        if not isinstance(it, dict):
            return err("Format item tidak valid.")
        menu_id, qty = it.get("menu_id"), it.get("quantity")
        if not all(isinstance(v, int) and not isinstance(v, bool) for v in (menu_id, qty)) or qty < 1:
            return err("menu_id dan quantity harus bilangan bulat, quantity minimal 1.")
        wanted[menu_id] = wanted.get(menu_id, 0) + qty
        if wanted[menu_id] > MAX_QTY_PER_ITEM:
            return err(f"Maksimal {MAX_QTY_PER_ITEM} porsi per item.")

    # — validasi field lain
    customer_id = body.get("customer_id")
    address     = str(body.get("delivery_address", "")).strip()
    method      = str(body.get("payment_method",  "")).strip().upper()
    if not isinstance(customer_id, int):
        return err("customer_id wajib diisi.")
    if not address:
        return err("Alamat pengantaran wajib diisi.")
    if method not in PAYMENT_METHODS:
        return err(f"Metode pembayaran harus salah satu dari: {', '.join(PAYMENT_METHODS)}.")

    conn = get_conn()
    try:
        with conn, conn.cursor() as cur:
            ids = sorted(wanted)
            cur.execute(
                """SELECT menu_id, name, price, stock FROM menu_items
                   WHERE menu_id = ANY(%s) AND is_active ORDER BY menu_id FOR UPDATE""",
                (ids,),
            )
            menu_map = {r["menu_id"]: r for r in cur.fetchall()}

            missing = [i for i in ids if i not in menu_map]
            if missing:
                return err("Ada menu yang tidak ditemukan.", 404, menu_ids=missing)

            short = [
                {"menu_id": i, "name": menu_map[i]["name"], "stok_tersedia": menu_map[i]["stock"]}
                for i in ids if menu_map[i]["stock"] < wanted[i]
            ]
            if short:
                return err("Stok tidak mencukupi.", 409, items=short)

            total = sum(menu_map[i]["price"] * wanted[i] for i in ids)

            cur.execute(
                """INSERT INTO orders (customer_id, total_price, delivery_address, status)
                   VALUES (%s, %s, %s, 'MENUNGGU') RETURNING order_id""",
                (customer_id, total, address),
            )
            order_id = cur.fetchone()["order_id"]

            for i in ids:
                cur.execute(
                    """INSERT INTO order_items (order_id, menu_id, name, quantity, unit_price)
                       VALUES (%s, %s, %s, %s, %s)""",
                    (order_id, i, menu_map[i]["name"], wanted[i], menu_map[i]["price"]),
                )
                cur.execute(
                    "UPDATE menu_items SET stock = stock - %s WHERE menu_id = %s", (wanted[i], i)
                )

            cur.execute(
                "INSERT INTO order_status (order_id, status, updated_by) VALUES (%s, 'MENUNGGU', %s)",
                (order_id, customer_id),
            )
            cur.execute(
                "INSERT INTO payments (order_id, method, status) VALUES (%s, %s, 'PENDING')",
                (order_id, method),
            )
            order = fetch_order(cur, order_id)
    except psycopg2.Error as ex:
        app.logger.exception("create_order gagal")
        return err("Gagal memproses pesanan.", 500)

    return ok({"order": order}, message="Pesanan berhasil dibuat."), 201


# ================================================================ UC #2 — Customer: Melihat status pesanan
@app.get("/api/orders")
def list_my_orders():
    """?customer_id=<id>&active=true"""
    customer_id = request.args.get("customer_id", type=int)
    if not customer_id:
        return err("customer_id wajib disertakan.", 400)

    only_active = request.args.get("active", "").lower() in ("1", "true", "yes")
    sql    = """SELECT o.order_id, o.order_date, o.total_price, o.status,
                       (SELECT COALESCE(SUM(quantity), 0) FROM order_items
                         WHERE order_id = o.order_id) AS jumlah_item
                FROM orders o WHERE o.customer_id = %s"""
    params = [customer_id]
    if only_active:
        sql += " AND o.status <> ALL(%s)"
        params.append(list(FINAL_STATUSES))
    sql += " ORDER BY o.order_id DESC"

    with get_conn().cursor() as cur:
        cur.execute(sql, params)
        orders = cur.fetchall()

    message = None
    if not orders:
        message = "Tidak ada pesanan yang sedang diproses." if only_active else "Belum ada riwayat pesanan."
    return ok({"orders": orders}, message=message)


@app.get("/api/orders/<int:order_id>")
def get_my_order(order_id):
    customer_id = request.args.get("customer_id", type=int)
    with get_conn().cursor() as cur:
        order = fetch_order(cur, order_id, customer_id=customer_id)
    if order is None:
        return err("Pesanan tidak ditemukan.", 404)
    return ok({"order": order})


# ================================================================ UC #9 — Pegawai: Menerima pesanan
@app.get("/api/employee/orders")
def list_orders():
    """?status=MENUNGGU (default) | DIPROSES | ALL"""
    status = request.args.get("status", "MENUNGGU").upper()
    if status != "ALL" and status not in STATUSES:
        return err(f"status harus ALL atau salah satu dari: {', '.join(STATUSES)}.")

    sql    = """SELECT o.order_id, o.order_date, o.total_price, o.status,
                       u.nama AS customer_nama,
                       (SELECT COALESCE(SUM(quantity), 0) FROM order_items
                         WHERE order_id = o.order_id) AS jumlah_item
                FROM orders o JOIN users u ON u.user_id = o.customer_id"""
    params = []
    if status != "ALL":
        sql += " WHERE o.status = %s"
        params.append(status)
    sql += " ORDER BY o.order_id " + ("ASC" if status == "MENUNGGU" else "DESC") + " LIMIT 200"

    with get_conn().cursor() as cur:
        cur.execute(sql, params)
        orders = cur.fetchall()

    message = "Belum ada pesanan baru." if (not orders and status == "MENUNGGU") else None
    return ok({"orders": orders}, message=message)


@app.get("/api/employee/orders/<int:order_id>")
def get_order(order_id):
    with get_conn().cursor() as cur:
        order = fetch_order(cur, order_id)
    if order is None:
        return err("Pesanan tidak ditemukan.", 404)
    return ok({"order": order})


@app.post("/api/employee/orders/<int:order_id>/accept")
def accept_order(order_id):
    body, e = json_body()
    if e:
        return e
    employee_id = body.get("employee_id")
    if not isinstance(employee_id, int):
        return err("employee_id wajib diisi.")

    conn = get_conn()
    with conn, conn.cursor() as cur:
        e_status = change_status(cur, order_id, "DITERIMA", employee_id,
                                 invalid_msg="Pesanan sudah diproses atau dibatalkan.")
        if e_status:
            return e_status
        order = fetch_order(cur, order_id)
    return ok({"order": order}, message="Pesanan diterima.")


# ================================================================ UC #10 — Pegawai: Mengubah status pesanan
@app.patch("/api/employee/orders/<int:order_id>/status")
def update_status(order_id):
    body, e = json_body()
    if e:
        return e
    new_status  = str(body.get("status",      "")).strip().upper()
    employee_id = body.get("employee_id")
    if not isinstance(employee_id, int):
        return err("employee_id wajib diisi.")

    conn = get_conn()
    with conn, conn.cursor() as cur:
        e_status = change_status(cur, order_id, new_status, employee_id)
        if e_status:
            return e_status
        order = fetch_order(cur, order_id)
    return ok({"order": order}, message="Status pesanan berhasil diperbarui.")


# ================================================================
if __name__ == "__main__":
    app.run(debug=True, port=5000)
