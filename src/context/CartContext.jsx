// src/context/CartContext.jsx
import { createContext, useCallback, useEffect, useMemo, useState } from "react";
import { STORAGE_KEYS } from "../models/constant";
import { PAYMENT_METHOD } from "../models/constant";
import { calculateSubTotal } from "../models/OrderItem";
import { readJSON, writeJSON } from "../services/storage";
import { orderService } from "../services/orderService";
import { useAuth } from "../hooks/useAuth";

export const CartContext = createContext(null);

const loadCart = (customerId) => {
  const all = readJSON(STORAGE_KEYS.cart, {});
  return customerId ? all[customerId] || [] : [];
};

const saveCart = (customerId, items) => {
  if (!customerId) return;
  const all = readJSON(STORAGE_KEYS.cart, {});
  writeJSON(STORAGE_KEYS.cart, { ...all, [customerId]: items });
};

export function CartProvider({ children }) {
  const { user, isCustomer } = useAuth();
  const customerId = isCustomer ? user?.customerId : null;
  const [items, setItems] = useState(() => loadCart(customerId));
  const [placing, setPlacing] = useState(false);

  useEffect(() => {
    setItems(loadCart(customerId));
  }, [customerId]);

  useEffect(() => {
    const sync = (e) => {
      const key = e?.detail?.key;
      if (key === STORAGE_KEYS.cart || key === "*") setItems(loadCart(customerId));
    };
    window.addEventListener("wk99:storage", sync);
    return () => window.removeEventListener("wk99:storage", sync);
  }, [customerId]);

  const commit = useCallback(
    (next) => {
      setItems(next);
      saveCart(customerId, next);
    },
    [customerId]
  );

  const addToCart = useCallback(
    (menu, quantity = 1) => {
      if (!menu || menu.stock <= 0) return { ok: false, message: "Menu sedang habis" };
      const existing = items.find((i) => i.menuId === menu.menuId);
      const currentQty = existing ? existing.quantity : 0;
      const nextQty = currentQty + quantity;
      if (nextQty > menu.stock)
        return { ok: false, message: `Stok "${menu.name}" hanya tersisa ${menu.stock}` };
      const next = existing
        ? items.map((i) =>
            i.menuId === menu.menuId
              ? { ...i, quantity: nextQty, subTotal: calculateSubTotal(i.price, nextQty) }
              : i
          )
        : [
            ...items,
            {
              menuId: menu.menuId,
              menuName: menu.name,
              price: menu.price,
              emoji: menu.emoji,
              quantity,
              subTotal: calculateSubTotal(menu.price, quantity),
            },
          ];
      commit(next);
      return { ok: true };
    },
    [items, commit]
  );

  const updateQuantity = useCallback(
    (menuId, quantity, maxStock = Infinity) => {
      if (quantity <= 0) {
        commit(items.filter((i) => i.menuId !== menuId));
        return { ok: true };
      }
      if (quantity > maxStock)
        return { ok: false, message: `Stok hanya tersisa ${maxStock}` };
      commit(
        items.map((i) =>
          i.menuId === menuId
            ? { ...i, quantity, subTotal: calculateSubTotal(i.price, quantity) }
            : i
        )
      );
      return { ok: true };
    },
    [items, commit]
  );

  const removeFromCart = useCallback(
    (menuId) => commit(items.filter((i) => i.menuId !== menuId)),
    [items, commit]
  );

  const clearCart = useCallback(() => commit([]), [commit]);

  const totalItems = useMemo(() => items.reduce((s, i) => s + i.quantity, 0), [items]);
  const totalPrice = useMemo(() => items.reduce((s, i) => s + i.subTotal, 0), [items]);

  const placeOrder = useCallback(
    async ({ deliveryAddress, paymentMethod = PAYMENT_METHOD.QRIS }) => {
      if (!user) return { ok: false, message: "Silakan login terlebih dahulu" };
      setPlacing(true);
      try {
        const res = await orderService.create({
          customer: user,
          cartItems: items,
          deliveryAddress,
          paymentMethod,
        });
        commit([]);
        return { ok: true, order: res.data, message: "Pesanan Berhasil Dibuat" };
      } catch (e) {
        const message =
          e.code === "NETWORK_ERROR" ? "Gagal memproses pesanan" : e.message;
        return { ok: false, message, code: e.code };
      } finally {
        setPlacing(false);
      }
    },
    [user, items, commit]
  );

  const value = useMemo(
    () => ({
      items,
      totalItems,
      totalPrice,
      placing,
      addToCart,
      updateQuantity,
      removeFromCart,
      clearCart,
      placeOrder,
    }),
    [items, totalItems, totalPrice, placing, addToCart, updateQuantity, removeFromCart, clearCart, placeOrder]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}