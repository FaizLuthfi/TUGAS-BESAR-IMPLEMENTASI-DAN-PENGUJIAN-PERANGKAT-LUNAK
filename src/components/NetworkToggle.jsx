// src/components/NetworkToggle.jsx
import { Wifi, WifiOff } from "lucide-react";
import { useNetwork } from "../hooks/useNetwork";

export default function NetworkToggle({ compact = false }) {
  const { offline, toggleOffline } = useNetwork();
  return (
    <button
      type="button"
      onClick={toggleOffline}
      aria-pressed={offline}
      title="Simulasi gangguan koneksi (untuk menguji skenario eksepsional)"
      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
        offline
          ? "border-red-300 bg-red-100 text-red-700 hover:bg-red-200"
          : "border-emerald-300 bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
      }`}
    >
      {offline ? <WifiOff className="h-4 w-4" /> : <Wifi className="h-4 w-4" />}
      {!compact && <span>{offline ? "Offline (simulasi)" : "Online"}</span>}
    </button>
  );
}