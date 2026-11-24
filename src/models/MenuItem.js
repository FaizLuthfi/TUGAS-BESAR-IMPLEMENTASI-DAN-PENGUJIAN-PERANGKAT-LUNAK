// src/models/MenuItem.js
export function createMenuItem({
    menuId,
    name,
    description,
    price,
    stock,
    materialIds = [],
    category = "Makanan",
    emoji = "🍽️",
  }) {
    return {
      menuId,
      name,
      description,
      price: Number(price),
      stock: Number(stock),
      materialIds,
      category,
      emoji,
    };
  }
  
  export function updateStock(menu, newStock) {
    return { ...menu, stock: Number(newStock) };
  }
  
  export function getDetails(menu) {
    return `${menu.name} - ${menu.description} (Rp${menu.price})`;
  }
  
  export function isAvailable(menu) {
    return menu.stock > 0;
  }