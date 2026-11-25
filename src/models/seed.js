// src/models/seed.js
import { createEmployee } from "./Employee";
import { createCustomer } from "./RegisteredCustomer";
import { createMenuItem } from "./MenuItem";
import { createMaterialStock } from "./MaterialStock";
import { createOrderItem } from "./OrderItem";
import { createOrderStatus } from "./OrderStatus";
import { createPayment } from "./Payment";
import { createOrder } from "./Order";
import { createFeedback } from "./Feedback";
import { ORDER_STATUS } from "./constant";
import { PAYMENT_METHOD } from "./constant";

const daysAgo = (d) => new Date(Date.now() - d * 86400000).toISOString();

export const seedEmployees = [
  createEmployee({
    id: "EMP-001",
    name: "Pak Joko",
    username: "pegawai",
    password: "pegawai123",
    role: "Kasir",
  }),
  createEmployee({
    id: "EMP-002",
    name: "Mbak Rina",
    username: "rina",
    password: "rina123",
    role: "Barista",
  }),
];

export const seedCustomers = [
  createCustomer({
    customerId: "CUS-001",
    email: "budi@mail.com",
    phone: "081234567890",
    username: "customer",
    password: "customer123",
  }),
  createCustomer({
    customerId: "CUS-002",
    email: "sari@mail.com",
    phone: "081298765432",
    username: "sari",
    password: "sari123",
  }),
];

export const seedMaterials = [
  createMaterialStock({ id: "MAT-001", materialName: "Biji Kopi", quantity: 40, unit: "porsi" }),
  createMaterialStock({ id: "MAT-002", materialName: "Susu Cair", quantity: 30, unit: "porsi" }),
  createMaterialStock({ id: "MAT-003", materialName: "Mie Instan", quantity: 25, unit: "bungkus" }),
  createMaterialStock({ id: "MAT-004", materialName: "Telur", quantity: 4, unit: "butir" }),
  createMaterialStock({ id: "MAT-005", materialName: "Roti Tawar", quantity: 20, unit: "lembar" }),
  createMaterialStock({ id: "MAT-006", materialName: "Teh Celup", quantity: 35, unit: "kantong" }),
  createMaterialStock({ id: "MAT-007", materialName: "Nasi Putih", quantity: 3, unit: "porsi" }),
  createMaterialStock({ id: "MAT-008", materialName: "Cokelat Bubuk", quantity: 15, unit: "porsi" }),
];

export const seedMenus = [
  createMenuItem({
    menuId: "MNU-001",
    name: "Kopi Susu",
    description: "Kopi robusta dengan susu segar dan gula aren.",
    price: 15000,
    stock: 30,
    materialIds: ["MAT-001", "MAT-002"],
    category: "Minuman",
    emoji: "☕",
  }),
  createMenuItem({
    menuId: "MNU-002",
    name: "Indomie Goreng Telur",
    description: "Indomie goreng dengan telur mata sapi.",
    price: 13000,
    stock: 20,
    materialIds: ["MAT-003", "MAT-004"],
    category: "Makanan",
    emoji: "🍜",
  }),
  createMenuItem({
    menuId: "MNU-003",
    name: "Roti Bakar Cokelat",
    description: "Roti bakar tebal dengan selai cokelat dan keju.",
    price: 12000,
    stock: 15,
    materialIds: ["MAT-005", "MAT-008"],
    category: "Makanan",
    emoji: "🍞",
  }),
  createMenuItem({
    menuId: "MNU-004",
    name: "Teh Tarik",
    description: "Teh pekat dengan susu, ditarik hingga berbusa.",
    price: 10000,
    stock: 25,
    materialIds: ["MAT-006", "MAT-002"],
    category: "Minuman",
    emoji: "🫖",
  }),
  createMenuItem({
    menuId: "MNU-005",
    name: "Nasi Goreng Warkop",
    description: "Nasi goreng bumbu khas dengan telur dan kerupuk.",
    price: 18000,
    stock: 3,
    materialIds: ["MAT-007", "MAT-004"],
    category: "Makanan",
    emoji: "🍛",
  }),
  createMenuItem({
    menuId: "MNU-006",
    name: "Kopi Hitam",
    description: "Kopi tubruk tanpa gula, pahit mantap.",
    price: 8000,
    stock: 40,
    materialIds: ["MAT-001"],
    category: "Minuman",
    emoji: "🫘",
  }),
  createMenuItem({
    menuId: "MNU-007",
    name: "Es Cokelat",
    description: "Cokelat dingin dengan susu dan es batu.",
    price: 14000,
    stock: 0,
    materialIds: ["MAT-008", "MAT-002"],
    category: "Minuman",
    emoji: "🧋",
  }),
];

