// src/services/materialService.js
import { STORAGE_KEYS } from "../models/constants";
import { createMaterialStock } from "../models/MaterialStock";
import { readJSON, writeJSON, genId } from "./storage";
import { mockRequest, ApiError } from "./network";

export const materialService = {
  getAll() {
    return mockRequest(() => readJSON(STORAGE_KEYS.materials, []));
  },

  setQuantity(id, quantity) {
    return mockRequest(() => {
      if (quantity === "" || quantity === null || quantity === undefined)
        throw new ApiError("Jumlah stok tidak boleh kosong", 400);
      const qty = Number(quantity);
      if (Number.isNaN(qty)) throw new ApiError("Jumlah stok harus berupa angka", 400);
      if (qty < 0) throw new ApiError("Jumlah stok tidak boleh negatif", 400);
      const list = readJSON(STORAGE_KEYS.materials, []);
      const idx = list.findIndex((m) => m.id === id);
      if (idx < 0) throw new ApiError("Bahan baku tidak ditemukan", 404);
      list[idx] = { ...list[idx], quantity: qty, lastUpdated: new Date().toISOString() };
      writeJSON(STORAGE_KEYS.materials, list);
      return list[idx];
    });
  },

  adjustQuantity(id, delta) {
    return mockRequest(() => {
      if (delta === "" || delta === null || delta === undefined)
        throw new ApiError("Jumlah stok tidak boleh kosong", 400);
      const d = Number(delta);
      if (Number.isNaN(d)) throw new ApiError("Jumlah stok harus berupa angka", 400);
      const list = readJSON(STORAGE_KEYS.materials, []);
      const idx = list.findIndex((m) => m.id === id);
      if (idx < 0) throw new ApiError("Bahan baku tidak ditemukan", 404);
      const next = list[idx].quantity + d;
      if (next < 0) throw new ApiError("Jumlah stok tidak boleh negatif", 400);
      list[idx] = { ...list[idx], quantity: next, lastUpdated: new Date().toISOString() };
      writeJSON(STORAGE_KEYS.materials, list);
      return list[idx];
    });
  },

  create({ materialName, quantity, unit }) {
    return mockRequest(() => {
      if (!materialName?.trim() || quantity === "" || quantity === null)
        throw new ApiError("Data belum lengkap", 400);
      if (Number(quantity) < 0 || Number.isNaN(Number(quantity)))
        throw new ApiError("Jumlah stok tidak boleh negatif", 400);
      const list = readJSON(STORAGE_KEYS.materials, []);
      const item = createMaterialStock({
        id: genId("MAT"),
        materialName: materialName.trim(),
        quantity,
        unit: unit?.trim() || "porsi",
      });
      writeJSON(STORAGE_KEYS.materials, [...list, item]);
      return item;
    });
  },
};