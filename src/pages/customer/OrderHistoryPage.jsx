// src/pages/customer/OrderHistoryPage.jsx
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  History,
  Loader2,
  MessageSquare,
  RefreshCw,
  Star,
  WifiOff,
} from "lucide-react";
import { orderService } from "../../services/orderService";
import { feedbackService } from "../../services/feedbackService";
import { ORDER_STATUS, STORAGE_KEYS } from "../../models/constants";
import { getCurrentStatus } from "../../models/Order";
import { useAsync } from "../../hooks/useAsync";
import { useAuth } from "../../hooks/useAuth";
import { useLiveRefresh } from "../../hooks/useLiveRefresh";
import EmptyState from "../../components/EmptyState";
import Modal from "../../components/Modal";
import StatusBadge from "../../components/StatusBadge";
import { formatDateTime, formatRupiah } from "../../utils/format";

const FILTERS = ["Semua", ORDER_STATUS.SELESAI, ORDER_STATUS.DIBATALKAN];
const RATING_LABEL = ["", "Sangat Buruk", "Kurang", "Cukup", "Bagus", "Sangat Bagus"];

function Stars({ value, size = "h-4 w-4" }) {
  return (
    <span className="inline-flex items-center gap-0.5" aria-label={`Rating ${value} dari 5`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          className={`${size} ${n <= value ? "fill-amber-400 text-amber-400" : "text-stone-300"}`}
        />
      ))}
    </span>
  );
}