const mkOrder = ({ orderId, daysBack, items, method, address, statuses }) => {
  const orderItems = items.map((it, i) =>
    createOrderItem({ itemId: `${orderId}-I${i + 1}`, ...it })
  );
  const history = statuses.map((s, i) =>
    createOrderStatus({
      statusId: `${orderId}-S${i + 1}`,
      status: s,
      updatedBy: i === 0 ? "CUS-001" : "EMP-001",
      updatedAt: daysAgo(daysBack - i * 0.01),
    })
  );
  return createOrder({
    orderId,
    customerId: "CUS-001",
    customerName: "customer",
    deliveryAddress: address,
    items: orderItems,
    payment: createPayment({
      paymentId: `PAY-${orderId}`,
      method,
      paymentDate: daysAgo(daysBack),
    }),
    statusHistory: history,
    orderDate: daysAgo(daysBack),
  });
};

export const seedOrders = [
  mkOrder({
    orderId: "ORD-001",
    daysBack: 6,
    method: PAYMENT_METHOD.QRIS,
    address: "Jl. Telekomunikasi No. 1, Bandung",
    items: [
      { menuId: "MNU-001", menuName: "Kopi Susu", price: 15000, quantity: 2 },
      { menuId: "MNU-003", menuName: "Roti Bakar Cokelat", price: 12000, quantity: 1 },
    ],
    statuses: [
      ORDER_STATUS.MENUNGGU,
      ORDER_STATUS.DITERIMA,
      ORDER_STATUS.DIPROSES,
      ORDER_STATUS.DIKIRIM,
      ORDER_STATUS.SELESAI,
    ],
  }),
  mkOrder({
    orderId: "ORD-002",
    daysBack: 4,
    method: PAYMENT_METHOD.TUNAI,
    address: "Jl. Telekomunikasi No. 1, Bandung",
    items: [
      { menuId: "MNU-002", menuName: "Indomie Goreng Telur", price: 13000, quantity: 1 },
      { menuId: "MNU-001", menuName: "Kopi Susu", price: 15000, quantity: 1 },
    ],
    statuses: [
      ORDER_STATUS.MENUNGGU,
      ORDER_STATUS.DITERIMA,
      ORDER_STATUS.DIPROSES,
      ORDER_STATUS.DIKIRIM,
      ORDER_STATUS.SELESAI,
    ],
  }),
  mkOrder({
    orderId: "ORD-003",
    daysBack: 2,
    method: PAYMENT_METHOD.QRIS,
    address: "Jl. Telekomunikasi No. 1, Bandung",
    items: [
      { menuId: "MNU-001", menuName: "Kopi Susu", price: 15000, quantity: 3 },
    ],
    statuses: [
      ORDER_STATUS.MENUNGGU,
      ORDER_STATUS.DITERIMA,
      ORDER_STATUS.DIPROSES,
      ORDER_STATUS.DIKIRIM,
      ORDER_STATUS.SELESAI,
    ],
  }),
  mkOrder({
    orderId: "ORD-004",
    daysBack: 0.05,
    method: PAYMENT_METHOD.TUNAI,
    address: "Jl. Telekomunikasi No. 1, Bandung",
    items: [
      { menuId: "MNU-004", menuName: "Teh Tarik", price: 10000, quantity: 2 },
    ],
    statuses: [ORDER_STATUS.MENUNGGU],
  }),
];

export const seedFeedbacks = [
  createFeedback({
    feedbackId: "FB-001",
    rating: 5,
    message: "Kopi susunya mantap, pengantaran cepat!",
    orderId: "ORD-001",
    customerId: "CUS-001",
    customerName: "customer",
    createdAt: daysAgo(5),
  }),
];

export const seedNotifications = [];