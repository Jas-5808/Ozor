import { AxiosResponse } from 'axios';

/**
 * Базовые типы для API ответов
 */
export interface ApiResponse<T = unknown> {
  data: T;
  message?: string;
  success: boolean;
  error?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/**
 * Типы для аутентификации
 */
export interface SignInRequest {
  phone: string;
  password: string;
}

export interface SignUpRequest {
  phone: string;
  password: string;
}

export interface AuthResponse {
  access_token: string;
  refresh_token: string;
  user?: UserProfile;
}

export interface RefreshTokenRequest {
  refresh_token: string;
}

export interface RefreshTokenResponse {
  access_token: string;
  refresh_token: string;
}

/**
 * Типы для пользователя
 */
export interface UserProfile {
  id: string;
  email: string;
  phone?: string;
  first_name?: string;
  last_name?: string;
  bio?: string;
  location?: string;
  balance?: number;
  role?: string;
  user_role?: string;
  avatar?: string;
  created_at?: string;
  updated_at?: string;
}

export interface UpdateProfileRequest {
  first_name?: string;
  last_name?: string;
  email?: string;
  bio?: string;
  location?: string;
}

/**
 * Типы для продуктов
 */
export interface ProductResponse {
  product_id: string;
  product_name: string;
  product_description: string;
  category: {
    id: string;
    name: string;
  };
  refferal_price: number;
  base_price: number;
  main_image: string;
  variant_id: string;
  variant_sku: string;
  price: number;
  stock: number;
  variant_attributes: ProductAttributeValue[];
  variant_media?: VariantMedia[];
}

export interface ProductAttributeValue {
  id: string;
  variant_id: string;
  attribute_id?: string;
  attribute_name?: string;
  value: string;
  image?: string;
}

export interface VariantMedia {
  id: string;
  file: string;
  type: string;
  is_main: boolean;
}

/**
 * Типы для категорий
 */
export interface CategoryResponse {
  id: string;
  name: string;
  parent_id: string | null;
  parent_name: string | null;
  subcategories_count: number;
  products_count: number;
}

/**
 * Типы для корзины
 */
export interface CartItemResponse {
  id: string;
  product_id: string;
  variant_id: string;
  quantity: number;
  product: {
    id: string;
    name: string;
    price: number;
    image?: string;
  };
}

export interface AddToCartRequest {
  productId: string;
  variantId?: string;
  quantity: number;
}

/**
 * Типы для заказов
 */
export interface OrderResponse {
  id: string;
  order_number: string;
  user_id?: string;
  status: 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  total_price: number;
  items: OrderItem[];
  buyer_firstname?: string;
  buyer_lastname?: string;
  full_name?: string;
  order_comment?: string;
  created_at: string;
  updated_at: string;
}

export interface OrderItem {
  id: string;
  product_id: string;
  variant_id: string;
  quantity: number;
  price: number;
  product_name: string;
}

export interface CreateOrderRequest {
  items: Array<{
    product_id: string;
    variant_id: string;
    quantity: number;
  }>;
  delivery_method: 'pickup' | 'courier';
  delivery_address?: string;
  comment?: string;
}

/**
 * Типы для реферальных ссылок
 */
export interface ReferralResponse {
  id: string;
  product_id: string;
  product_name: string;
  link: string;
  commission: number;
  created_at: string;
}

export interface CreateReferralRequest {
  product_id: string;
}

/**
 * Типы для ошибок API
 */
export interface ApiError {
  message: string;
  code?: string;
  details?: Record<string, unknown>;
  status?: number;
}

export interface ApiErrorResponse {
  error: ApiError;
  message: string;
  status: number;
}

/**
 * Типизированные обертки для AxiosResponse
 */
export type TypedAxiosResponse<T> = AxiosResponse<ApiResponse<T>>;
export type TypedPaginatedResponse<T> = AxiosResponse<PaginatedResponse<T>>;

