import { AxiosResponse } from "axios";
import apiClient from "./index";
import { Order } from "../types";

export interface CreateOrderRequest {
  items: Array<{
    productId: string;
    quantity: number;
  }>;
  deliveryMethod?: "pickup" | "courier";
  deliveryAddress?: string;
  affiliateCode?: string;
}

export const orderAPI = {
  getOrders: (): Promise<AxiosResponse<Order[]>> => apiClient.get("/orders"),

  createOrder: (data: CreateOrderRequest): Promise<AxiosResponse<Order>> =>
    apiClient.post("/orders", data),

  getOrderById: (orderId: string): Promise<AxiosResponse<Order>> =>
    apiClient.get(`/orders/${orderId}`),
};
