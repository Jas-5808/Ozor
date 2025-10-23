import { AxiosResponse } from "axios";
import apiClient from "./index";
import { User } from "../types";

export interface UpdateProfileRequest {
  first_name?: string;
  last_name?: string;
  email?: string;
  bio?: string;
  location?: string;
}

export interface BalanceResponse {
  balance: number;
}

export const userAPI = {
  getProfile: (): Promise<AxiosResponse<User>> => apiClient.get("/profile"),

  updateProfile: (data: UpdateProfileRequest): Promise<AxiosResponse<User>> => {
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

  getBalance: (): Promise<AxiosResponse<BalanceResponse>> =>
    apiClient.get("/profile/balance"),

  updateUserData: (data: Partial<User>): Promise<AxiosResponse<User>> =>
    apiClient.patch("/profile", data),
};
