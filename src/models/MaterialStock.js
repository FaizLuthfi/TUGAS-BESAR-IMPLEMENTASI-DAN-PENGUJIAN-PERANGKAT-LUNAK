// src/models/MaterialStock.js
export function createMaterialStock({
    id,
    materialName,
    quantity,
    unit = "porsi",
    lastUpdated = new Date().toISOString(),
  }) {
    return { id, materialName, quantity: Number(quantity), unit, lastUpdated };
  }
  
  export function addStock(material, amount) {
    return {
      ...material,
      quantity: material.quantity + Number(amount),
      lastUpdated: new Date().toISOString(),
    };
  }
  
  export function reduceStock(material, amount) {
    return {
      ...material,
      quantity: Math.max(0, material.quantity - Number(amount)),
      lastUpdated: new Date().toISOString(),
    };
  }