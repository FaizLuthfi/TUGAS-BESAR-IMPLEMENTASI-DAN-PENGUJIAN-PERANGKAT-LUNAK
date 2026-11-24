// src/hooks/useCart.js
import { useContext } from "react";
import { CartContext } from "../context/CartContext";

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart harus dipakai di dalam CartProvider");
  return ctx;
}