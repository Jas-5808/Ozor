import { Product } from '../types';
export const mockProducts: Product[] = [
  {
    id: "89cb65d6-4364-4ff5-91cc-67005f24fdc0",
    category: {
      id: "6bc6c3c0-5f8d-45f7-805a-e35c4090f1dd",
      name: "Electronics"
    },
    name: "iPhone XS",
    description: "Apple iPhone XS with flagship performance and a great camera",
    base_price: 1000,
    refferal_price: 300
  },
  {
    id: "89cb65d6-4364-4ff5-91cc-67005f24fdc1",
    category: {
      id: "6bc6c3c0-5f8d-45f7-805a-e35c4090f1dd",
      name: "Electronics"
    },
    name: "Samsung Galaxy S21",
    description: "Samsung flagship smartphone with a powerful processor",
    base_price: 1200,
    refferal_price: 800
  },
  {
    id: "89cb65d6-4364-4ff5-91cc-67005f24fdc2",
    category: {
      id: "6bc6c3c0-5f8d-45f7-805a-e35c4090f1dd",
      name: "Electronics"
    },
    name: "MacBook Pro 13",
    description: "Apple MacBook Pro 13 with the M1 chipset",
    base_price: 2000,
    refferal_price: 1500
  },
  {
    id: "89cb65d6-4364-4ff5-91cc-67005f24fdc3",
    category: {
      id: "6bc6c3c0-5f8d-45f7-805a-e35c4090f1dd",
      name: "Electronics"
    },
    name: "AirPods Pro",
    description: "Wireless earbuds with active noise cancellation",
    base_price: 300,
    refferal_price: 250
  },
  {
    id: "89cb65d6-4364-4ff5-91cc-67005f24fdc4",
    category: {
      id: "6bc6c3c0-5f8d-45f7-805a-e35c4090f1dd",
      name: "Electronics"
    },
    name: "iPad Air",
    description: "Apple iPad Air with a 10.9-inch Liquid Retina display",
    base_price: 800,
    refferal_price: 600
  },
  {
    id: "89cb65d6-4364-4ff5-91cc-67005f24fdc5",
    category: {
      id: "6bc6c3c0-5f8d-45f7-805a-e35c4090f1dd",
      name: "Electronics"
    },
    name: "Apple Watch Series 7",
    description: "Apple Watch Series 7 with an always-on Retina display",
    base_price: 500,
    refferal_price: 400
  },
  {
    id: "89cb65d6-4364-4ff5-91cc-67005f24fdc6",
    category: {
      id: "6bc6c3c0-5f8d-45f7-805a-e35c4090f1dd",
      name: "Electronics"
    },
    name: "Sony WH-1000XM4",
    description: "Wireless over-ear headphones with industry-leading ANC",
    base_price: 400,
    refferal_price: 350
  },
  {
    id: "89cb65d6-4364-4ff5-91cc-67005f24fdc7",
    category: {
      id: "6bc6c3c0-5f8d-45f7-805a-e35c4090f1dd",
      name: "Electronics"
    },
    name: "Dell XPS 13",
    description: "Dell XPS 13 ultrabook with an edge-to-edge display",
    base_price: 1500,
    refferal_price: 1200
  }
];
export const getMockProducts = (): Promise<Product[]> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(mockProducts);
    }, 1500); // Simulated network delay
  });
};
export const getMockProductById = (id: string): Promise<Product | null> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      const product = mockProducts.find(p => p.id === id);
      resolve(product || null);
    }, 1000);
  });
};
