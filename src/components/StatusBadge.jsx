import { ORDER_STATUS } from "../models/constant";
// src/components/StatusBadge.jsx
const STYLES = {
  [ORDER_STATUS.MENUNGGU]: "bg-yellow-100 text-yellow-800 ring-yellow-200",
  [ORDER_STATUS.DITERIMA]: "bg-sky-100 text-sky-800 ring-sky-200",
  [ORDER_STATUS.DIPROSES]: "bg-indigo-100 text-indigo-800 ring-indigo-200",
  [ORDER_STATUS.DIKIRIM]: "bg-purple-100 text-purple-800 ring-purple-200",
  [ORDER_STATUS.SELESAI]: "bg-green-100 text-green-800 ring-green-200",
  [ORDER_STATUS.DIBATALKAN]: "bg-red-100 text-red-800 ring-red-200",
};

export default function StatusBadge({ status, className = "" }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${
        STYLES[status] || "bg-stone-100 text-stone-700 ring-stone-200"
      } ${className}`}
    >
      {status}
    </span>
  );
}