import { AxiosResponse } from "axios";
import apiClient from "./index";

export interface AuthResponse {
  access_token: string;
  refresh_token: string;
  user?: any;
}

export interface SigninRequest {
  phone: string;
  password: string;
}

export interface SignupRequest {
  phone: string;
  password: string;
}

export interface VerifyCodeRequest {
  phone: string;
  code: string;
}

export const authAPI = {
  signin: (phone: string, password: string): Promise<AxiosResponse<AuthResponse>> => {
    console.log("=== API auth.ts signin DEBUG ===");
    console.log("Получены параметры:", { 
      phone: phone, 
      password: password ? "***" : undefined,
      phoneType: typeof phone,
      passwordType: typeof password
    });

    // Проверяем, что данные не undefined
    if (!phone || !password) {
      console.error("❌ Missing phone or password", { 
        phone: phone, 
        password: password ? "***" : undefined,
        phoneExists: !!phone,
        passwordExists: !!password
      });
      throw new Error("Phone and password are required");
    }

    const formData = new URLSearchParams();
    formData.append("phone", phone);
    formData.append("password", password);

    console.log("Данные добавлены в formData:");
    console.log("   - phone:", formData.get("phone"));
    console.log("   - password:", formData.get("password") ? "***" : "undefined");
    console.log("   - formData.toString():", formData.toString().replace(/password=[^&]*/, 'password=***'));
    console.log("=== API auth.ts signin DEBUG END ===");

    return apiClient.post("/auth/signin", formData, {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
    });
  },

  signup: (phone: string, password: string): Promise<AxiosResponse<AuthResponse>> => {
    console.log("API signup вызван с:", { phone, password: password ? "***" : undefined });

    if (!phone || !password) {
      throw new Error("Phone and password are required");
    }

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

  verifyCode: (
    data: VerifyCodeRequest
  ): Promise<AxiosResponse<AuthResponse>> => {
    console.log("API verifyCode вызван с:", data);

    const formData = new URLSearchParams();
    formData.append("phone", data.phone);
    formData.append("code", data.code);

    return apiClient.post("/auth/verify-code", formData, {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
    });
  },

  refreshToken: (refreshToken: string): Promise<AxiosResponse<AuthResponse>> =>
    apiClient.post("/auth/refresh", { refresh_token: refreshToken }),

  logout: (): Promise<AxiosResponse<any>> => apiClient.post("/auth/logout"),
};
