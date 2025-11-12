import axios, { AxiosResponse, AxiosError } from "axios";
import { config } from "../utils/config";
import {
  Product,
  Category,
  User,
  CartItem,
  Order,
  ApiResponse,
  PaginatedResponse,
} from "../types";
import type {
  AuthResponse,
  SignInRequest,
  SignUpRequest,
  RefreshTokenRequest,
  RefreshTokenResponse,
  UserProfile,
  UpdateProfileRequest,
  ProductResponse,
  CategoryResponse,
  CartItemResponse,
  AddToCartRequest,
  OrderResponse,
  CreateOrderRequest,
  ReferralResponse,
  CreateReferralRequest,
  TypedAxiosResponse,
  TypedPaginatedResponse,
  ApiErrorResponse,
} from "../types/api";

const API_BASE_URL = config.api.baseUrl;
const API_TIMEOUT = config.api.timeout;

import { logger } from '../utils/logger';

logger.debug("API Configuration:", { API_BASE_URL, API_TIMEOUT });

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: API_TIMEOUT,
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: false,
});

// Global in-flight GET de-duplication
const inflightGet = new Map(); // key -> Promise
const stableStringify = (value) => {
  if (value === null || typeof value !== 'object') return String(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  const keys = Object.keys(value).sort();
  return `{${keys.map((k)=>`${JSON.stringify(k)}:${stableStringify(value[k])}`).join(',')}}`;
};
const originalGet = apiClient.get.bind(apiClient);
apiClient.get = (url, config = {}) => {
  try {
    const paramsKey = stableStringify(config.params || {});
    const key = `${url}?${paramsKey}`;
    if (inflightGet.has(key)) {
      return inflightGet.get(key);
    }
    const promise = originalGet(url, config);
    inflightGet.set(key, promise);
    const cleanup = () => inflightGet.delete(key);
    promise.then(cleanup).catch(cleanup);
    return promise;
  } catch (_) {
    return originalGet(url, config);
  }
};

apiClient.interceptors.request.use(
  (config) => {
    const fullUrl = `${config.baseURL}${config.url}`;
    
    // Подробное логирование для POST запросов на signin
    if (config.method?.toUpperCase() === 'POST' && config.url?.includes('/auth/signin')) {
      console.log("=== REQUEST INTERCEPTOR DEBUG ===");
      console.log("URL:", fullUrl);
      console.log("Method:", config.method);
      console.log("Headers:", config.headers);
      console.log("Data type:", typeof config.data);
      console.log("Data constructor:", config.data?.constructor?.name);
      
      if (config.data instanceof URLSearchParams) {
        console.log("✅ Data is URLSearchParams");
        console.log("Data.toString():", config.data.toString().replace(/password=[^&]*/, 'password=***'));
        console.log("Data.get('phone'):", config.data.get("phone"));
        console.log("Data.get('password'):", config.data.get("password") ? "***" : "undefined");
        
        // Проверяем, что данные действительно есть
        const phone = config.data.get("phone");
        const password = config.data.get("password");
        if (!phone || !password) {
          console.error("❌ В URLSearchParams отсутствуют данные!");
          console.error("   phone:", phone);
          console.error("   password:", password ? "***" : "undefined");
        } else {
          console.log("✅ Данные присутствуют в URLSearchParams");
        }
      } else if (typeof config.data === 'string') {
        console.log("Data is string:", config.data.replace(/password=[^&]*/, 'password=***'));
      } else if (config.data && typeof config.data === 'object') {
        console.log("Data is object:", JSON.stringify(config.data).replace(/password":"[^"]*/, 'password":"***'));
      } else {
        console.log("Data:", config.data);
      }
      console.log("=== REQUEST INTERCEPTOR DEBUG END ===");
    }
    
    logger.api(config.method?.toUpperCase() || 'UNKNOWN', fullUrl, config.data);
    const token = localStorage.getItem("access_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    logger.errorWithContext(error, { context: 'API request interceptor' });
    return Promise.reject(error);
  }
);

// Флаг для предотвращения бесконечных циклов обновления токена
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value?: unknown) => void;
  reject: (error?: unknown) => void;
}> = [];

const processQueue = (error: AxiosError | null, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

apiClient.interceptors.response.use(
  (response) => {
    logger.apiResponse(response.status, response.config.url || '', response.data);
    return response;
  },
  async (error: AxiosError<ApiErrorResponse>) => {
    const originalRequest = error.config as typeof error.config & { _retry?: boolean };
    
    // Если ошибка 401 и это не запрос на обновление токена
    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        // Если токен уже обновляется, добавляем запрос в очередь
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            if (originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${token}`;
            }
            return apiClient(originalRequest);
          })
          .catch((err) => {
            return Promise.reject(err);
          });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const refreshToken = localStorage.getItem("refresh_token");
      
      if (!refreshToken) {
        processQueue(error);
        isRefreshing = false;
        // Перенаправляем на страницу входа
        if (window.location.pathname !== '/login') {
          window.location.href = '/login';
        }
        return Promise.reject(error);
      }

      try {
        const response = await axios.post<RefreshTokenResponse>(
          `${API_BASE_URL}/auth/refresh`,
          { refresh_token: refreshToken }
        );
        
        const { access_token, refresh_token: newRefreshToken } = response.data;
        localStorage.setItem("access_token", access_token);
        localStorage.setItem("refresh_token", newRefreshToken);

        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${access_token}`;
        }

        processQueue(null, access_token);
        isRefreshing = false;

        return apiClient(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError as AxiosError);
        isRefreshing = false;
        localStorage.removeItem("access_token");
        localStorage.removeItem("refresh_token");
        
        // Перенаправляем на страницу входа
        if (window.location.pathname !== '/login') {
          window.location.href = '/login';
        }
        
        return Promise.reject(refreshError);
      }
    }

    logger.errorWithContext(error, {
      context: 'API response interceptor',
      status: error.response?.status,
      url: error.config?.url,
      data: error.response?.data,
    });
    return Promise.reject(error);
  }
);

export const shopAPI = {
  getProducts: (params: Record<string, unknown> = {}): Promise<TypedAxiosResponse<ProductResponse[]>> => 
    apiClient.get("/shop/products", { params }),
  getProductById: (id: string): Promise<TypedAxiosResponse<ProductResponse>> => 
    apiClient.get(`/shop/product/${id}`),
  getProductsByCategory: (
    categoryId: string, 
    params: Record<string, unknown> = {}
  ): Promise<TypedAxiosResponse<ProductResponse[]>> =>
    apiClient.get(`/shop/products`, { params: { category: categoryId, ...params } }),
  getCategories: (() => {
    // simple in-memory cache with TTL
    let cached: { 
      time: number; 
      response: TypedAxiosResponse<CategoryResponse[]>; 
      promise: Promise<TypedAxiosResponse<CategoryResponse[]>> | null 
    } | null = null;
    const TTL = 180_000; // 3 minutes
    return (): Promise<TypedAxiosResponse<CategoryResponse[]>> => {
      const now = Date.now();
      if (cached && cached.response && (now - cached.time) < TTL) {
        return Promise.resolve(cached.response);
      }
      if (cached && cached.promise) {
        return cached.promise;
      }
      const promise = apiClient.get("/shop/categories").then((res) => {
        const typedRes = res as TypedAxiosResponse<CategoryResponse[]>;
        cached = { time: Date.now(), response: typedRes, promise: null };
        return typedRes;
      }).catch((e) => {
        // do not lock on error
        cached = null;
        throw e;
      });
      cached = { time: 0, response: null as unknown as TypedAxiosResponse<CategoryResponse[]>, promise };
      return promise;
    };
  })(),
  createCategory: (payload: { name: string; parent_id?: string | null }): Promise<TypedAxiosResponse<CategoryResponse>> => 
    apiClient.post("/shop/category", payload),
  getCategoryById: (categoryId: string): Promise<TypedAxiosResponse<CategoryResponse>> =>
    apiClient.get(`/shop/category/${categoryId}`),
  // Расширенный метод для получения всех вариантов товара
  getAllProductVariants: (() => {
    const cache = new Map<string, { 
      time: number; 
      response: TypedAxiosResponse<ProductResponse[]>; 
      promise: Promise<TypedAxiosResponse<ProductResponse[]>> | null 
    }>();
    const TTL = 180_000; // 3 minutes
    return (productId: string): Promise<TypedAxiosResponse<ProductResponse[]>> => {
      const key = String(productId || "");
      const now = Date.now();
      const entry = cache.get(key);
      if (entry && entry.response && (now - entry.time) < TTL) {
        return Promise.resolve(entry.response);
      }
      if (entry && entry.promise) {
        return entry.promise;
      }
      const promise = apiClient.get(`/shop/products`, { params: { product_id: productId } }).then((res) => {
        const typedRes = res as TypedAxiosResponse<ProductResponse[]>;
        cache.set(key, { time: Date.now(), response: typedRes, promise: null });
        return typedRes;
      }).catch((e) => {
        cache.delete(key);
        throw e;
      });
      cache.set(key, { time: 0, response: null as unknown as TypedAxiosResponse<ProductResponse[]>, promise });
      return promise;
    };
  })(),
  guestOrder: (payload: CreateOrderRequest): Promise<TypedAxiosResponse<OrderResponse>> => 
    apiClient.post(`/shop/guest/order`, payload),
  getAllOrders: (): Promise<TypedAxiosResponse<OrderResponse[]>> => 
    apiClient.get(`/shop/orders/all`),
  // Call-center endpoints
  takeOrderCallCenter: (orderId: string): Promise<TypedAxiosResponse<OrderResponse>> =>
    apiClient.post(`/shop/order/call-center`, null, { params: { order_id: orderId } }),
  getCallCenterOrders: (): Promise<TypedAxiosResponse<OrderResponse[]>> => 
    apiClient.get(`/shop/orders/call-center`),
  updateOrderLocation: (
    orderId: string, 
    payload: { city?: string; region?: string; order_comment?: string; status?: string; }
  ): Promise<TypedAxiosResponse<OrderResponse>> =>
    apiClient.put(`/shop/order/${orderId}/location`, payload),
  // Referral links
  getReferrals: (): Promise<TypedAxiosResponse<ReferralResponse[]>> => 
    apiClient.get(`/shop/referral`),
  createReferral: (payload: CreateReferralRequest): Promise<TypedAxiosResponse<ReferralResponse>> => 
    apiClient.post(`/shop/referral`, payload),
  deleteReferral: (referralId: string): Promise<TypedAxiosResponse<{ message: string }>> => 
    apiClient.delete(`/shop/referral/${referralId}`),
};

export const authAPI = {
  signin: (phone: string, password: string): Promise<TypedAxiosResponse<AuthResponse>> => {
    // Подробное логирование для отладки
    console.log("=== SIGNIN DEBUG START ===");
    console.log("1. Параметры функции:", { 
      phone: phone, 
      password: password ? "***" : undefined,
      phoneType: typeof phone,
      passwordType: typeof password,
      phoneLength: phone?.length,
      passwordLength: password?.length
    });

    // Проверяем, что данные не undefined
    if (!phone || !password) {
      console.error("❌ Missing phone or password", { 
        phone: phone, 
        password: password ? "***" : undefined,
        phoneExists: !!phone,
        passwordExists: !!password
      });
      logger.error("Missing phone or password", { phone: !!phone, password: !!password });
      throw new Error("Phone and password are required");
    }

    // Используем URLSearchParams для form-urlencoded формата
    const formData = new URLSearchParams();
    console.log("2. Создан URLSearchParams, добавляем данные...");
    
    formData.append("phone", phone);
    formData.append("password", password);
    
    console.log("3. Данные добавлены в formData:");
    console.log("   - phone:", formData.get("phone"));
    console.log("   - password:", formData.get("password") ? "***" : "undefined");
    console.log("   - formData.toString():", formData.toString().replace(/password=[^&]*/, 'password=***'));

    logger.debug("Form data prepared", { 
      phone: formData.get("phone")?.substring(0, 4) + '***', 
      hasPassword: !!formData.get("password") 
    });

    console.log("4. Отправляем запрос с formData объектом");
    console.log("=== SIGNIN DEBUG END ===");

    // Передаем URLSearchParams объект напрямую - Axios автоматически преобразует его
    return apiClient.post("/auth/signin", formData, {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
    });
  },

  signup: (phone: string, password: string): Promise<TypedAxiosResponse<AuthResponse>> => {
    logger.debug("API signup called", { phone: phone?.substring(0, 4) + '***', hasPassword: !!password });

    // Проверяем, что данные не undefined
    if (!phone || !password) {
      logger.error("Missing phone or password", { phone: !!phone, password: !!password });
      throw new Error("Phone and password are required");
    }

    // Используем URLSearchParams для form-urlencoded формата
    const formData = new URLSearchParams();
    formData.append("phone", phone);
    formData.append("password", password);

    // Передаем URLSearchParams объект напрямую - Axios автоматически преобразует его
    return apiClient.post("/auth/signup", formData, {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
    });
  },

  sendCode: (phone: string): Promise<TypedAxiosResponse<{ message: string }>> => {
    logger.debug("API sendCode called", { phone: phone?.substring(0, 4) + '***' });

    if (!phone) {
      logger.error("Missing phone");
      throw new Error("Phone is required");
    }

    const formData = new URLSearchParams();
    formData.append("phone", phone);

    // Передаем URLSearchParams объект напрямую
    return apiClient.post("/auth/send-code", formData, {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
    });
  },

  verifyCode: (phone: string, code: string): Promise<TypedAxiosResponse<AuthResponse>> => {
    logger.debug("API verifyCode called", { phone: phone?.substring(0, 4) + '***' });

    if (!phone || !code) {
      logger.error("Missing phone or code", { phone: !!phone, code: !!code });
      throw new Error("Phone and code are required");
    }

    const formData = new URLSearchParams();
    formData.append("phone", phone);
    formData.append("code", code);

    // Передаем URLSearchParams объект напрямую
    return apiClient.post("/auth/verify-code", formData, {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
    });
  },

  refreshToken: (refreshToken: string): Promise<TypedAxiosResponse<RefreshTokenResponse>> =>
    apiClient.post("/auth/refresh", { refresh_token: refreshToken }),
  logout: (): Promise<TypedAxiosResponse<{ message: string }>> => apiClient.post("/auth/logout"),
};

export const userAPI = {
  getProfile: (() => {
    let cached: { time: number; response: TypedAxiosResponse<UserProfile>; promise: Promise<TypedAxiosResponse<UserProfile>> | null } | null = null;
    const TTL = 60_000; // 1 minute
    return (): Promise<TypedAxiosResponse<UserProfile>> => {
      const now = Date.now();
      if (cached && cached.response && (now - cached.time) < TTL) {
        return Promise.resolve(cached.response);
      }
      if (cached && cached.promise) {
        return cached.promise;
      }
      const promise = apiClient.get("/profile").then((res) => {
        if (cached) {
          cached.time = Date.now();
          cached.response = res as TypedAxiosResponse<UserProfile>;
          cached.promise = null;
        }
        return res as TypedAxiosResponse<UserProfile>;
      }).catch((e) => {
        cached = null;
        throw e;
      });
      cached = { time: 0, response: null as unknown as TypedAxiosResponse<UserProfile>, promise };
      return promise;
    };
  })(),
  getUsersInfo: (): Promise<TypedAxiosResponse<UserProfile>> => apiClient.get("/profile/user-info"),
  getUserById: (userId: string): Promise<TypedAxiosResponse<UserProfile>> => apiClient.get(`/users/${userId}`),
  listUsers: (params: Record<string, unknown> = {}): Promise<TypedPaginatedResponse<UserProfile>> => 
    apiClient.get("/users/", { params }),
  updateUserRole: (userId: string, role: string): Promise<TypedAxiosResponse<UserProfile>> => 
    apiClient.patch(`/users/${userId}/role`, { role }),
  updateProfile: (data: UpdateProfileRequest): Promise<TypedAxiosResponse<UserProfile>> => {
    logger.debug("API updateProfile called", { fields: Object.keys(data) });

    const formData = new URLSearchParams();

    // Добавляем только те поля, которые есть в данных
    if (data.first_name !== undefined) {
      formData.append("first_name", data.first_name);
    }
    if (data.last_name !== undefined) {
      formData.append("last_name", data.last_name);
    }
    if (data.email !== undefined) {
      formData.append("email", data.email);
    }
    if (data.bio !== undefined) {
      formData.append("bio", data.bio);
    }
    if (data.location !== undefined) {
      formData.append("location", data.location);
    }

    return apiClient.put("/profile/update", formData, {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
    });
  },
  getBalance: (): Promise<TypedAxiosResponse<{ balance: number }>> =>
    apiClient.get("/profile/balance"),
  updateUserData: (data: Partial<UserProfile>): Promise<TypedAxiosResponse<UserProfile>> =>
    apiClient.patch("/profile", data),
};

export const cartAPI = {
  getCart: (): Promise<TypedAxiosResponse<CartItemResponse[]>> => apiClient.get("/cart"),
  addToCart: (
    productId: string,
    variantId?: string,
    quantity: number = 1
  ): Promise<TypedAxiosResponse<CartItemResponse>> =>
    apiClient.post("/cart/items", { productId, variantId, quantity }),
  removeFromCart: (itemId: string): Promise<TypedAxiosResponse<void>> =>
    apiClient.delete(`/cart/items/${itemId}`),
  updateCartItem: (
    itemId: string,
    quantity: number
  ): Promise<TypedAxiosResponse<CartItemResponse>> =>
    apiClient.put(`/cart/items/${itemId}`, { quantity }),
};

export const orderAPI = {
  getOrders: (): Promise<TypedAxiosResponse<OrderResponse[]>> => apiClient.get("/orders"),
  createOrder: (orderData: CreateOrderRequest): Promise<TypedAxiosResponse<OrderResponse>> =>
    apiClient.post("/orders", orderData),
  getOrderById: (orderId: string): Promise<TypedAxiosResponse<OrderResponse>> =>
    apiClient.get(`/orders/${orderId}`),
};

// Payments
export const paymentAPI = {
  getUserBalance: (): Promise<TypedAxiosResponse<{ balance: number }>> => 
    apiClient.get("/payment/get_user_balance"),
};

export default apiClient;
