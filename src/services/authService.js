// src/services/authService.js
import { STORAGE_KEYS, ROLES } from "../models/constants";
import { createCustomer } from "../models/RegisteredCustomer";
import { readJSON, writeJSON, removeKey, genId } from "./storage";
import { mockRequest, ApiError } from "./network";

export const authService = {
  login({ username, password, role }) {
    return mockRequest(() => {
      if (!username?.trim() || !password?.trim())
        throw new ApiError("Username dan password wajib diisi", 400);
      const list =
        role === ROLES.EMPLOYEE
          ? readJSON(STORAGE_KEYS.employees, [])
          : readJSON(STORAGE_KEYS.customers, []);
      const user = list.find(
        (u) => u.username === username.trim() && u.password === password
      );
      if (!user) throw new ApiError("Username atau password salah", 401);
      const { password: _pw, ...safe } = user;
      const session = { role, user: safe };
      writeJSON(STORAGE_KEYS.session, session);
      return session;
    }, { skipNetworkCheck: true });
  },

  quickLogin(role) {
    return mockRequest(() => {
      const list =
        role === ROLES.EMPLOYEE
          ? readJSON(STORAGE_KEYS.employees, [])
          : readJSON(STORAGE_KEYS.customers, []);
      const user = list[0];
      if (!user) throw new ApiError("Data pengguna tidak ditemukan", 404);
      const { password: _pw, ...safe } = user;
      const session = { role, user: safe };
      writeJSON(STORAGE_KEYS.session, session);
      return session;
    }, { skipNetworkCheck: true });
  },

  register({ username, email, phone, password }) {
    return mockRequest(() => {
      if (![username, email, phone, password].every((v) => v?.trim()))
        throw new ApiError("Data belum lengkap", 400);
      if (password.length < 6)
        throw new ApiError("Password minimal 6 karakter", 400);
      const customers = readJSON(STORAGE_KEYS.customers, []);
      if (customers.some((c) => c.username === username.trim()))
        throw new ApiError("Username sudah digunakan", 409);
      const customer = createCustomer({
        customerId: genId("CUS"),
        username: username.trim(),
        email: email.trim(),
        phone: phone.trim(),
        password,
      });
      writeJSON(STORAGE_KEYS.customers, [...customers, customer]);
      const { password: _pw, ...safe } = customer;
      const session = { role: ROLES.CUSTOMER, user: safe };
      writeJSON(STORAGE_KEYS.session, session);
      return session;
    }, { skipNetworkCheck: true });
  },

  logout() {
    return mockRequest(() => {
      removeKey(STORAGE_KEYS.session);
      return true;
    }, { skipNetworkCheck: true });
  },

  getSession() {
    return readJSON(STORAGE_KEYS.session, null);
  },

  switchRole(role) {
    return this.quickLogin(role);
  },
};