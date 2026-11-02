"""
app.py — Flask setup, DB, shared helpers, dan semua route auth/user.

  UC #3  Login
  UC #4  Register (customer)
  UC #5  Logout
  UC #6  Forgot password
  UC #7  Update password
  UC #8  Update profile image
"""

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
DB_PASS = "postgres"   # ganti sesuai password lokal kamu


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


# ================================================================ shared helpers
def json_body():
    """Parse JSON body; returns (body_dict, None) atau (None, error_response)."""
    body = request.get_json(silent=True)
    if not isinstance(body, dict):
        return None, err("Body request harus berupa JSON object.")
    return body, None


def ok(data=None, message=None, **extra):
    payload = {"status": "success"}
    if message:
        payload["message"] = message
    if data:
        payload.update(data)
    payload.update(extra)
    return jsonify(payload)


def err(message, code=400, **extra):
    return jsonify(status="error", message=message, **extra), code


_PW_RULES = [
    (re.compile(r"[A-Z]"),        "Password harus mengandung minimal 1 huruf besar (A-Z)."),
    (re.compile(r"[a-z]"),        "Password harus mengandung minimal 1 huruf kecil (a-z)."),
    (re.compile(r"[0-9]"),        "Password harus mengandung minimal 1 angka (0-9)."),
    (re.compile(r"[^A-Za-z0-9]"), "Password harus mengandung minimal 1 karakter simbol."),
]


def validate_password(pw):
    """Returns (True, None) kalau kuat, (False, error_response) kalau tidak."""
    if len(pw) < 8:
        return False, err("Password minimal 8 karakter.")
    for pattern, msg in _PW_RULES:
        if not pattern.search(pw):
            return False, err(msg)
    return True, None


# ================================================================ UC #3 — Login
@app.post("/api/auth/login")
def login():
    body, e = json_body()
    if e:
        return e
    username = str(body.get("username", "")).strip()
    password = str(body.get("password", ""))

    with get_conn().cursor() as cur:
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

    with get_conn().cursor() as cur:
        cur.execute(
            "SELECT user_id FROM users WHERE username = %s AND LOWER(nama) = LOWER(%s)",
            (username, nama_lengkap),
        )
        user = cur.fetchone()

    if not user:
        return err("Kombinasi username dan nama lengkap tidak ditemukan.", 404)

    if new_password:
        ok_pw, e_pw = validate_password(new_password)
        if not ok_pw:
            return e_pw
        conn = get_conn()
        with conn, conn.cursor() as cur:
            cur.execute(
                "UPDATE users SET password_hash = %s WHERE user_id = %s",
                (generate_password_hash(new_password), user["user_id"]),
            )
        return ok(message="Password berhasil direset.")

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

    ok_pw, e_pw = validate_password(new_password)
    if not ok_pw:
        return e_pw

    with get_conn().cursor() as cur:
        cur.execute("SELECT password_hash FROM users WHERE user_id = %s", (user_id,))
        user = cur.fetchone()

    if not user or not check_password_hash(user["password_hash"], old_password):
        return err("Password lama yang dimasukkan salah.", 401)

    conn = get_conn()
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
        cur.execute(
            "SELECT user_id, nama, role, email, phone, profile_url FROM users WHERE user_id = %s",
            (user_id,),
        )
        user = cur.fetchone()
    if not user:
        return err("User tidak ditemukan.", 404)
    return ok({"user": user})


# ================================================================ register business routes
# Import di bawah supaya routes.py bisa import dari app.py tanpa circular import
from routes import bp  # noqa: E402
app.register_blueprint(bp)

if __name__ == "__main__":
    app.run(debug=True, port=5000)
