// src/services/network.js
import { STORAGE_KEYS } from "../models/constants";
import { readJSON, writeJSON } from "./storage";

export const isNetworkFailing = () => readJSON(STORAGE_KEYS.network, false) === true;

export const setNetworkFailing = (value) => writeJSON(STORAGE_KEYS.network, !!value);

export class ApiError extends Error {
  constructor(message, status = 500, code = "ERROR") {
    super(message);
    this.status = status;
    this.code = code;
  }
}

const randomDelay = () => 250 + Math.floor(Math.random() * 350);

export const mockRequest = (handler, { skipNetworkCheck = false } = {}) =>
  new Promise((resolve, reject) => {
    setTimeout(() => {
      if (!skipNetworkCheck && isNetworkFailing()) {
        reject(new ApiError("Koneksi terputus", 503, "NETWORK_ERROR"));
        return;
      }
      try {
        const data = handler();
        resolve({ status: 200, ok: true, data: JSON.parse(JSON.stringify(data ?? null)) });
      } catch (e) {
        if (e instanceof ApiError) reject(e);
        else reject(new ApiError(e.message || "Terjadi kesalahan", 500));
      }
    }, randomDelay());
  });