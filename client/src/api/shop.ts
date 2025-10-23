import { AxiosResponse } from "axios";
import apiClient from "./index";
import { Product, Category } from "../types";

export interface ProductFilters {
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  search?: string;
  sortBy?: "price" | "name" | "createdAt";
  sortOrder?: "asc" | "desc";
}

export const shopAPI = {
  getProducts: (
    params: ProductFilters = {}
  ): Promise<AxiosResponse<Product[]>> =>
    apiClient.get("/shop/products", { params }),

  getProductById: (id: string): Promise<AxiosResponse<Product>> =>
    apiClient.get(`/shop/product/${id}`),

  getProductsByCategory: (
    categoryId: string,
    params: ProductFilters = {}
  ): Promise<AxiosResponse<Product[]>> =>
    apiClient.get(`/shop/products`, {
      params: { category: categoryId, ...params },
    }),

  getCategories: (): Promise<AxiosResponse<Category[]>> =>
    apiClient.get("/shop/categories"),

  getCategoryById: (categoryId: string): Promise<AxiosResponse<Category>> =>
    apiClient.get(`/shop/category/${categoryId}`),

  getAllProductVariants: (
    productId: string
  ): Promise<AxiosResponse<Product[]>> =>
    apiClient.get(`/shop/products`, { params: { product_id: productId } }),
};
