import axios, { AxiosResponse } from "axios";
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

const API_BASE_URL = config.api.baseUrl;
const API_TIMEOUT = config.api.timeout;

console.log("API Configuration:", { API_BASE_URL, API_TIMEOUT });

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
    console.log("Отправляем запрос:", config.method?.toUpperCase(), fullUrl);
    const token = localStorage.getItem("access_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

apiClient.interceptors.response.use(
  (response) => {
    console.log("Получен ответ:", response.status, response.config.url);
    return response;
  },
  (error) => {
    console.error(
      "API Error:",
      error.response?.status,
      error.response?.data,
      error.config?.url
    );
    return Promise.reject(error);
  }
);

export const shopAPI = {
  getProducts: (params = {}) => apiClient.get("/shop/products", { params }),
  getProductById: (id) => apiClient.get(`/shop/product/${id}`),
  getProductsByCategory: (categoryId, params = {}) =>
    apiClient.get(`/shop/products`, { params: { category: categoryId, ...params } }),
  getCategories: (() => {
    // simple in-memory cache with TTL
    let cached = null; // { time: number, response: any, promise: Promise<any> | null }
    const TTL = 180_000; // 3 minutes
    return () => {
      const now = Date.now();
      if (cached && cached.response && (now - cached.time) < TTL) {
        return Promise.resolve(cached.response);
      }
      if (cached && cached.promise) {
        return cached.promise;
      }
      const promise = apiClient.get("/shop/categories").then((res) => {
        cached = { time: Date.now(), response: res, promise: null };
        return res;
      }).catch((e) => {
        // do not lock on error
        cached = null;
        throw e;
      });
      cached = { time: 0, response: null, promise };
      return promise;
    };
  })(),
  createCategory: (payload) => apiClient.post("/shop/category", payload),
  getCategoryById: (categoryId) =>
    apiClient.get(`/shop/category/${categoryId}`),
  // Расширенный метод для получения всех вариантов товара
  getAllProductVariants: (() => {
    const cache = new Map(); // key: productId -> { time, response, promise }
    const TTL = 180_000; // 3 minutes
    return (productId) => {
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
        cache.set(key, { time: Date.now(), response: res, promise: null });
        return res;
      }).catch((e) => {
        cache.delete(key);
        throw e;
      });
      cache.set(key, { time: 0, response: null, promise });
      return promise;
    };
  })(),
  guestOrder: (payload) => apiClient.post(`/shop/guest/order`, payload),
  getAllOrders: () => apiClient.get(`/shop/orders/all`),
  // Referral links
  getReferrals: () => apiClient.get(`/shop/referral`),
  createReferral: (payload) => apiClient.post(`/shop/referral`, payload),
  deleteReferral: (referralId) => apiClient.delete(`/shop/referral/${referralId}`),
};

export const authAPI = {
  signin: (phone: string, password: string): Promise<AxiosResponse<any>> => {
    console.log("API signin вызван с:", { phone, password });

    const formData = new URLSearchParams();
    formData.append("phone", phone);
    formData.append("password", password);

    return apiClient.post("/auth/signin", formData, {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
    });
  },

  signup: (phone: string, password: string): Promise<AxiosResponse<any>> => {
    console.log("API signup вызван с:", { phone, password });

    const formData = new URLSearchParams();
    formData.append("phone", phone);
    formData.append("password", password);

    return apiClient.post("/auth/signup", formData, {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
    });
  },

  sendCode: (phone: string): Promise<AxiosResponse<any>> => {
    console.log("API sendCode вызван с:", { phone });

    const formData = new URLSearchParams();
    formData.append("phone", phone);

    return apiClient.post("/auth/send-code", formData, {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
    });
  },

  verifyCode: (phone: string, code: string): Promise<AxiosResponse<any>> => {
    console.log("API verifyCode вызван с:", { phone, code });

    const formData = new URLSearchParams();
    formData.append("phone", phone);
    formData.append("code", code);

    return apiClient.post("/auth/verify-code", formData, {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
    });
  },

  refreshToken: (refreshToken: string): Promise<AxiosResponse<any>> =>
    apiClient.post("/auth/refresh", { refresh_token: refreshToken }),
  logout: (): Promise<AxiosResponse<any>> => apiClient.post("/auth/logout"),
};

export const userAPI = {
  getProfile: (() => {
    let cached = null; // { time, response, promise }
    const TTL = 60_000; // 1 minute
    return () => {
      const now = Date.now();
      if (cached && cached.response && (now - cached.time) < TTL) {
        return Promise.resolve(cached.response);
      }
      if (cached && cached.promise) {
        return cached.promise;
      }
      const promise = apiClient.get("/profile").then((res) => {
        cached = { time: Date.now(), response: res, promise: null };
        return res;
      }).catch((e) => {
        cached = null;
        throw e;
      });
      cached = { time: 0, response: null, promise };
      return promise;
    };
  })(),
  getUsersInfo: () => apiClient.get("/profile/user-info"),
  listUsers: (params = {}) => apiClient.get("/users/", { params }),
  updateUserRole: (userId, role) => apiClient.patch(`/users/${userId}/role`, { role }),
  updateProfile: (data) => {
    console.log("API updateProfile вызван с:", data);

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
  getBalance: (): Promise<AxiosResponse<{ balance: number }>> =>
    apiClient.get("/profile/balance"),
  updateUserData: (data: Partial<User>): Promise<AxiosResponse<User>> =>
    apiClient.patch("/profile", data),
};

export const cartAPI = {
  getCart: (): Promise<AxiosResponse<CartItem[]>> => apiClient.get("/cart"),
  addToCart: (
    productId: string,
    quantity: number = 1
  ): Promise<AxiosResponse<CartItem>> =>
    apiClient.post("/cart/items", { productId, quantity }),
  removeFromCart: (itemId: string): Promise<AxiosResponse<void>> =>
    apiClient.delete(`/cart/items/${itemId}`),
  updateCartItem: (
    itemId: string,
    quantity: number
  ): Promise<AxiosResponse<CartItem>> =>
    apiClient.put(`/cart/items/${itemId}`, { quantity }),
};

export const orderAPI = {
  getOrders: (): Promise<AxiosResponse<Order[]>> => apiClient.get("/orders"),
  createOrder: (orderData: Partial<Order>): Promise<AxiosResponse<Order>> =>
    apiClient.post("/orders", orderData),
  getOrderById: (orderId: string): Promise<AxiosResponse<Order>> =>
    apiClient.get(`/orders/${orderId}`),
};

// Payments
export const paymentAPI = {
  getUserBalance: () => apiClient.get("/payment/get_user_balance"),
};

export default apiClient;
