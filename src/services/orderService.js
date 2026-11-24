// src/services/orderService.js
import {
    STORAGE_KEYS,
    ORDER_STATUS,
    ORDER_STATUS_FLOW,
    ACTIVE_STATUSES,
    NOTIF_TARGET,
    PAYMENT_METHOD,
  } from "../models/constants";
  import { createOrder } from "../models/Order";
  import { createOrderItem } from "../models/OrderItem";
  import { createOrderStatus } from "../models/OrderStatus";
  import { createPayment } from "../models/Payment";
  import { readJSON, writeJSON, genId } from "./storage";
  import { mockRequest, ApiError } from "./network";
  import { notificationService } from "./notificationService";
  
  const getCurrent = (order) =>
    order.statusHistory[order.statusHistory.length - 1]?.status;
  
  const consumeStock = (cartItems) => {
    const menus = readJSON(STORAGE_KEYS.menus, []);
    const materials = readJSON(STORAGE_KEYS.materials, []);
  
    for (const ci of cartItems) {
      const m = menus.find((x) => x.menuId === ci.menuId);
      if (!m) throw new ApiError(`Menu "${ci.menuName}" tidak ditemukan`, 404);
      if (m.stock < ci.quantity)
        throw new ApiError(`Stok "${m.name}" tidak mencukupi`, 409);
    }
  
    const nextMenus = menus.map((m) => {
      const ci = cartItems.find((c) => c.menuId === m.menuId);
      return ci ? { ...m, stock: m.stock - ci.quantity } : m;
    });
  
    const nextMaterials = materials.map((mat) => {
      let used = 0;
      for (const ci of cartItems) {
        const menu = menus.find((x) => x.menuId === ci.menuId);
        if (menu?.materialIds.includes(mat.id)) used += ci.quantity;
      }
      return used > 0
        ? {
            ...mat,
            quantity: Math.max(0, mat.quantity - used),
            lastUpdated: new Date().toISOString(),
          }
        : mat;
    });
  
    writeJSON(STORAGE_KEYS.menus, nextMenus);
    writeJSON(STORAGE_KEYS.materials, nextMaterials);
  };
  
  const restoreStock = (order) => {
    const menus = readJSON(STORAGE_KEYS.menus, []);
    const materials = readJSON(STORAGE_KEYS.materials, []);
  
    const nextMenus = menus.map((m) => {
      const oi = order.items.find((i) => i.menuId === m.menuId);
      return oi ? { ...m, stock: m.stock + oi.quantity } : m;
    });
  
    const nextMaterials = materials.map((mat) => {
      let used = 0;
      for (const oi of order.items) {
        const menu = menus.find((x) => x.menuId === oi.menuId);
        if (menu?.materialIds.includes(mat.id)) used += oi.quantity;
      }
      return used > 0
        ? { ...mat, quantity: mat.quantity + used, lastUpdated: new Date().toISOString() }
        : mat;
    });
  
    writeJSON(STORAGE_KEYS.menus, nextMenus);
    writeJSON(STORAGE_KEYS.materials, nextMaterials);
  };
  
  export const orderService = {
    create({ customer, cartItems, deliveryAddress, paymentMethod }) {
      return mockRequest(() => {
        if (!cartItems || cartItems.length === 0)
          throw new ApiError("Keranjang masih kosong", 400);
        if (!deliveryAddress?.trim())
          throw new ApiError("Alamat pengiriman wajib diisi", 400);
        if (![PAYMENT_METHOD.QRIS, PAYMENT_METHOD.TUNAI].includes(paymentMethod))
          throw new ApiError("Metode pembayaran tidak valid", 400);
  
        consumeStock(cartItems);
  
        const orderId = genId("ORD");
        const items = cartItems.map((ci, i) =>
          createOrderItem({
            itemId: `${orderId}-I${i + 1}`,
            menuId: ci.menuId,
            menuName: ci.menuName,
            price: ci.price,
            quantity: ci.quantity,
          })
        );
        const order = createOrder({
          orderId,
          customerId: customer.customerId,
          customerName: customer.username,
          deliveryAddress: deliveryAddress.trim(),
          items,
          payment: createPayment({ paymentId: genId("PAY"), method: paymentMethod }),
          statusHistory: [
            createOrderStatus({
              statusId: genId("STS"),
              status: ORDER_STATUS.MENUNGGU,
              updatedBy: customer.customerId,
            }),
          ],
        });
        const orders = readJSON(STORAGE_KEYS.orders, []);
        writeJSON(STORAGE_KEYS.orders, [order, ...orders]);
  
        notificationService.push({
          target: NOTIF_TARGET.EMPLOYEE,
          title: "Pesanan Baru Masuk",
          message: `Pesanan ${order.orderId} dari ${customer.username} menunggu konfirmasi.`,
          orderId: order.orderId,
        });
        return order;
      });
    },
  
    getAll() {
      return mockRequest(() => readJSON(STORAGE_KEYS.orders, []));
    },
  
    getByCustomer(customerId) {
      return mockRequest(() =>
        readJSON(STORAGE_KEYS.orders, []).filter((o) => o.customerId === customerId)
      );
    },
  
    getActiveByCustomer(customerId) {
      return mockRequest(() =>
        readJSON(STORAGE_KEYS.orders, []).filter(
          (o) => o.customerId === customerId && ACTIVE_STATUSES.includes(getCurrent(o))
        )
      );
    },
  
    getHistoryByCustomer(customerId) {
      return mockRequest(() =>
        readJSON(STORAGE_KEYS.orders, []).filter(
          (o) =>
            o.customerId === customerId &&
            [ORDER_STATUS.SELESAI, ORDER_STATUS.DIBATALKAN].includes(getCurrent(o))
        )
      );
    },
  
    getIncoming() {
      return mockRequest(() =>
        readJSON(STORAGE_KEYS.orders, []).filter(
          (o) => getCurrent(o) === ORDER_STATUS.MENUNGGU
        )
      );
    },
  
    getById(orderId) {
      return mockRequest(() => {
        const o = readJSON(STORAGE_KEYS.orders, []).find((x) => x.orderId === orderId);
        if (!o) throw new ApiError("Pesanan tidak ditemukan", 404);
        return o;
      });
    },
  
    accept(orderId, employee) {
      return mockRequest(() => {
        if (!orderId) throw new ApiError("Silakan pilih pesanan terlebih dahulu.", 400);
        const orders = readJSON(STORAGE_KEYS.orders, []);
        const idx = orders.findIndex((o) => o.orderId === orderId);
        if (idx < 0) throw new ApiError("Pesanan tidak ditemukan", 404);
        if (getCurrent(orders[idx]) !== ORDER_STATUS.MENUNGGU)
          throw new ApiError("Pesanan sudah diproses atau dibatalkan.", 409);
        const updated = {
          ...orders[idx],
          statusHistory: [
            ...orders[idx].statusHistory,
            createOrderStatus({
              statusId: genId("STS"),
              status: ORDER_STATUS.DITERIMA,
              updatedBy: employee.id,
            }),
          ],
        };
        orders[idx] = updated;
        writeJSON(STORAGE_KEYS.orders, orders);
        notificationService.push({
          target: NOTIF_TARGET.CUSTOMER,
          userId: updated.customerId,
          title: "Pesanan Diterima",
          message: `Pesanan ${updated.orderId} telah diterima oleh warkop.`,
          orderId: updated.orderId,
        });
        return updated;
      });
    },
  
    updateStatus(orderId, newStatus, employee) {
      return mockRequest(() => {
        if (!orderId) throw new ApiError("Silakan pilih pesanan terlebih dahulu.", 400);
        if (!Object.values(ORDER_STATUS).includes(newStatus))
          throw new ApiError("Status tidak valid", 400);
        const orders = readJSON(STORAGE_KEYS.orders, []);
        const idx = orders.findIndex((o) => o.orderId === orderId);
        if (idx < 0) throw new ApiError("Pesanan tidak ditemukan", 404);
        const current = getCurrent(orders[idx]);
        if (current === ORDER_STATUS.SELESAI)
          throw new ApiError("Status pesanan tidak dapat diubah", 409);
        if (current === ORDER_STATUS.DIBATALKAN)
          throw new ApiError("Status pesanan tidak dapat diubah", 409);
        if (newStatus === current)
          throw new ApiError("Status pesanan sudah " + current, 400);
  
        if (newStatus !== ORDER_STATUS.DIBATALKAN) {
          const curPos = ORDER_STATUS_FLOW.indexOf(current);
          const newPos = ORDER_STATUS_FLOW.indexOf(newStatus);
          if (newPos < curPos || newPos === -1)
            throw new ApiError("Status pesanan tidak dapat diubah", 409);
        }
  
        if (newStatus === ORDER_STATUS.DIBATALKAN) restoreStock(orders[idx]);
  
        const updated = {
          ...orders[idx],
          statusHistory: [
            ...orders[idx].statusHistory,
            createOrderStatus({
              statusId: genId("STS"),
              status: newStatus,
              updatedBy: employee.id,
            }),
          ],
          payment:
            newStatus === ORDER_STATUS.SELESAI
              ? { ...orders[idx].payment, status: "Lunas" }
              : orders[idx].payment,
        };
        orders[idx] = updated;
        writeJSON(STORAGE_KEYS.orders, orders);
        notificationService.push({
          target: NOTIF_TARGET.CUSTOMER,
          userId: updated.customerId,
          title: "Status Pesanan Diperbarui",
          message: `Pesanan ${updated.orderId} sekarang berstatus "${newStatus}".`,
          orderId: updated.orderId,
        });
        return updated;
      });
    },
  
    getTopMenuIds(customerId, limit = 3) {
      const orders = readJSON(STORAGE_KEYS.orders, []).filter(
        (o) => o.customerId === customerId
      );
      const count = {};
      for (const o of orders)
        for (const it of o.items) count[it.menuId] = (count[it.menuId] || 0) + it.quantity;
      return Object.entries(count)
        .sort((a, b) => b[1] - a[1])
        .slice(0, limit)
        .map(([menuId]) => menuId);
    },
  };