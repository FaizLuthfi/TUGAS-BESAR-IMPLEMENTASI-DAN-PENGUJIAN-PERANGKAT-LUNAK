// src/models/OrderItem.js
export function calculateSubTotal(price, quantity) {
    return Number(price) * Number(quantity);
  }
  
  export function createOrderItem({ itemId, menuId, menuName, price, quantity }) {
    return {
      itemId,
      menuId,
      menuName,
      price: Number(price),
      quantity: Number(quantity),
      subTotal: calculateSubTotal(price, quantity),
    };
  }