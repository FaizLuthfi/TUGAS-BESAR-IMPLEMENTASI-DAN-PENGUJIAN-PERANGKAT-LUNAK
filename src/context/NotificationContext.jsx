// src/context/NotificationContext.jsx
import {
    createContext,
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
  } from "react";
  import { STORAGE_KEYS } from "../models/constant";
  import { NOTIF_TARGET } from "../models/constant";
  import { notificationService } from "../services/notificationService";
  import { useAuth } from "../hooks/useAuth";
  
  export const NotificationContext = createContext(null);
  
  export function NotificationProvider({ children }) {
    const { user, role, isAuthenticated } = useAuth();
    const [notifications, setNotifications] = useState([]);
    const [toasts, setToasts] = useState([]);
    const seenIds = useRef(new Set());
    const initialized = useRef(false);
  
    const target = role === "employee" ? NOTIF_TARGET.EMPLOYEE : NOTIF_TARGET.CUSTOMER;
    const userId = role === "employee" ? null : user?.customerId ?? null;
  
    const refresh = useCallback(() => {
      if (!isAuthenticated) {
        setNotifications([]);
        return [];
      }
      const list = notificationService.getFor({ target, userId });
      setNotifications(list);
      return list;
    }, [isAuthenticated, target, userId]);
  
    const dismissToast = useCallback((notifId) => {
      setToasts((t) => t.filter((x) => x.notifId !== notifId));
    }, []);
  
    useEffect(() => {
      initialized.current = false;
      seenIds.current = new Set();
      const list = refresh();
      list.forEach((n) => seenIds.current.add(n.notifId));
      initialized.current = true;
    }, [refresh]);
  
    useEffect(() => {
      if (!isAuthenticated) return undefined;
      const onChange = (e) => {
        const key = e?.detail?.key;
        if (key && key !== STORAGE_KEYS.notifications && key !== "*") return;
        const list = refresh();
        if (!initialized.current) return;
        const fresh = list.filter((n) => !seenIds.current.has(n.notifId));
        fresh.forEach((n) => {
          seenIds.current.add(n.notifId);
          setToasts((t) => [...t, n]);
          setTimeout(() => dismissToast(n.notifId), 5000);
        });
      };
      const onNativeStorage = (e) => {
        if (e.key === STORAGE_KEYS.notifications) onChange({ detail: { key: e.key } });
      };
      window.addEventListener("wk99:storage", onChange);
      window.addEventListener("storage", onNativeStorage);
      return () => {
        window.removeEventListener("wk99:storage", onChange);
        window.removeEventListener("storage", onNativeStorage);
      };
    }, [isAuthenticated, refresh, dismissToast]);
  
    const unreadCount = useMemo(
      () => notifications.filter((n) => !n.read).length,
      [notifications]
    );
  
    const markAllRead = useCallback(() => {
      notificationService.markAllRead({ target, userId });
    }, [target, userId]);
  
    const markRead = useCallback((notifId) => {
      notificationService.markRead(notifId);
    }, []);
  
    const clearAll = useCallback(() => {
      notificationService.clearFor({ target, userId });
    }, [target, userId]);
  
    const value = useMemo(
      () => ({
        notifications,
        unreadCount,
        toasts,
        dismissToast,
        markAllRead,
        markRead,
        clearAll,
      }),
      [notifications, unreadCount, toasts, dismissToast, markAllRead, markRead, clearAll]
    );
  
    return (
      <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>
    );
  }