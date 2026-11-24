// src/services/resetService.js
import { seedAll, removeKey } from "./storage";
import { STORAGE_KEYS } from "../models/constants";

export const resetService = {
  resetToSeed() {
    removeKey(STORAGE_KEYS.session);
    removeKey(STORAGE_KEYS.cart);
    removeKey(STORAGE_KEYS.network);
    seedAll();
  },
};