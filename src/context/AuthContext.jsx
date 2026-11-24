// src/context/AuthContext.jsx
import { createContext, useCallback, useEffect, useMemo, useState } from "react";
import { authService } from "../services/authService";
import { resetService } from "../services/resetService";
import { ensureSeeded } from "../services/storage";
import { ROLES } from "../models/constants";

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  ensureSeeded();
  const [session, setSession] = useState(() => authService.getSession());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const sync = () => setSession(authService.getSession());
    window.addEventListener("wk99:storage", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("wk99:storage", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const run = useCallback(async (fn) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fn();
      setSession(res.data);
      return { ok: true, data: res.data };
    } catch (e) {
      setError(e.message);
      return { ok: false, message: e.message };
    } finally {
      setLoading(false);
    }
  }, []);

  const login = useCallback(
    (credentials) => run(() => authService.login(credentials)),
    [run]
  );
  const quickLogin = useCallback((role) => run(() => authService.quickLogin(role)), [run]);
  const register = useCallback((payload) => run(() => authService.register(payload)), [run]);
  const switchRole = useCallback((role) => run(() => authService.switchRole(role)), [run]);

  const logout = useCallback(async () => {
    await authService.logout();
    setSession(null);
  }, []);

  const resetData = useCallback(() => {
    resetService.resetToSeed();
    setSession(null);
  }, []);

  const clearError = useCallback(() => setError(null), []);

  const value = useMemo(
    () => ({
      session,
      user: session?.user ?? null,
      role: session?.role ?? null,
      isAuthenticated: !!session,
      isCustomer: session?.role === ROLES.CUSTOMER,
      isEmployee: session?.role === ROLES.EMPLOYEE,
      loading,
      error,
      login,
      quickLogin,
      register,
      switchRole,
      logout,
      resetData,
      clearError,
    }),
    [session, loading, error, login, quickLogin, register, switchRole, logout, resetData, clearError]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}