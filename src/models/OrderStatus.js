// src/models/OrderStatus.js
export function createOrderStatus({
    statusId,
    status,
    updatedBy,
    updatedAt = new Date().toISOString(),
  }) {
    return { statusId, status, updatedAt, updatedBy };
  }