export default function OrderHistoryPage() {
  const { user } = useAuth();
  const orders = useAsync(
    () => orderService.getHistoryByCustomer(user.customerId),
    [user.customerId],
    { refreshOn: [STORAGE_KEYS.orders] }
  );
  const feedbacks = useAsync(
    () => feedbackService.getByCustomer(user.customerId),
    [user.customerId],
    { refreshOn: [STORAGE_KEYS.feedbacks] }
  );
  useLiveRefresh(orders.reload, 6000);
  useLiveRefresh(feedbacks.reload, 10000);

  const [filter, setFilter] = useState("Semua");
  const [expanded, setExpanded] = useState({});
  const [target, setTarget] = useState(null);
  const [rating, setRating] = useState(5);
  const [hover, setHover] = useState(0);
  const [message, setMessage] = useState("");
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    if (!notice) return undefined;
    const t = setTimeout(() => setNotice(""), 4000);
    return () => clearTimeout(t);
  }, [notice]);

  const feedbackByOrder = {};
  (feedbacks.data || []).forEach((f) => {
    feedbackByOrder[f.orderId] = f;
  });

  const all = orders.data
    ? [...orders.data].sort((a, b) => b.orderDate.localeCompare(a.orderDate))
    : [];
  const list = filter === "Semua" ? all : all.filter((o) => getCurrentStatus(o) === filter);

  const openForm = (order) => {
    setTarget(order);
    setRating(5);
    setHover(0);
    setMessage("");
    setFormError("");
  };

  const closeForm = () => {
    if (submitting) return;
    setTarget(null);
  };

  const submit = async () => {
    setFormError("");
    setSubmitting(true);
    try {
      await feedbackService.create({
        orderId: target.orderId,
        customer: user,
        rating,
        message,
      });
      setTarget(null);
      setNotice("Terima kasih atas ulasannya");
      feedbacks.reload(true);
    } catch (e) {
      setFormError(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  const shown = hover || rating;

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-amber-50">
      <div className="mx-auto max-w-4xl px-4 py-6">
        <div className="mb-5">
          <h1 className="text-2xl font-extrabold text-stone-900">Riwayat Pesanan</h1>
          <p className="text-sm text-stone-500">
            Daftar pesananmu yang sudah selesai. Berikan rating & ulasan untuk membantu kami berkembang.
          </p>
        </div>

        {notice && (
          <div
            className="mb-4 flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm font-semibold text-green-700"
            role="status"
          >
            <CheckCircle2 className="h-4 w-4" />
            {notice}
          </div>
        )}

        {orders.error && orders.data && (
          <div className="mb-4 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">
            <WifiOff className="h-4 w-4" />
            Koneksi terputus. Menampilkan data terakhir yang berhasil dimuat.
          </div>
        )}

        {orders.loading && !orders.data && (
          <div className="space-y-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-28 animate-pulse rounded-2xl bg-stone-200" />
            ))}
          </div>
        )}

        {orders.error && !orders.data && (
          <EmptyState
            icon={WifiOff}
            title="Gagal memuat riwayat pesanan"
            message={orders.error.message}
            action={
              <button
                type="button"
                onClick={() => orders.reload()}
                className="flex items-center gap-2 rounded-lg bg-amber-700 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-800"
              >
                <RefreshCw className="h-4 w-4" />
                Coba Lagi
              </button>
            }
          />
        )}

        {orders.data && all.length === 0 && (
          <EmptyState
            icon={History}
            title="Belum ada riwayat pesanan"
            message="Pesanan yang sudah selesai akan tercatat di sini."
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

        {orders.data && all.length > 0 && (
          <>
            <div className="mb-4 flex flex-wrap gap-2">
              {FILTERS.map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setFilter(f)}
                  className={`rounded-full px-4 py-1.5 text-sm font-semibold transition ${
                    filter === f
                      ? "bg-amber-700 text-white"
                      : "bg-white text-stone-600 ring-1 ring-stone-300 hover:bg-stone-50"
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>

            {list.length === 0 ? (
              <EmptyState
                icon={History}
                title="Tidak ada pesanan"
                message="Tidak ada pesanan dengan status yang dipilih."
              />
            ) : (
              <ul className="space-y-4">
                {list.map((o) => {
                  const st = getCurrentStatus(o);
                  const fb = feedbackByOrder[o.orderId];
                  const isOpen = !!expanded[o.orderId];
                  return (
                    <li
                      key={o.orderId}
                      className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <p className="text-base font-extrabold text-stone-900">{o.orderId}</p>
                          <p className="text-xs text-stone-500">{formatDateTime(o.orderDate)}</p>
                        </div>
                        <StatusBadge status={st} />
                      </div>

                      <p className="mt-2 text-sm text-stone-600">
                        {o.items.map((it) => `${it.menuName} ×${it.quantity}`).join(", ")}
                      </p>

                      <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                        <p className="text-sm text-stone-500">
                          {o.payment.method} · {o.payment.status}
                        </p>
                        <p className="text-base font-extrabold text-amber-800">
                          {formatRupiah(o.totalPrice)}
                        </p>
                      </div>

                      {isOpen && (
                        <div className="mt-3 space-y-3 rounded-xl bg-stone-50 p-3 text-sm">
                          <ul className="divide-y divide-stone-200">
                            {o.items.map((it) => (
                              <li key={it.itemId} className="flex justify-between py-1.5">
                                <span>
                                  {it.menuName} × {it.quantity}
                                </span>
                                <span className="font-semibold">{formatRupiah(it.subTotal)}</span>
                              </li>
                            ))}
                          </ul>
                          <p className="text-stone-600">
                            <b>Alamat:</b> {o.deliveryAddress}
                          </p>
                        </div>
                      )}

                      {fb && (
                        <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3">
                          <div className="flex items-center justify-between gap-2">
                            <Stars value={fb.rating} />
                            <span className="text-xs text-stone-500">{formatDateTime(fb.createdAt)}</span>
                          </div>
                          <p className="mt-1.5 text-sm text-stone-700">{fb.message}</p>
                        </div>
                      )}

                      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                        <button
                          type="button"
                          onClick={() => setExpanded((e) => ({ ...e, [o.orderId]: !e[o.orderId] }))}
                          className="flex items-center gap-1 text-sm font-semibold text-stone-500 hover:text-stone-800"
                        >
                          {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                          {isOpen ? "Sembunyikan detail" : "Lihat detail"}
                        </button>

                        {st === ORDER_STATUS.SELESAI && !fb && (
                          <button
                            type="button"
                            onClick={() => openForm(o)}
                            className="flex items-center gap-2 rounded-lg bg-amber-700 px-4 py-2 text-sm font-bold text-white hover:bg-amber-800"
                          >
                            <MessageSquare className="h-4 w-4" />
                            Beri Rating & Ulasan
                          </button>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </>
        )}
      </div>

      <Modal
        open={!!target}
        onClose={closeForm}
        title="Beri Rating & Ulasan"
        footer={
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={closeForm}
              disabled={submitting}
              className="rounded-lg border border-stone-300 px-4 py-2.5 text-sm font-semibold text-stone-700 hover:bg-stone-100 disabled:opacity-60"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={submit}
              disabled={submitting}
              className="flex items-center gap-2 rounded-lg bg-amber-700 px-5 py-2.5 text-sm font-bold text-white hover:bg-amber-800 disabled:opacity-60"
            >
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              Kirim
            </button>
          </div>
        }
      >
        {target && (
          <div className="space-y-4">
            <div className="rounded-xl bg-stone-50 p-3 text-sm">
              <p className="font-bold text-stone-900">{target.orderId}</p>
              <p className="text-stone-600">
                {target.items.map((it) => `${it.menuName} ×${it.quantity}`).join(", ")}
              </p>
            </div>

            <div className="text-center">
              <div className="flex justify-center gap-1" onMouseLeave={() => setHover(0)}>
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onMouseEnter={() => setHover(n)}
                    onClick={() => setRating(n)}
                    className="rounded p-1 transition hover:scale-110"
                    aria-label={`${n} bintang`}
                  >
                    <Star
                      className={`h-9 w-9 ${
                        n <= shown ? "fill-amber-400 text-amber-400" : "text-stone-300"
                      }`}
                    />
                  </button>
                ))}
              </div>
              <p className="mt-1 text-sm font-semibold text-stone-600">{RATING_LABEL[shown]}</p>
            </div>

            <div>
              <label className="mb-1 block text-sm font-semibold text-stone-700" htmlFor="review">
                Ulasan
              </label>
              <textarea
                id="review"
                rows={4}
                value={message}
                onChange={(e) => {
                  setMessage(e.target.value);
                  if (formError) setFormError("");
                }}
                placeholder="Ceritakan pengalamanmu memesan di Warkop99..."
                className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-amber-600 focus:outline-none focus:ring-2 focus:ring-amber-200"
              />
            </div>

            {formError && (
              <div
                className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
                role="alert"
              >
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}