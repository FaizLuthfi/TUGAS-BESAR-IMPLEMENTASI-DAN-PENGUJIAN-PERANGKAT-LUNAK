// src/pages/customer/OrderStatusPage.jsx
import { useState } from "react";
import { Link } from "react-router-dom";
import {
  ChefHat,
  ClipboardCheck,
  Clock,
  History,
  MapPin,
  PackageCheck,
  RefreshCw,
  Truck,
  Wallet,
  WifiOff,
} from "lucide-react";
import { orderService } from "../../services/orderService";
import { ORDER_STATUS, ORDER_STATUS_FLOW, STORAGE_KEYS } from "../../models/constants";
import { getCurrentStatus } from "../../models/Order";
import { useAsync } from "../../hooks/useAsync";
import { useAuth } from "../../hooks/useAuth";
import { useLiveRefresh } from "../../hooks/useLiveRefresh";
import EmptyState from "../../components/EmptyState";
import StatusBadge from "../../components/StatusBadge";
import { formatDateTime, formatRupiah } from "../../utils/format";

const STEP_ICONS = {
  [ORDER_STATUS.DITERIMA]: ClipboardCheck,
  [ORDER_STATUS.DIPROSES]: ChefHat,
  [ORDER_STATUS.DIKIRIM]: Truck,
  [ORDER_STATUS.SELESAI]: PackageCheck,
};

