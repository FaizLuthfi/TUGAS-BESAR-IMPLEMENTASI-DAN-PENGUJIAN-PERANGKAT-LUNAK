// src/services/menuService.js
import { createMenuItem } from "../models/MenuItem";
import { readJSON, writeJSON, genId } from "./storage";
import { mockRequest, ApiError } from "./network";
import { STORAGE_KEYS } from "../models/constant";

export const menuService = {
  getAll() {
    return mockRequest(() => readJSON(STORAGE_KEYS.menus, []));
  },

  getById(menuId) {
    return mockRequest(() => {
      const m = readJSON(STORAGE_KEYS.menus, []).find((x) => x.menuId === menuId);
      if (!m) throw new ApiError("Menu tidak ditemukan", 404);
      return m;
    });
  },

  create({ name, description, price, stock, materialIds, category, emoji }) {
    return mockRequest(() => {
      const empty =
        !name?.trim() ||
        !description?.trim() ||
        price === "" ||
        price === null ||
        price === undefined ||
        stock === "" ||
        stock === null ||
        stock === undefined ||
        !materialIds ||
        materialIds.length === 0;
      if (empty) throw new ApiError("Data belum lengkap", 400);
      if (Number(price) <= 0 || Number.isNaN(Number(price)))
        throw new ApiError("Harga harus berupa angka lebih dari 0", 400);
      if (Number(stock) < 0 || Number.isNaN(Number(stock)))
        throw new ApiError("Stok awal tidak valid", 400);
      const menus = readJSON(STORAGE_KEYS.menus, []);
      if (menus.some((m) => m.name.toLowerCase() === name.trim().toLowerCase()))
        throw new ApiError("Nama menu sudah ada", 409);
      const menu = createMenuItem({
        menuId: genId("MNU"),
        name: name.trim(),
        description: description.trim(),
        price,
        stock,
        materialIds,
        category: category || "Makanan",
        emoji: emoji || (category === "Minuman" ? "🥤" : "🍽️"),
      });
      writeJSON(STORAGE_KEYS.menus, [...menus, menu]);
      return menu;
    });
  },

  updateStock(menuId, newStock) {
    return mockRequest(() => {
      if (newStock === "" || Number.isNaN(Number(newStock)) || Number(newStock) < 0)
        throw new ApiError("Stok tidak valid", 400);
      const menus = readJSON(STORAGE_KEYS.menus, []);
      const idx = menus.findIndex((m) => m.menuId === menuId);
      if (idx < 0) throw new ApiError("Menu tidak ditemukan", 404);
      menus[idx] = { ...menus[idx], stock: Number(newStock) };
      writeJSON(STORAGE_KEYS.menus, menus);
      return menus[idx];
    });
  },

  remove(menuId) {
    return mockRequest(() => {
      const menus = readJSON(STORAGE_KEYS.menus, []);
      writeJSON(
        STORAGE_KEYS.menus,
        menus.filter((m) => m.menuId !== menuId)
      );
      return true;
    });
  },
};