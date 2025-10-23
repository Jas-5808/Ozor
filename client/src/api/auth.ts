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
  signin: (data: SigninRequest): Promise<AxiosResponse<AuthResponse>> => {
    console.log("API signin вызван с:", data);

    const formData = new URLSearchParams();
    formData.append("phone", data.phone);
    formData.append("password", data.password);

    return apiClient.post("/auth/signin", formData, {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
    });
  },

  signup: (data: SignupRequest): Promise<AxiosResponse<AuthResponse>> => {
    console.log("API signup вызван с:", data);

    const formData = new URLSearchParams();
    formData.append("phone", data.phone);
    formData.append("password", data.password);

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
