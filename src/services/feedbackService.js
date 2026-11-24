// src/services/feedbackService.js
import { STORAGE_KEYS, ORDER_STATUS } from "../models/constants";
import { createFeedback } from "../models/Feedback";
import { readJSON, writeJSON, genId } from "./storage";
import { mockRequest, ApiError } from "./network";

export const feedbackService = {
  create({ orderId, customer, rating, message }) {
    return mockRequest(() => {
      if (!message || !message.trim())
        throw new ApiError("Ulasan tidak boleh kosong", 400);
      const r = Number(rating);
      if (!r || r < 1 || r > 5) throw new ApiError("Rating harus 1 sampai 5", 400);

      const orders = readJSON(STORAGE_KEYS.orders, []);
      const order = orders.find((o) => o.orderId === orderId);
      if (!order) throw new ApiError("Pesanan tidak ditemukan", 404);
      const current = order.statusHistory[order.statusHistory.length - 1]?.status;
      if (current !== ORDER_STATUS.SELESAI)
        throw new ApiError("Ulasan hanya untuk pesanan yang sudah selesai", 409);

      const list = readJSON(STORAGE_KEYS.feedbacks, []);
      if (list.some((f) => f.orderId === orderId))
        throw new ApiError("Pesanan ini sudah diberi ulasan", 409);

      const fb = createFeedback({
        feedbackId: genId("FB"),
        rating: r,
        message: message.trim(),
        orderId,
        customerId: customer.customerId,
        customerName: customer.username,
      });
      writeJSON(STORAGE_KEYS.feedbacks, [fb, ...list]);
      return fb;
    });
  },

  getAll() {
    return mockRequest(() => readJSON(STORAGE_KEYS.feedbacks, []));
  },

  getByCustomer(customerId) {
    return mockRequest(() =>
      readJSON(STORAGE_KEYS.feedbacks, []).filter((f) => f.customerId === customerId)
    );
  },

  getSummary() {
    return mockRequest(() => {
      const list = readJSON(STORAGE_KEYS.feedbacks, []);
      const total = list.length;
      const average = total
        ? Number((list.reduce((s, f) => s + f.rating, 0) / total).toFixed(1))
        : 0;
      const distribution = [5, 4, 3, 2, 1].map((star) => ({
        star,
        count: list.filter((f) => f.rating === star).length,
      }));
      return { total, average, distribution, latest: list.slice(0, 10) };
    });
  },
};