import { AxiosResponse } from "axios";
import apiClient from "./index";
import { CartItem } from "../types";

export interface AddToCartRequest {
  productId: string;
  quantity: number;
}

export interface UpdateCartItemRequest {
  quantity: number;
}

export const cartAPI = {
  getCart: (): Promise<AxiosResponse<CartItem[]>> => apiClient.get("/cart"),

  addToCart: (data: AddToCartRequest): Promise<AxiosResponse<CartItem>> =>
    apiClient.post("/cart/items", data),

  removeFromCart: (itemId: string): Promise<AxiosResponse<void>> =>
    apiClient.delete(`/cart/items/${itemId}`),

  updateCartItem: (
    itemId: string,
    data: UpdateCartItemRequest
  ): Promise<AxiosResponse<CartItem>> =>
    apiClient.put(`/cart/items/${itemId}`, data),
};
