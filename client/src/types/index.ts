
export interface Product {
  id: string;
  category: {
    id: string;
    name: string;
  };
  name: string;
  description: string;
  base_price: number;
  refferal_price: number;
  main_image: string;
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
  status: 'pending' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled';
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
  sortBy?: 'price' | 'name' | 'createdAt';
  sortOrder?: 'asc' | 'desc';
}
export interface LoadingState {
  loading: boolean;
  error: string | null;
}