import { Product } from '../types';
export const mockProducts: Product[] = [
  {
    id: "89cb65d6-4364-4ff5-91cc-67005f24fdc0",
    category: {
      id: "6bc6c3c0-5f8d-45f7-805a-e35c4090f1dd",
      name: "Электроника"
    },
    name: "iPhone XS",
    description: "Смартфон Apple iPhone XS с отличными характеристиками и качественной камерой",
    base_price: 1000,
    refferal_price: 300
  },
  {
    id: "89cb65d6-4364-4ff5-91cc-67005f24fdc1",
    category: {
      id: "6bc6c3c0-5f8d-45f7-805a-e35c4090f1dd",
      name: "Электроника"
    },
    name: "Samsung Galaxy S21",
    description: "Флагманский смартфон Samsung с мощным процессором",
    base_price: 1200,
    refferal_price: 800
  },
  {
    id: "89cb65d6-4364-4ff5-91cc-67005f24fdc2",
    category: {
      id: "6bc6c3c0-5f8d-45f7-805a-e35c4090f1dd",
      name: "Электроника"
    },
    name: "MacBook Pro 13",
    description: "Ноутбук Apple MacBook Pro с процессором M1",
    base_price: 2000,
    refferal_price: 1500
  },
  {
    id: "89cb65d6-4364-4ff5-91cc-67005f24fdc3",
    category: {
      id: "6bc6c3c0-5f8d-45f7-805a-e35c4090f1dd",
      name: "Электроника"
    },
    name: "AirPods Pro",
    description: "Беспроводные наушники с активным шумоподавлением",
    base_price: 300,
    refferal_price: 250
  },
  {
    id: "89cb65d6-4364-4ff5-91cc-67005f24fdc4",
    category: {
      id: "6bc6c3c0-5f8d-45f7-805a-e35c4090f1dd",
      name: "Электроника"
    },
    name: "iPad Air",
    description: "Планшет Apple iPad Air с дисплеем 10.9 дюйма",
    base_price: 800,
    refferal_price: 600
  },
  {
    id: "89cb65d6-4364-4ff5-91cc-67005f24fdc5",
    category: {
      id: "6bc6c3c0-5f8d-45f7-805a-e35c4090f1dd",
      name: "Электроника"
    },
    name: "Apple Watch Series 7",
    description: "Умные часы Apple с большим дисплеем",
    base_price: 500,
    refferal_price: 400
  },
  {
    id: "89cb65d6-4364-4ff5-91cc-67005f24fdc6",
    category: {
      id: "6bc6c3c0-5f8d-45f7-805a-e35c4090f1dd",
      name: "Электроника"
    },
    name: "Sony WH-1000XM4",
    description: "Беспроводные наушники с лучшим шумоподавлением",
    base_price: 400,
    refferal_price: 350
  },
  {
    id: "89cb65d6-4364-4ff5-91cc-67005f24fdc7",
    category: {
      id: "6bc6c3c0-5f8d-45f7-805a-e35c4090f1dd",
      name: "Электроника"
    },
    name: "Dell XPS 13",
    description: "Ультрабук Dell XPS 13 с безрамочным дисплеем",
    base_price: 1500,
    refferal_price: 1200
  }
];
export const getMockProducts = (): Promise<Product[]> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(mockProducts);
    }, 1500); // Имитация задержки сети
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