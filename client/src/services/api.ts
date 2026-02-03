import axios from "axios";
import type { AxiosError, AxiosRequestConfig } from "axios";
import { config } from "../utils/config";
import type {
  AuthResponse,
  RefreshTokenResponse,
  UserProfile,
  UpdateProfileRequest,
  ProductResponse,
  ProductDetailResponse,
  CategoryResponse,
  CartItemResponse,
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
type AxiosGet = typeof apiClient.get;
const inflightGet = new Map<string, ReturnType<AxiosGet>>();
const stableStringify = (value: unknown): string => {
  if (value === null || typeof value !== 'object') {
    return String(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(',')}]`;
  }
  const record = value as Record<string, unknown>;
  const keys = Object.keys(record).sort();
  return `{${keys
    .map((key) => `${JSON.stringify(key)}:${stableStringify(record[key])}`)
    .join(',')}}`;
};
const originalGet: AxiosGet = apiClient.get.bind(apiClient);
apiClient.get = ((url, config) => {
  const safeConfig: AxiosRequestConfig = config ?? {};
  try {
    const paramsKey = stableStringify(safeConfig.params ?? {});
    const baseKey = safeConfig.baseURL || apiClient.defaults.baseURL || "";
    const headersKey = stableStringify(safeConfig.headers ?? {});
    const authToken =
      typeof localStorage !== "undefined" ? localStorage.getItem("access_token") || "" : "";
    const responseType = (safeConfig as { responseType?: string }).responseType ?? "json";
    const key = `${baseKey}${url}?${paramsKey}|headers:${headersKey}|token:${authToken}|responseType:${responseType}`;
    const cached = inflightGet.get(key);
    if (cached) {
      return cached;
    }
    const promise = originalGet(url, safeConfig);
    inflightGet.set(key, promise);
    const cleanup = () => inflightGet.delete(key);
    promise.then(cleanup).catch(cleanup);
    return promise;
  } catch {
    return originalGet(url, safeConfig);
  }
}) as AxiosGet;

apiClient.interceptors.request.use(
  (config) => {
    const fullUrl = `${config.baseURL}${config.url}`;
    
    // NOTE: avoid noisy request-debug logging in runtime; keep only structured logger usage.
    logger.api(config.method?.toUpperCase() || 'UNKNOWN', fullUrl);
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

// Flag to avoid infinite refresh loops
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
    logger.apiResponse(response.status, response.config.url || '');
    return response;
  },
  async (error: AxiosError<ApiErrorResponse>) => {
    const originalRequest = error.config as typeof error.config & { _retry?: boolean };
    
    // Handle 401 responses (except refresh requests)
    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        // If refresh in progress — queue the request
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
        // Redirect to sign-in page
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
        
        // Redirect to sign-in page
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

const categoryByIdCache = new Map<
  string,
  {
    time: number;
    response: TypedAxiosResponse<any>;
    promise: Promise<TypedAxiosResponse<any>> | null;
  }
>();
const CATEGORY_BY_ID_TTL = 120_000; // 2 minutes

const fetchCategoryById = (categoryId: string): Promise<TypedAxiosResponse<any>> => {
  const key = String(categoryId || "");
  if (!key) {
    return Promise.resolve({ data: null } as unknown as TypedAxiosResponse<any>);
  }
  const now = Date.now();
  const entry = categoryByIdCache.get(key);
  if (entry && entry.response && now - entry.time < CATEGORY_BY_ID_TTL) {
    return Promise.resolve(entry.response);
  }
  if (entry && entry.promise) {
    return entry.promise;
  }
  const promise = apiClient
    .get(`/shop/category/${key}`)
    .then((res) => {
      const typedRes = res as TypedAxiosResponse<any>;
      categoryByIdCache.set(key, { time: Date.now(), response: typedRes, promise: null });
      return typedRes;
    })
    .catch((e) => {
      categoryByIdCache.delete(key);
      throw e;
    });
  categoryByIdCache.set(key, { time: 0, response: null as unknown as TypedAxiosResponse<any>, promise });
  return promise;
};

export const shopAPI = {
  getProducts: (params: Record<string, unknown> = {}): Promise<TypedAxiosResponse<ProductResponse[]>> => 
    apiClient.get("/shop/products", { params }),
  searchProducts: (
    query: string, 
    params: { offset?: number; limit?: number } = {}
  ): Promise<TypedAxiosResponse<ProductResponse[]>> => 
    apiClient.get("/shop/products/search", { params: { q: query, ...params } }),
  getSimilarProducts: (
    q?: string,
    limit: number = 12
  ): Promise<TypedAxiosResponse<ProductResponse[]>> =>
    apiClient.get("/shop/products/similar", { params: q ? { q, limit } : { limit } }),
  getProductById: (id: string): Promise<TypedAxiosResponse<ProductDetailResponse>> => 
    apiClient.get(`/shop/product/${id}`),
  getProductsByIds: (ids: string[]): Promise<TypedAxiosResponse<ProductDetailResponse[]>> =>
    apiClient.post("/shop/products/batch", { ids }),
  getProductsByCategory: (() => {
    const cache = new Map<
      string,
      {
        time: number;
        response: TypedAxiosResponse<ProductResponse[]>;
        promise: Promise<TypedAxiosResponse<ProductResponse[]>> | null;
      }
    >();
    const TTL = 120_000; // 2 minutes
    return (
      categoryId: string,
      params: Record<string, unknown> = {}
    ): Promise<TypedAxiosResponse<ProductResponse[]>> => {
      const key = `${String(categoryId || "")}:${JSON.stringify(params || {})}`;
      const now = Date.now();
      const entry = cache.get(key);
      if (entry && entry.response && now - entry.time < TTL) {
        return Promise.resolve(entry.response);
      }
      if (entry && entry.promise) {
        return entry.promise;
      }
      const hasParams = params && Object.keys(params).length > 0;
      const request = hasParams
        ? apiClient.get(`/shop/category/${categoryId}`, { params })
        : fetchCategoryById(String(categoryId || ""));
      const promise = request
        .then((res) => {
          const payload = (res as any)?.data ?? res;
          const data = payload?.data ?? payload;
          const products = Array.isArray(data?.products)
            ? data.products
            : Array.isArray(data?.data)
            ? data.data
            : Array.isArray(data)
            ? data
            : [];
          const typedRes = { ...(res as any), data: products } as TypedAxiosResponse<ProductResponse[]>;
          cache.set(key, { time: Date.now(), response: typedRes, promise: null });
          return typedRes;
        })
        .catch((e) => {
          cache.delete(key);
          throw e;
        });
      cache.set(key, { time: 0, response: null as unknown as TypedAxiosResponse<ProductResponse[]>, promise });
      return promise;
    };
  })(),
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
    fetchCategoryById(categoryId) as Promise<TypedAxiosResponse<CategoryResponse>>,
  getOrdersStats: (): Promise<
    TypedAxiosResponse<{
      total: number;
      avg: number;
      sum: number;
      pending: number;
      recent?: Array<{
        id: string | number;
        name: string;
        client: string;
        status: string;
        sum: number;
        date: string;
      }>;
    }>
  > => apiClient.get("/admin/dashboard/orders-stats"),
  getWarehouseStats: (): Promise<
    TypedAxiosResponse<{
      total: number;
      low: number;
      out: number;
      amount: number;
    }>
  > => apiClient.get("/admin/dashboard/warehouse-stats"),
  // Extended method for fetching product variants
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
    // Ensure both fields are provided
    if (!phone || !password) {
      logger.error("Missing phone or password", { phone: !!phone, password: !!password });
      throw new Error("Phone and password are required");
    }

    // Build URLSearchParams payload
    const formData = new URLSearchParams();
    formData.append("phone", phone);
    formData.append("password", password);

    logger.debug("Form data prepared", { 
      phone: formData.get("phone")?.substring(0, 4) + '***', 
      hasPassword: !!formData.get("password") 
    });

    // Axios will serialize the URLSearchParams payload automatically
    return apiClient.post("/auth/signin", formData, {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
    });
  },

  signup: (phone: string, password: string): Promise<TypedAxiosResponse<AuthResponse>> => {
    logger.debug("API signup called", { phone: phone?.substring(0, 4) + '***', hasPassword: !!password });

    // Ensure payload is defined
    if (!phone || !password) {
      logger.error("Missing phone or password", { phone: !!phone, password: !!password });
      throw new Error("Phone and password are required");
    }

    // Build URLSearchParams payload
    const formData = new URLSearchParams();
    formData.append("phone", phone);
    formData.append("password", password);

    // Axios will serialize the URLSearchParams payload automatically
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

    // Axios will serialize the URLSearchParams payload automatically
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

    // Axios will serialize the URLSearchParams payload automatically
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

    // Append only provided fields
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
  updateStatus: (orderId: string, status: string): Promise<TypedAxiosResponse<any>> =>
    apiClient.put(`/shop/order/${orderId}/status`, { status }),
};

export const warehouseAPI = {
  getOrders: (
    params: { offset?: number; limit?: number; status?: string } = {}
  ): Promise<TypedAxiosResponse<any>> => apiClient.get("/warehouse/orders", { params }),
  getOrdersStatsByCity: (): Promise<TypedAxiosResponse<Array<{ order_region: string; count: number }>>> =>
    apiClient.get("/warehouse/orders-stats-by-city"),
  getRequestsStatsByCity: (): Promise<TypedAxiosResponse<Array<{ order_region: string; count: number }>>> =>
    apiClient.get("/warehouse/requests-stats-by-city"),
  submitOrder: (orderId: string): Promise<TypedAxiosResponse<any>> =>
    apiClient.post("/warehouse/submit", { order_id: orderId }),
  getMyOrders: (
    params: { offset?: number; limit?: number } = {}
  ): Promise<TypedAxiosResponse<any>> => apiClient.get("/warehouse/my-orders", { params }),
  getLocations: (
    params: { filter?: string } = {}
  ): Promise<TypedAxiosResponse<any>> => apiClient.get("/warehouse/locations", { params }),
  /** Скачать PDF-этикетку заказа 10x6 см для склада */
  downloadOrderLabelPdf: async (orderId: string): Promise<void> => {
    const res = await apiClient.get(`/warehouse/order/${orderId}/label-pdf`, { responseType: "blob" });
    const blob = (res as any).data as Blob;
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `order-${orderId}-label.pdf`;
    a.click();
    window.URL.revokeObjectURL(url);
  },
  /** Сразу открыть диалог печати с PDF-этикеткой заказа. Promise резолвится после закрытия диалога печати (afterprint) или по таймауту. */
  printOrderLabelPdf: (orderId: string): Promise<void> => {
    const baseUrl = (apiClient.defaults.baseURL || "").replace(/\/$/, "");
    const fullUrl = `${baseUrl}/warehouse/order/${encodeURIComponent(String(orderId))}/label-pdf`;
    const token = typeof localStorage !== "undefined" ? localStorage.getItem("access_token") : null;
    const headers: Record<string, string> = {};
    if (token) headers.Authorization = `Bearer ${token}`;

    return fetch(fullUrl, { method: "GET", headers })
      .then((response) => {
        if (!response.ok) return response.text().then((text) => { throw new Error(text || `HTTP ${response.status}`); });
        return response.blob();
      })
      .then((blob) => {
        return new Promise<void>((resolve) => {
          const url = window.URL.createObjectURL(blob);
          const iframe = document.createElement("iframe");
          iframe.style.cssText = "position:fixed;width:0;height:0;border:none;";
          const cleanup = () => {
            try {
              document.body.removeChild(iframe);
            } catch {
              // ignore
            }
            window.URL.revokeObjectURL(url);
            resolve();
          };
          const PRINT_DONE_TIMEOUT_MS = 60000;
          let done = false;
          const onDone = () => {
            if (done) return;
            done = true;
            cleanup();
          };
          iframe.onload = () => {
            const win = iframe.contentWindow;
            if (win) {
              win.addEventListener("afterprint", onDone, { once: true });
              win.print();
            } else {
              onDone();
            }
            setTimeout(onDone, PRINT_DONE_TIMEOUT_MS);
          };
          iframe.src = url;
          document.body.appendChild(iframe);
        });
      });
  },
  /** Печать одного PDF с несколькими страницами (1 страница = 1 этикетка заказа). Один диалог печати. */
  printOrdersLabelsPdf: (orderIds: string[]): Promise<void> => {
    if (orderIds.length === 0) return Promise.resolve();
    const baseUrl = (apiClient.defaults.baseURL || "").replace(/\/$/, "");
    const idsParam = orderIds.map((id) => encodeURIComponent(String(id))).join(",");
    const fullUrl = `${baseUrl}/warehouse/labels-pdf?order_ids=${idsParam}`;
    const token = typeof localStorage !== "undefined" ? localStorage.getItem("access_token") : null;
    const headers: Record<string, string> = {};
    if (token) headers.Authorization = `Bearer ${token}`;

    return fetch(fullUrl, { method: "GET", headers })
      .then((response) => {
        if (!response.ok) return response.text().then((text) => { throw new Error(text || `HTTP ${response.status}`); });
        return response.blob();
      })
      .then((blob) => {
        return new Promise<void>((resolve) => {
          const url = window.URL.createObjectURL(blob);
          const iframe = document.createElement("iframe");
          iframe.style.cssText = "position:fixed;width:0;height:0;border:none;";
          const cleanup = () => {
            try {
              document.body.removeChild(iframe);
            } catch {
              // ignore
            }
            window.URL.revokeObjectURL(url);
            resolve();
          };
          const PRINT_DONE_TIMEOUT_MS = 60000;
          let done = false;
          const onDone = () => {
            if (done) return;
            done = true;
            cleanup();
          };
          iframe.onload = () => {
            const win = iframe.contentWindow;
            if (win) {
              win.addEventListener("afterprint", onDone, { once: true });
              win.print();
            } else {
              onDone();
            }
            setTimeout(onDone, PRINT_DONE_TIMEOUT_MS);
          };
          iframe.src = url;
          document.body.appendChild(iframe);
        });
      });
  },
  /** Скачать PDF упакованных заказов по городу и дате (GET /warehouse/packed-orders-pdf?city=...&date=...) */
  downloadPackedOrdersPdf: async (city: string, date: string): Promise<void> => {
    const res = await apiClient.get("/warehouse/packed-orders-pdf", {
      params: { city, date },
      responseType: "blob",
    });
    const blob = (res as any).data as Blob;
    const disposition = (res as any).headers?.["content-disposition"];
    let filename = `packed-orders-${city}-${date}.pdf`;
    if (typeof disposition === "string" && disposition.includes("filename=")) {
      const m = disposition.match(/filename="?([^";\n]+)"?/);
      if (m?.[1]) filename = m[1].trim();
    }
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    window.URL.revokeObjectURL(url);
  },
  /** Печать PDF упакованных заказов по городу и дате */
  printPackedOrdersPdf: (city: string, date: string): Promise<void> => {
    const baseUrl = (apiClient.defaults.baseURL || "").replace(/\/$/, "");
    const fullUrl = `${baseUrl}/warehouse/packed-orders-pdf?city=${encodeURIComponent(city)}&date=${encodeURIComponent(date)}`;
    const token = typeof localStorage !== "undefined" ? localStorage.getItem("access_token") : null;
    const headers: Record<string, string> = {};
    if (token) headers.Authorization = `Bearer ${token}`;

    return fetch(fullUrl, { method: "GET", headers })
      .then((response) => {
        if (!response.ok) return response.text().then((text) => { throw new Error(text || `HTTP ${response.status}`); });
        return response.blob();
      })
      .then((blob) => {
        return new Promise<void>((resolve) => {
          const url = window.URL.createObjectURL(blob);
          const iframe = document.createElement("iframe");
          iframe.style.cssText = "position:fixed;width:0;height:0;border:none;";
          const cleanup = () => {
            try { document.body.removeChild(iframe); } catch { /* ignore */ }
            window.URL.revokeObjectURL(url);
            resolve();
          };
          let done = false;
          const onDone = () => { if (done) return; done = true; cleanup(); };
          iframe.onload = () => {
            const win = iframe.contentWindow;
            if (win) {
              win.addEventListener("afterprint", onDone, { once: true });
              win.print();
            } else onDone();
            setTimeout(onDone, 60000);
          };
          iframe.src = url;
          document.body.appendChild(iframe);
        });
      });
  },
};

// Payments
export const paymentAPI = {
  getUserBalance: (): Promise<TypedAxiosResponse<{ balance: number }>> => 
    apiClient.get("/payment/get_user_balance"),
  getBalanceSummary: (): Promise<TypedAxiosResponse<{
    total_balance: number;
    available_balance: number;
    total_credits: number;
    total_debits: number;
    active_holds: number;
    referral_pending: number;
    referral_active: number;
    referral_cancelled: number;
    referral_paid: number;
    recent_transactions: Array<{
      id: string;
      amount: number;
      type: string;
      status: string;
      description?: string | null;
      created_at: string;
      referral_id?: string | null;
      order_item_id?: string | null;
      referral_status?: string | null;
      activated_at?: string | null;
      cancelled_at?: string | null;
      referral_code?: string | null;
      product_name?: string | null;
      order_number?: string | null;
    }>;
    total_transactions: number;
    total_referral_transactions: number;
  }>> => apiClient.get("/payment/balance"),
  createWithdrawal: (payload: { amount: number; card_number: string; card_holder_name: string; description?: string }): Promise<TypedAxiosResponse<{ id: string; status: string; created_at: string }>> => {
    const description = (payload.description ?? "").trim() || "string";
    return apiClient.post("/payment/statements", { ...payload, description });
  },
  createStatement: (payload: { amount: number; card_number: string; card_holder_name: string; description?: string }): Promise<TypedAxiosResponse<{
    id: string;
    user_id: string;
    card_holder_name: string;
    card_number: string;
    amount: number;
    type: string;
    description?: string;
    image?: string | null;
    created_at: string;
    updated_at: string;
  }>> => {
    const description = (payload.description ?? "").trim() || "string";
    return apiClient.post("/payment/statements", { ...payload, description });
  },
  getWithdrawals: (): Promise<TypedAxiosResponse<Array<{ id: string; amount: number; card_number: string; cardholder_name: string; status: string; created_at: string; updated_at?: string }>>> =>
    apiClient.get("/payment/withdrawals"),
  getStatements: (params: { status?: string; offset?: number; limit?: number } = {}): Promise<TypedAxiosResponse<{
    items: Array<{
      id: string;
      user_id: string;
      card_holder_name: string;
      card_number: string;
      amount: number;
      status: string;
      type?: string;
      description?: string;
      image?: string | null;
      created_at: string;
      updated_at: string;
    }>;
    total: number;
    offset: number;
    limit: number;
  }>> => apiClient.get("/payment/statements/my", { params }),
};

export default apiClient;