function Stepper({ current }) {
  const idx = ORDER_STATUS_FLOW.indexOf(current);
  return (
    <ol className="flex items-start">
      {ORDER_STATUS_FLOW.map((s, i) => {
        const Icon = STEP_ICONS[s];
        const done = i <= idx;
        const active = i === idx;
        return (
          <li key={s} className="relative flex flex-1 flex-col items-center text-center">
            {i > 0 && (
              <span
                className={`absolute left-[-50%] top-5 h-1 w-full ${
                  i <= idx ? "bg-amber-600" : "bg-stone-200"
                }`}
              />
            )}
            <span
              className={`relative z-10 flex h-10 w-10 items-center justify-center rounded-full border-2 transition ${
                done
                  ? "border-amber-600 bg-amber-600 text-white"
                  : "border-stone-300 bg-white text-stone-400"
              } ${active ? "ring-4 ring-amber-200" : ""}`}
            >
              <Icon className="h-5 w-5" />
            </span>
            <span
              className={`mt-2 text-xs font-semibold ${done ? "text-stone-900" : "text-stone-400"}`}
            >
              {s}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

export default function OrderStatusPage() {
  const { user } = useAuth();
  const { data, loading, error, reload } = useAsync(
    () => orderService.getActiveByCustomer(user.customerId),
    [user.customerId],
    { refreshOn: [STORAGE_KEYS.orders] }
  );
  useLiveRefresh(reload, 4000);
  const [selectedId, setSelectedId] = useState(null);

  const list = data
    ? [...data].sort((a, b) => b.orderDate.localeCompare(a.orderDate))
    : [];
  const selected = list.find((o) => o.orderId === selectedId) || list[0];
  const current = selected ? getCurrentStatus(selected) : null;

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-amber-50">
      <div className="mx-auto max-w-6xl px-4 py-6">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-extrabold text-stone-900">Status Pesanan</h1>
            <p className="flex items-center gap-1.5 text-sm text-stone-500">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500" />
              </span>
              Diperbarui otomatis setiap ada perubahan dari pegawai.
            </p>
          </div>
          <Link
            to="/riwayat"
            className="flex items-center gap-2 rounded-lg border border-stone-300 bg-white px-4 py-2 text-sm font-semibold text-stone-700 hover:bg-stone-50"
          >
            <History className="h-4 w-4" />
            Riwayat Pesanan
          </Link>
        </div>

        {error && data && (
          <div className="mb-4 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">
            <WifiOff className="h-4 w-4" />
            Koneksi terputus. Menampilkan data terakhir yang berhasil dimuat.
          </div>
        )}

        {loading && !data && (
          <div className="grid gap-4 lg:grid-cols-3">
            <div className="h-48 animate-pulse rounded-2xl bg-stone-200" />
            <div className="h-80 animate-pulse rounded-2xl bg-stone-200 lg:col-span-2" />
          </div>
        )}

        {error && !data && (
          <EmptyState
            icon={WifiOff}
            title="Gagal memuat status pesanan"
            message={error.message}
            action={
              <button
                type="button"
                onClick={() => reload()}
                className="flex items-center gap-2 rounded-lg bg-amber-700 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-800"
              >
                <RefreshCw className="h-4 w-4" />
                Coba Lagi
              </button>
            }
          />
        )}

        {data && list.length === 0 && (
          <EmptyState
            icon={Clock}
            title="Tidak ada pesanan yang sedang diproses"
            message="Pesanan yang kamu buat akan muncul di sini selama masih berjalan."
            action={
              <Link
                to="/menu"
                className="rounded-lg bg-amber-700 px-5 py-2.5 text-sm font-bold text-white hover:bg-amber-800"
              >
                Pesan Sekarang
              </Link>
            }
          />
        )}

        {data && list.length > 0 && selected && (
          <div className="grid gap-5 lg:grid-cols-3">
            <aside className="space-y-3 lg:col-span-1">
              {list.map((o) => {
                const st = getCurrentStatus(o);
                const active = o.orderId === selected.orderId;
                return (
                  <button
                    key={o.orderId}
                    type="button"
                    onClick={() => setSelectedId(o.orderId)}
                    className={`block w-full rounded-2xl border bg-white p-4 text-left shadow-sm transition hover:shadow-md ${
                      active ? "border-amber-600 ring-2 ring-amber-200" : "border-stone-200"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-bold text-stone-900">{o.orderId}</span>
                      <StatusBadge status={st} />
                    </div>
                    <p className="mt-1 text-xs text-stone-500">{formatDateTime(o.orderDate)}</p>
                    <p className="mt-2 truncate text-sm text-stone-600">
                      {o.items.map((it) => `${it.menuName} ×${it.quantity}`).join(", ")}
                    </p>
                    <p className="mt-1 text-sm font-extrabold text-amber-800">
                      {formatRupiah(o.totalPrice)}
                    </p>
                  </button>
                );
              })}
            </aside>

            <section className="space-y-5 rounded-2xl border border-stone-200 bg-white p-5 shadow-sm lg:col-span-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h2 className="text-lg font-extrabold text-stone-900">{selected.orderId}</h2>
                  <p className="text-xs text-stone-500">{formatDateTime(selected.orderDate)}</p>
                </div>
                <StatusBadge status={current} className="text-sm" />
              </div>

              {current === ORDER_STATUS.MENUNGGU ? (
                <div className="flex items-center gap-3 rounded-xl border border-yellow-200 bg-yellow-50 p-4 text-sm text-yellow-800">
                  <Clock className="h-5 w-5 shrink-0" />
                  Pesananmu sudah masuk dan sedang menunggu konfirmasi dari pegawai Warkop99.
                </div>
              ) : (
                <div className="px-2 pt-2">
                  <Stepper current={current} />
                </div>
              )}

              <div>
                <h3 className="mb-2 text-sm font-bold uppercase tracking-wide text-stone-500">
                  Rincian Pesanan
                </h3>
                <ul className="divide-y divide-stone-100 rounded-xl border border-stone-200">
                  {selected.items.map((it) => (
                    <li key={it.itemId} className="flex items-center justify-between px-4 py-2.5 text-sm">
                      <span className="text-stone-800">
                        {it.menuName} <span className="text-stone-400">× {it.quantity}</span>
                      </span>
                      <span className="font-semibold text-stone-900">{formatRupiah(it.subTotal)}</span>
                    </li>
                  ))}
                  <li className="flex items-center justify-between bg-amber-50 px-4 py-3 text-sm font-extrabold">
                    <span>Total</span>
                    <span className="text-amber-800">{formatRupiah(selected.totalPrice)}</span>
                  </li>
                </ul>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="flex items-start gap-3 rounded-xl bg-stone-50 p-3 text-sm">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />
                  <div>
                    <p className="text-xs font-semibold uppercase text-stone-500">Alamat</p>
                    <p className="text-stone-800">{selected.deliveryAddress}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 rounded-xl bg-stone-50 p-3 text-sm">
                  <Wallet className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />
                  <div>
                    <p className="text-xs font-semibold uppercase text-stone-500">Pembayaran</p>
                    <p className="text-stone-800">
                      {selected.payment.method} · {selected.payment.status}
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-stone-500">
                  Riwayat Status
                </h3>
                <ol className="relative space-y-4 border-l-2 border-stone-200 pl-5">
                  {[...selected.statusHistory].reverse().map((h, i) => (
                    <li key={h.statusId} className="relative">
                      <span
                        className={`absolute -left-[1.6rem] top-1 h-3 w-3 rounded-full border-2 border-white ${
                          i === 0 ? "bg-amber-600 ring-2 ring-amber-200" : "bg-stone-300"
                        }`}
                      />
                      <p className="text-sm font-semibold text-stone-900">{h.status}</p>
                      <p className="text-xs text-stone-500">{formatDateTime(h.updatedAt)}</p>
                    </li>
                  ))}
                </ol>
              </div>
            </section>
          </div>
        )}
      </div>
    </div>
  );
}