// src/pages/LoginPage.jsx
import { useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import {
  AlertCircle,
  Briefcase,
  CheckCircle2,
  Coffee,
  Eye,
  EyeOff,
  Loader2,
  LogIn,
  RotateCcw,
  User,
  UserPlus,
} from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import { homePath } from "../utils/routes";
import { ROLES } from "../models/constant";

const EMPTY = { username: "", password: "", email: "", phone: "" };

export default function LoginPage() {
  const {
    isAuthenticated,
    role: currentRole,
    login,
    register,
    quickLogin,
    resetData,
    loading,
    error,
    clearError,
  } = useAuth();
  const location = useLocation();
  const [mode, setMode] = useState("login");
  const [role, setRole] = useState(ROLES.CUSTOMER);
  const [form, setForm] = useState(EMPTY);
  const [showPwd, setShowPwd] = useState(false);
  const [info, setInfo] = useState("");

  if (isAuthenticated) {
    const from = location.state?.from;
    const allowed =
      from &&
      ((currentRole === ROLES.EMPLOYEE && from.startsWith("/pegawai")) ||
        (currentRole === ROLES.CUSTOMER && !from.startsWith("/pegawai") && from !== "/login"));
    return <Navigate to={allowed ? from : homePath(currentRole)} replace />;
  }

  const setField = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const switchMode = (m) => {
    setMode(m);
    setInfo("");
    clearError();
  };

  const submit = async (e) => {
    e.preventDefault();
    setInfo("");
    clearError();
    if (mode === "login") {
      await login({ username: form.username, password: form.password, role });
    } else {
      await register(form);
    }
  };

  const handleQuick = async (r) => {
    setInfo("");
    clearError();
    await quickLogin(r);
  };

  const handleReset = () => {
    if (!window.confirm("Kembalikan semua data ke kondisi awal (seed)? Semua perubahan akan hilang.")) return;
    clearError();
    resetData();
    setForm(EMPTY);
    setInfo("Data awal berhasil dikembalikan.");
  };

  const input =
    "w-full rounded-lg border border-stone-300 bg-white px-3 py-2.5 text-sm text-stone-900 placeholder-stone-400 focus:border-amber-600 focus:outline-none focus:ring-2 focus:ring-amber-200";

  return (
    <div className="flex min-h-screen flex-col bg-amber-50 lg:flex-row">
      <section className="flex flex-col justify-between bg-gradient-to-br from-stone-900 via-stone-800 to-amber-900 px-6 py-10 text-amber-50 lg:w-1/2 lg:px-14 lg:py-16">
        <div className="flex items-center gap-2">
          <Coffee className="h-8 w-8 text-amber-400" />
          <span className="text-2xl font-extrabold tracking-tight">
            Warkop<span className="text-amber-400">99</span>
          </span>
        </div>
        <div className="my-10 lg:my-0">
          <h1 className="text-3xl font-extrabold leading-tight sm:text-4xl">
            Pesan kopi & makanan favoritmu, tanpa ribet lewat WhatsApp.
          </h1>
          <p className="mt-4 max-w-md text-sm text-amber-100/80">
            Lihat ketersediaan menu secara langsung, pesan online, bayar dengan QRIS atau tunai,
            dan pantau status pesananmu sampai tiba.
          </p>
          <ul className="mt-6 space-y-2 text-sm text-amber-100/90">
            <li className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-amber-400" /> Stok menu real-time
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-amber-400" /> Notifikasi status pesanan otomatis
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-amber-400" /> Rating & ulasan setelah pesanan selesai
            </li>
          </ul>
        </div>
        <p className="text-xs text-amber-100/50">Simulasi frontend · data tersimpan di localStorage</p>
      </section>

      <section className="flex flex-1 items-center justify-center px-4 py-10">
        <div className="w-full max-w-md rounded-2xl border border-stone-200 bg-white p-6 shadow-xl sm:p-8">
          <div className="mb-6 grid grid-cols-2 rounded-xl bg-stone-100 p-1 text-sm font-semibold">
            {[
              ["login", "Masuk", LogIn],
              ["register", "Daftar", UserPlus],
            ].map(([m, label, Icon]) => (
              <button
                key={m}
                type="button"
                onClick={() => switchMode(m)}
                className={`flex items-center justify-center gap-2 rounded-lg py-2 transition ${
                  mode === m ? "bg-white text-amber-800 shadow" : "text-stone-500 hover:text-stone-700"
                }`}
              >
                <Icon className="h-4 w-4" />
                {label}
              </button>
            ))}
          </div>

          <form onSubmit={submit} className="space-y-4" noValidate>
            {mode === "login" && (
              <div>
                <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-stone-500">
                  Masuk sebagai
                </span>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    [ROLES.CUSTOMER, "Customer", User],
                    [ROLES.EMPLOYEE, "Pegawai", Briefcase],
                  ].map(([r, label, Icon]) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setRole(r)}
                      className={`flex items-center justify-center gap-2 rounded-lg border px-3 py-2.5 text-sm font-semibold transition ${
                        role === r
                          ? r === ROLES.EMPLOYEE
                            ? "border-emerald-600 bg-emerald-50 text-emerald-800"
                            : "border-amber-600 bg-amber-50 text-amber-800"
                          : "border-stone-300 text-stone-600 hover:bg-stone-50"
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div>
              <label className="mb-1 block text-sm font-medium text-stone-700" htmlFor="username">
                Username
              </label>
              <input
                id="username"
                className={input}
                value={form.username}
                onChange={setField("username")}
                placeholder="Masukkan username"
                autoComplete="username"
              />
            </div>

            {mode === "register" && (
              <>
                <div>
                  <label className="mb-1 block text-sm font-medium text-stone-700" htmlFor="email">
                    Email
                  </label>
                  <input
                    id="email"
                    type="email"
                    className={input}
                    value={form.email}
                    onChange={setField("email")}
                    placeholder="nama@email.com"
                    autoComplete="email"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-stone-700" htmlFor="phone">
                    No. Telepon
                  </label>
                  <input
                    id="phone"
                    type="tel"
                    className={input}
                    value={form.phone}
                    onChange={setField("phone")}
                    placeholder="08xxxxxxxxxx"
                    autoComplete="tel"
                  />
                </div>
              </>
            )}

            <div>
              <label className="mb-1 block text-sm font-medium text-stone-700" htmlFor="password">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPwd ? "text" : "password"}
                  className={`${input} pr-10`}
                  value={form.password}
                  onChange={setField("password")}
                  placeholder={mode === "register" ? "Minimal 6 karakter" : "Masukkan password"}
                  autoComplete={mode === "login" ? "current-password" : "new-password"}
                />
                <button
                  type="button"
                  onClick={() => setShowPwd((v) => !v)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-stone-400 hover:text-stone-600"
                  aria-label={showPwd ? "Sembunyikan password" : "Tampilkan password"}
                >
                  {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}
            {info && (
              <div className="flex items-start gap-2 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{info}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-amber-700 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-amber-800 disabled:opacity-60"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : mode === "login" ? (
                <LogIn className="h-4 w-4" />
              ) : (
                <UserPlus className="h-4 w-4" />
              )}
              {mode === "login" ? "Masuk" : "Daftar & Masuk"}
            </button>
          </form>

          {mode === "login" && (
            <p className="mt-3 rounded-lg bg-stone-50 px-3 py-2 text-xs text-stone-500">
              Akun demo — Customer: <b>customer</b> / <b>customer123</b> · Pegawai: <b>pegawai</b> /{" "}
              <b>pegawai123</b>
            </p>
          )}

          <div className="my-6 flex items-center gap-3 text-xs text-stone-400">
            <span className="h-px flex-1 bg-stone-200" />
            MASUK CEPAT (DEMO)
            <span className="h-px flex-1 bg-stone-200" />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              disabled={loading}
              onClick={() => handleQuick(ROLES.CUSTOMER)}
              className="flex items-center justify-center gap-2 rounded-lg border border-amber-600 px-3 py-2.5 text-sm font-semibold text-amber-800 hover:bg-amber-50 disabled:opacity-60"
            >
              <User className="h-4 w-4" />
              Demo Customer
            </button>
            <button
              type="button"
              disabled={loading}
              onClick={() => handleQuick(ROLES.EMPLOYEE)}
              className="flex items-center justify-center gap-2 rounded-lg border border-emerald-600 px-3 py-2.5 text-sm font-semibold text-emerald-800 hover:bg-emerald-50 disabled:opacity-60"
            >
              <Briefcase className="h-4 w-4" />
              Demo Pegawai
            </button>
          </div>

          <button
            type="button"
            onClick={handleReset}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold text-stone-500 hover:bg-stone-100"
          >
            <RotateCcw className="h-4 w-4" />
            Reset Data Awal (Seed)
          </button>
        </div>
      </section>
    </div>
  );
}