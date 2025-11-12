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
    
    // Подробное логирование для POST запросов на signin
    if (config.method?.toUpperCase() === 'POST' && config.url?.includes('/auth/signin')) {
      console.log("=== API index.ts REQUEST INTERCEPTOR DEBUG ===");
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
      console.log("=== API index.ts REQUEST INTERCEPTOR DEBUG END ===");
    }
    
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
