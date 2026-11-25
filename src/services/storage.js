// src/services/storage.js
import { STORAGE_KEYS } from "../models/constant";
import {
  seedEmployees,
  seedCustomers,
  seedMenus,
  seedMaterials,
  seedOrders,
  seedFeedbacks,
  seedNotifications,
} from "../models/seed";

export const readJSON = (key, fallback = null) => {
  try {
    const raw = localStorage.getItem(key);
    return raw === null ? fallback : JSON.parse(raw);
  } catch {
    return fallback;
  }
};

export const writeJSON = (key, value) => {
  localStorage.setItem(key, JSON.stringify(value));
  window.dispatchEvent(new CustomEvent("wk99:storage", { detail: { key } }));
};

export const removeKey = (key) => {
  localStorage.removeItem(key);
  window.dispatchEvent(new CustomEvent("wk99:storage", { detail: { key } }));
};

export const seedAll = () => {
  localStorage.setItem(STORAGE_KEYS.employees, JSON.stringify(seedEmployees));
  localStorage.setItem(STORAGE_KEYS.customers, JSON.stringify(seedCustomers));
  localStorage.setItem(STORAGE_KEYS.menus, JSON.stringify(seedMenus));
  localStorage.setItem(STORAGE_KEYS.materials, JSON.stringify(seedMaterials));
  localStorage.setItem(STORAGE_KEYS.orders, JSON.stringify(seedOrders));
  localStorage.setItem(STORAGE_KEYS.feedbacks, JSON.stringify(seedFeedbacks));
  localStorage.setItem(STORAGE_KEYS.notifications, JSON.stringify(seedNotifications));
  localStorage.setItem(STORAGE_KEYS.seeded, "1");
  window.dispatchEvent(new CustomEvent("wk99:storage", { detail: { key: "*" } }));
};

export const ensureSeeded = () => {
  if (!localStorage.getItem(STORAGE_KEYS.seeded)) seedAll();
};

export const genId = (prefix) =>
  `${prefix}-${Date.now().toString(36).toUpperCase()}${Math.random()
    .toString(36)
    .slice(2, 5)
    .toUpperCase()}`;