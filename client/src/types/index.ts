export interface Product {
  product_id: string;
  product_name: string;
  product_description: string;
  category: {
    id: string;
    name: string;
  };
  refferal_price: number;
  main_image: string;
  variant_id: string;
  variant_sku: string;
  price: number;
  stock: number;
  variant_attributes: ProductAttributeValue[];
  variant_media?: VariantMedia[]; // из /shop/products для варианта
}

export interface ProductAttribute {
  id: string;
  name: string;
  unit: string;
}

export interface ProductAttributeValue {
  id: string;
  variant_id: string;
  attribute_id?: string; // в некоторых ответах приходит attribute_name вместо id
  attribute_name?: string;
  value: string;
  image?: string; // может отсутствовать, изображения приходят в variant_media
}

export interface ProductVariant {
  id: string;
  product_id: string;
  sku: string;
  price: number | null;
  base_price: number | null;
  stock: number;
  attribute_values: ProductAttributeValue[];
  variant_media?: VariantMedia[];
}

export interface ProductDetail extends Product {
  attributes: ProductAttribute[];
  variants: ProductVariant[];
}
export interface ProductVariantWithMedia extends ProductVariant {
  variant_media?: VariantMedia[];
}
export interface VariantMedia {
  id: string;
  file: string;
  type: string;
  is_main: boolean;
}
export interface Category {
  id: string;
  name: string;
  parent_id: string | null;
  parent_name: string | null;
  subcategories_count: number;
  products_count: number;
}
export interface User {
  id: string;
  email: string;
  name: string;
  phone?: string;
  avatar?: string;
}
export interface CartItem {
  productId: string;
  quantity: number;
  product: {
    id: string;
    name: string;
    refferal_price: number;
    base_price: number;
  };
}
export interface Order {
  id: string;
  userId: string;
  items: CartItem[];
  total: number;
  status: "pending" | "confirmed" | "shipped" | "delivered" | "cancelled";
  createdAt: string;
  updatedAt: string;
}
export interface ApiResponse<T> {
  data: T;
  message?: string;
  success: boolean;
}
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
export interface ProductFilters {
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  search?: string;
  sortBy?: "price" | "name" | "createdAt";
  sortOrder?: "asc" | "desc";
}
export interface LoadingState {
  loading: boolean;
  error: string | null;
}

export interface Flow {
  id: string;
  productId: string;
  productName: string;
  link: string;
  commission: number;
  createdAt: string;
}
