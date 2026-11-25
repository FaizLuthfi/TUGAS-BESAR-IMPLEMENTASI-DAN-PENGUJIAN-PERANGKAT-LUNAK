// src/components/Navbar.jsx
import { useEffect, useRef, useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import {
  Bell,
  Boxes,
  CheckCheck,
  ClipboardList,
  Coffee,
  History,
  Inbox,
  LayoutDashboard,
  ListOrdered,
  LogOut,
  Menu as MenuIcon,
  PackagePlus,
  Repeat,
  ShoppingCart,
  Trash2,
  UtensilsCrossed,
  X,
} from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import { useCart } from "../hooks/useCart";
import { useNotifications } from "../hooks/useNotifications";
import { homePath } from "../utils/routes";
import { formatDateTime } from "../utils/format";
import NetworkToggle from "./NetworkToggle";
import { ROLES } from "../models/constant";

const CUSTOMER_LINKS = [
  { to: "/menu", label: "Menu", icon: UtensilsCrossed },
  { to: "/status", label: "Status Pesanan", icon: ListOrdered },
  { to: "/riwayat", label: "Riwayat", icon: History },
];

const EMPLOYEE_LINKS = [
  { to: "/pegawai", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/pegawai/pesanan-masuk", label: "Pesanan Masuk", icon: Inbox },
  { to: "/pegawai/pesanan", label: "Daftar Pesanan", icon: ClipboardList },
  { to: "/pegawai/stok", label: "Stok Bahan", icon: Boxes },
  { to: "/pegawai/menu-baru", label: "Tambah Menu", icon: PackagePlus },
];

export default function Navbar() {
  const { user, isCustomer, isEmployee, logout, switchRole } = useAuth();
  const { totalItems } = useCart();
  const { notifications, unreadCount, markAllRead, markRead, clearAll } = useNotifications();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [bellOpen, setBellOpen] = useState(false);
  const bellRef = useRef(null);

  useEffect(() => {
    const onDown = (e) => {
      if (bellRef.current && !bellRef.current.contains(e.target)) setBellOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  const links = isEmployee ? EMPLOYEE_LINKS : CUSTOMER_LINKS;

  const theme = isEmployee
    ? {
        bar: "bg-slate-900 text-slate-100",
        brand: "text-emerald-400",
        active: "bg-emerald-600 text-white",
        idle: "text-slate-300 hover:bg-slate-800 hover:text-white",
        chip: "bg-emerald-500/20 text-emerald-300",
        btn: "text-slate-200 hover:bg-slate-800",
        mobile: "border-slate-700 bg-slate-900",
      }
    : {
        bar: "bg-stone-900 text-amber-50",
        brand: "text-amber-400",
        active: "bg-amber-600 text-white",
        idle: "text-stone-300 hover:bg-stone-800 hover:text-white",
        chip: "bg-amber-500/20 text-amber-300",
        btn: "text-stone-200 hover:bg-stone-800",
        mobile: "border-stone-700 bg-stone-900",
      };

  const handleLogout = async () => {
    await logout();
    navigate("/login", { replace: true });
  };

  const handleSwitch = async () => {
    const target = isCustomer ? ROLES.EMPLOYEE : ROLES.CUSTOMER;
    const res = await switchRole(target);
    if (res.ok) {
      setMobileOpen(false);
      navigate(homePath(target));
    }
  };

  const openNotif = (n) => {
    markRead(n.notifId);
    setBellOpen(false);
    navigate(isEmployee ? "/pegawai/pesanan-masuk" : "/status");
  };

  const linkClass = ({ isActive }) =>
    `flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition ${
      isActive ? theme.active : theme.idle
    }`;

  return (
    <header className={`sticky top-0 z-40 shadow-md ${theme.bar}`}>
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-4">
        <Link to={homePath(user ? (isEmployee ? ROLES.EMPLOYEE : ROLES.CUSTOMER) : null)} className="flex items-center gap-2">
          <Coffee className={`h-6 w-6 ${theme.brand}`} />
          <span className="text-lg font-extrabold tracking-tight">
            Warkop<span className={theme.brand}>99</span>
          </span>
          <span className={`hidden rounded-full px-2 py-0.5 text-[10px] font-bold uppercase sm:inline ${theme.chip}`}>
            {isEmployee ? "Pegawai" : "Customer"}
          </span>
        </Link>

        <nav className="ml-4 hidden items-center gap-1 lg:flex">
          {links.map(({ to, label, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end} className={linkClass}>
              <Icon className="h-4 w-4" />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <div className="hidden md:block">
            <NetworkToggle />
          </div>

          {isCustomer && (
            <button
              type="button"
              onClick={() => navigate("/menu", { state: { openCart: true } })}
              className={`relative rounded-full p-2 ${theme.btn}`}
              aria-label="Keranjang"
            >
              <ShoppingCart className="h-5 w-5" />
              {totalItems > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-red-500 px-1 text-[11px] font-bold text-white">
                  {totalItems}
                </span>
              )}
            </button>
          )}

          <div className="relative" ref={bellRef}>
            <button
              type="button"
              onClick={() => setBellOpen((v) => !v)}
              className={`relative rounded-full p-2 ${theme.btn}`}
              aria-label="Notifikasi"
            >
              <Bell className="h-5 w-5" />
              {unreadCount > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-red-500 px-1 text-[11px] font-bold text-white">
                  {unreadCount}
                </span>
              )}
            </button>
            {bellOpen && (
              <div className="absolute right-0 mt-2 w-80 max-w-[calc(100vw-2rem)] overflow-hidden rounded-xl border border-stone-200 bg-white text-stone-800 shadow-xl">
                <div className="flex items-center justify-between border-b border-stone-200 px-4 py-3">
                  <span className="text-sm font-bold">Notifikasi</span>
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={markAllRead}
                      className="rounded p-1 text-stone-500 hover:bg-stone-100"
                      title="Tandai semua dibaca"
                    >
                      <CheckCheck className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={clearAll}
                      className="rounded p-1 text-stone-500 hover:bg-stone-100"
                      title="Hapus semua"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                <ul className="max-h-80 divide-y divide-stone-100 overflow-y-auto">
                  {notifications.length === 0 && (
                    <li className="px-4 py-8 text-center text-sm text-stone-500">
                      Belum ada notifikasi
                    </li>
                  )}
                  {notifications.map((n) => (
                    <li key={n.notifId}>
                      <button
                        type="button"
                        onClick={() => openNotif(n)}
                        className={`block w-full px-4 py-3 text-left hover:bg-stone-50 ${
                          n.read ? "" : "bg-amber-50"
                        }`}
                      >
                        <p className="text-sm font-semibold">{n.title}</p>
                        <p className="text-sm text-stone-600">{n.message}</p>
                        <p className="mt-1 text-xs text-stone-400">{formatDateTime(n.createdAt)}</p>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <div className="hidden items-center gap-1 lg:flex">
            <button
              type="button"
              onClick={handleSwitch}
              className={`flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-xs font-semibold ${theme.btn}`}
              title="Demo: ganti peran tanpa login ulang"
            >
              <Repeat className="h-4 w-4" />
              {isCustomer ? "Ganti ke Pegawai" : "Ganti ke Customer"}
            </button>
            <span className="max-w-[8rem] truncate px-2 text-sm font-semibold">
              {user?.name || user?.username}
            </span>
            <button
              type="button"
              onClick={handleLogout}
              className={`rounded-full p-2 ${theme.btn}`}
              aria-label="Keluar"
              title="Keluar"
            >
              <LogOut className="h-5 w-5" />
            </button>
          </div>

          <button
            type="button"
            onClick={() => setMobileOpen((v) => !v)}
            className={`rounded-full p-2 lg:hidden ${theme.btn}`}
            aria-label="Menu navigasi"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <MenuIcon className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className={`border-t px-4 pb-4 pt-2 lg:hidden ${theme.mobile}`}>
          <nav className="flex flex-col gap-1">
            {links.map(({ to, label, icon: Icon, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                className={linkClass}
                onClick={() => setMobileOpen(false)}
              >
                <Icon className="h-4 w-4" />
                {label}
              </NavLink>
            ))}
          </nav>
          <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-white/10 pt-3">
            <NetworkToggle />
            <button
              type="button"
              onClick={handleSwitch}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold ${theme.btn}`}
            >
              <Repeat className="h-4 w-4" />
              {isCustomer ? "Ganti ke Pegawai" : "Ganti ke Customer"}
            </button>
            <button
              type="button"
              onClick={handleLogout}
              className={`ml-auto flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold ${theme.btn}`}
            >
              <LogOut className="h-4 w-4" />
              Keluar ({user?.name || user?.username})
            </button>
          </div>
        </div>
      )}
    </header>
  );
}