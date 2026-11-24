// src/hooks/useNotifications.js
import { useContext } from "react";
import { NotificationContext } from "../context/NotificationContext";

export function useNotifications() {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error("useNotifications harus dipakai di dalam NotificationProvider");
  return ctx;
}