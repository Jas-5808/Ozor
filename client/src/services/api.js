import axios from "axios";
import { config } from "../utils/config";

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
    console.error("API Error:", error.response?.status, error.response?.data, error.config?.url);
    return Promise.reject(error);
  }
);

export const shopAPI = {
  getProducts: (params = {}) => apiClient.get("/shop/products", { params }),
  getProductById: (id) => apiClient.get(`/shop/product/${id}`),
  getProductsByCategory: (categoryId, params = {}) =>
    apiClient.get(`/shop/products`, { params: { category: categoryId, ...params } }),
  getCategories: () => apiClient.get("/shop/categories"),
  createCategory: (payload) => apiClient.post("/shop/category", payload),
  getCategoryById: (categoryId) =>
    apiClient.get(`/shop/category/${categoryId}`),
  // Расширенный метод для получения всех вариантов товара
  getAllProductVariants: (productId) => 
    apiClient.get(`/shop/products`, { params: { product_id: productId } }),
  guestOrder: (payload) => apiClient.post(`/shop/guest/order`, payload),
  getAllOrders: () => apiClient.get(`/shop/orders/all`),
  // Referral links
  getReferrals: () => apiClient.get(`/shop/referral`),
  createReferral: (payload) => apiClient.post(`/shop/referral`, payload),
  deleteReferral: (referralId) => apiClient.delete(`/shop/referral/${referralId}`),
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

// Payments
export const paymentAPI = {
  getUserBalance: () => apiClient.get("/payment/get_user_balance"),
};

export default apiClient;
