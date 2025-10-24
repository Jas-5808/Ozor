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
  getProducts: (
    params: Record<string, any> = {}
  ): Promise<AxiosResponse<Product[]>> =>
    apiClient.get("/shop/products", { params }),
  getProductById: (id: string): Promise<AxiosResponse<Product>> =>
    apiClient.get(`/shop/product/${id}`),
  getProductsByCategory: (
    categoryId: string,
    params: Record<string, any> = {}
  ): Promise<AxiosResponse<Product[]>> =>
    apiClient.get(`/shop/products`, {
      params: { category: categoryId, ...params },
    }),
  getCategories: (): Promise<AxiosResponse<Category[]>> =>
    apiClient.get("/shop/categories"),
  getCategoryById: (categoryId: string): Promise<AxiosResponse<Category>> =>
    apiClient.get(`/shop/category/${categoryId}`),
  // Расширенный метод для получения всех вариантов товара
  getAllProductVariants: (
    productId: string
  ): Promise<AxiosResponse<Product[]>> =>
    apiClient.get(`/shop/products`, { params: { product_id: productId } }),
  guestOrder: (payload) => apiClient.post(`/shop/guest/order`, payload),
  getAllOrders: () => apiClient.get(`/shop/orders/all`),
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
  getProfile: () => apiClient.get("/profile"),
  getUsersInfo: () => apiClient.get("/profile/user-info"),
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

export default apiClient;
