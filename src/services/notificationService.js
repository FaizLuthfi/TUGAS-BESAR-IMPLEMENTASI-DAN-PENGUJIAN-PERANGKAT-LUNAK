// src/services/notificationService.js
import { STORAGE_KEYS } from "../models/constant";
import { readJSON, writeJSON, genId } from "./storage";

export const notificationService = {
  push({ target, userId = null, title, message, orderId = null }) {
    const list = readJSON(STORAGE_KEYS.notifications, []);
    const notif = {
      notifId: genId("NTF"),
      target,
      userId,
      title,
      message,
      orderId,
      read: false,
      createdAt: new Date().toISOString(),
    };
    writeJSON(STORAGE_KEYS.notifications, [notif, ...list].slice(0, 100));
    return notif;
  },

  getFor({ target, userId = null }) {
    return readJSON(STORAGE_KEYS.notifications, []).filter(
      (n) => n.target === target && (n.userId === null || n.userId === userId)
    );
  },

  markAllRead({ target, userId = null }) {
    const list = readJSON(STORAGE_KEYS.notifications, []).map((n) =>
      n.target === target && (n.userId === null || n.userId === userId)
        ? { ...n, read: true }
        : n
    );
    writeJSON(STORAGE_KEYS.notifications, list);
  },

  markRead(notifId) {
    const list = readJSON(STORAGE_KEYS.notifications, []).map((n) =>
      n.notifId === notifId ? { ...n, read: true } : n
    );
    writeJSON(STORAGE_KEYS.notifications, list);
  },

  clearFor({ target, userId = null }) {
    const list = readJSON(STORAGE_KEYS.notifications, []).filter(
      (n) => !(n.target === target && (n.userId === null || n.userId === userId))
    );
    writeJSON(STORAGE_KEYS.notifications, list);
  },
};