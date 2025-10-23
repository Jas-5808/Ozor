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
    console.error(
      "API Error:",
      error.response?.status,
      error.response?.data,
      error.config?.url
    );
    return Promise.reject(error);
  }
);

// Export all API modules
export { authAPI } from "./auth";
export { shopAPI } from "./shop";
export { userAPI } from "./user";
export { cartAPI } from "./cart";
export { orderAPI } from "./orders";

export default apiClient;
