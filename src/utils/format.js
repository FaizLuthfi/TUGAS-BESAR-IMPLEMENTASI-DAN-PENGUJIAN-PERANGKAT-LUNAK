// src/utils/format.js
export const formatRupiah = (n) => "Rp" + Number(n || 0).toLocaleString("id-ID");

export const formatDateTime = (iso) =>
  new Date(iso).toLocaleString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });