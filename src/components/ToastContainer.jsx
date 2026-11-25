// src/components/ToastContainer.jsx
import { BellRing, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useNotifications } from "../hooks/useNotifications";
import { useAuth } from "../hooks/useAuth";

export default function ToastContainer() {
  const { toasts, dismissToast, markRead } = useNotifications();
  const { isEmployee } = useAuth();
  const navigate = useNavigate();

  if (toasts.length === 0) return null;

  const open = (n) => {
    markRead(n.notifId);
    dismissToast(n.notifId);
    navigate(isEmployee ? "/pegawai/pesanan-masuk" : "/status");
  };

  return (
    <div
      className="pointer-events-none fixed right-4 top-20 z-[60] flex w-[calc(100%-2rem)] max-w-sm flex-col gap-2"
      aria-live="polite"
    >
      {toasts.map((n) => (
        <div
          key={n.notifId}
          className="pointer-events-auto flex items-start gap-3 rounded-xl border border-amber-200 bg-white p-4 shadow-lg"
        >
          <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-700">
            <BellRing className="h-5 w-5" />
          </span>
          <button type="button" onClick={() => open(n)} className="min-w-0 flex-1 text-left">
            <p className="text-sm font-semibold text-stone-900">{n.title}</p>
            <p className="mt-0.5 text-sm text-stone-600">{n.message}</p>
          </button>
          <button
            type="button"
            onClick={() => dismissToast(n.notifId)}
            className="rounded-full p-1 text-stone-400 hover:bg-stone-100"
            aria-label="Tutup notifikasi"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  );
}