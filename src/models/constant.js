// src/models/constants.js
export const STORAGE_KEYS = {
    employees: "wk99_employees",
    customers: "wk99_customers",
    menus: "wk99_menus",
    materials: "wk99_materials",
    orders: "wk99_orders",
    feedbacks: "wk99_feedbacks",
    notifications: "wk99_notifications",
    session: "wk99_session",
    cart: "wk99_cart",
    network: "wk99_network_fail",
    seeded: "wk99_seeded",
  };
  
  export const ROLES = {
    CUSTOMER: "customer",
    EMPLOYEE: "employee",
  };
  
  export const ORDER_STATUS = {
    MENUNGGU: "Menunggu Konfirmasi",
    DITERIMA: "Diterima",
    DIPROSES: "Diproses",
    DIKIRIM: "Dikirim",
    SELESAI: "Selesai",
    DIBATALKAN: "Dibatalkan",
  };
  
  export const ORDER_STATUS_FLOW = [
    ORDER_STATUS.DITERIMA,
    ORDER_STATUS.DIPROSES,
    ORDER_STATUS.DIKIRIM,
    ORDER_STATUS.SELESAI,
  ];
  
  export const ACTIVE_STATUSES = [
    ORDER_STATUS.MENUNGGU,
    ORDER_STATUS.DITERIMA,
    ORDER_STATUS.DIPROSES,
    ORDER_STATUS.DIKIRIM,
  ];
  
  export const PAYMENT_METHOD = {
    QRIS: "QRIS",
    TUNAI: "Tunai",
  };
  
  export const PAYMENT_STATUS = {
    BELUM_BAYAR: "Belum Dibayar",
    LUNAS: "Lunas",
  };
  
  export const LOW_STOCK_THRESHOLD = 5;
  
  export const NOTIF_TARGET = {
    CUSTOMER: "customer",
    EMPLOYEE: "employee",
  };