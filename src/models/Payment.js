// src/models/Payment.js
import { PAYMENT_METHOD } from "./constant";
import { PAYMENT_STATUS } from "./constant";

export function createPayment({
  paymentId,
  method,
  status,
  paymentDate = new Date().toISOString(),
}) {
  const finalStatus =
    status ||
    (method === PAYMENT_METHOD.QRIS
      ? PAYMENT_STATUS.LUNAS
      : PAYMENT_STATUS.BELUM_BAYAR);
  return { paymentId, paymentDate, status: finalStatus, method };
}