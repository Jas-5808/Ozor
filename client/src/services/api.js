import axios from "axios";
import { config } from "../utils/config";

const API_BASE_URL = config.api.baseUrl;
const API_TIMEOUT = config.api.timeout;

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
    return response;
  },
  (error) => {
    console.error("API Error:", error);
    return Promise.reject(error);
  }
);

export const shopAPI = {
  getProducts: () => apiClient.get("/shop/products"),
  getProductById: (id) => apiClient.get(`/shop/products/${id}`),
  getProductsByCategory: (categoryId) =>
    apiClient.get(`/shop/products?category=${categoryId}`),
  getCategories: () => apiClient.get("/shop/categories"),
  getCategoryById: (categoryId) =>
    apiClient.get(`/shop/category/${categoryId}`),
};

export const authAPI = {
  signin: (phone, password) => {
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

  signup: (phone, password) => {
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

  sendCode: (phone) => {
    console.log("API sendCode вызван с:", { phone });

    const formData = new URLSearchParams();
    formData.append("phone", phone);

    return apiClient.post("/auth/send-code", formData, {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
    });
  },

  verifyCode: (phone, code) => {
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

  refreshToken: (refreshToken) =>
    apiClient.post("/auth/refresh", { refresh_token: refreshToken }),
  logout: () => apiClient.post("/auth/logout"),
};

export const userAPI = {
  getProfile: () => apiClient.get("/profile"),
  updateProfile: (data) => apiClient.put("/profile", data),
  getBalance: () => apiClient.get("/profile/balance"),
  updateUserData: (data) => apiClient.patch("/profile", data),
};

export const cartAPI = {
  getCart: () => apiClient.get("/cart"),
  addToCart: (productId, quantity = 1) =>
    apiClient.post("/cart/items", { productId, quantity }),
  removeFromCart: (itemId) => apiClient.delete(`/cart/items/${itemId}`),
  updateCartItem: (itemId, quantity) =>
    apiClient.put(`/cart/items/${itemId}`, { quantity }),
};

export const orderAPI = {
  getOrders: () => apiClient.get("/orders"),
  createOrder: (orderData) => apiClient.post("/orders", orderData),
  getOrderById: (orderId) => apiClient.get(`/orders/${orderId}`),
};

export default apiClient;
