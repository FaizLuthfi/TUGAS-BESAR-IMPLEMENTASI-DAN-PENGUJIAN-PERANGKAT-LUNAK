"""
routes.py — logika bisnis: menu, pesanan customer, dan pesanan pegawai.

  UC #0  Lihat daftar menu (publik)
  UC #1  Customer — Memesan makanan
  UC #2  Customer — Melihat status pesanan
  UC #9  Pegawai  — Menerima pesanan
  UC #10 Pegawai  — Mengubah status pesanan
"""

import psycopg2
from flask import Blueprint, request
from app import get_conn, ok, err, json_body

bp = Blueprint("routes", __name__)

# ================================================================ constants
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


# ================================================================ order helpers
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
        # kunci urut menu_id supaya nggak deadlock dengan create_order
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
    return None  # None = tidak ada error


# ================================================================ UC #0 — Lihat daftar menu (publik)
@bp.get("/api/menu")
def list_menu():
    with get_conn().cursor() as cur:
        cur.execute(
            """SELECT menu_id, name, description, price, stock, (stock > 0) AS tersedia
               FROM menu_items WHERE is_active ORDER BY menu_id"""
        )
        items = cur.fetchall()
    from flask import jsonify
    return jsonify(items)


# ================================================================ UC #1 — Customer: Memesan makanan
@bp.post("/api/orders")
def create_order():
    body, e = json_body()
    if e:
        return e

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
    except psycopg2.Error:
        return err("Gagal memproses pesanan.", 500)

    return ok({"order": order}, message="Pesanan berhasil dibuat."), 201


# ================================================================ UC #2 — Customer: Melihat status pesanan
@bp.get("/api/orders")
def list_my_orders():
    """?customer_id=<id>&active=true"""
    customer_id = request.args.get("customer_id", type=int)
    if not customer_id:
        return err("customer_id wajib disertakan.")

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


@bp.get("/api/orders/<int:order_id>")
def get_my_order(order_id):
    customer_id = request.args.get("customer_id", type=int)
    with get_conn().cursor() as cur:
        order = fetch_order(cur, order_id, customer_id=customer_id)
    if order is None:
        return err("Pesanan tidak ditemukan.", 404)
    return ok({"order": order})


# ================================================================ UC #9 — Pegawai: Menerima pesanan
@bp.get("/api/employee/orders")
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


@bp.get("/api/employee/orders/<int:order_id>")
def get_order(order_id):
    with get_conn().cursor() as cur:
        order = fetch_order(cur, order_id)
    if order is None:
        return err("Pesanan tidak ditemukan.", 404)
    return ok({"order": order})


@bp.post("/api/employee/orders/<int:order_id>/accept")
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
@bp.patch("/api/employee/orders/<int:order_id>/status")
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

