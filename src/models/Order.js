// src/models/Order.js
export function calculateTotal(items) {
    return items.reduce((sum, it) => sum + it.subTotal, 0);
  }
  
  export function createOrder({
    orderId,
    customerId,
    customerName,
    deliveryAddress,
    items,
    payment,
    statusHistory,
    orderDate = new Date().toISOString(),
  }) {
    return {
      orderId,
      orderDate,
      totalPrice: calculateTotal(items),
      deliveryAddress,
      statusHistory,
      items,
      payment,
      customerId,
      customerName,
    };
  }
  
  export function getCurrentStatus(order) {
    const h = order.statusHistory;
    return h.length ? h[h.length - 1].status : null;
  }