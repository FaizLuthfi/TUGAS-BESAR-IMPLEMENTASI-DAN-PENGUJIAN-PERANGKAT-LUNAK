// src/models/RegisteredCustomer.js
export function createCustomer({
    customerId,
    email,
    phone,
    username,
    password,
    cart = [],
    orders = [],
  }) {
    return { customerId, email, phone, username, password, cart, orders };
  }