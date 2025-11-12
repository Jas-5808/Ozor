import { useState, useEffect } from "react";
import { shopAPI } from "../api";
import { Product } from "../types";
import { logger } from "../utils/logger";
import { handleApiError, getUserFriendlyMessage } from "../utils/errorHandler";
export const useProducts = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const fetchProducts = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await shopAPI.getProducts();
      // Фильтруем товары: показываем только те, у которых есть цена (price > 0)
      const filteredProducts = response.data.filter(
        (product) => product.price && product.price > 0
      );
      setProducts(filteredProducts);
    } catch (error) {
      const appError = handleApiError(error);
      const errorMessage = getUserFriendlyMessage(appError) || "Ошибка при загрузке продуктов";
      setError(errorMessage);
      logger.errorWithContext(appError, { context: 'fetchProducts' });
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    let cancelled = false;
    fetchProducts().finally(()=>{ if (cancelled) return; });
    return ()=>{ cancelled = true; };
  }, []);
  const refetch = () => {
    fetchProducts();
  };
  return {
    products,
    loading,
    error,
    refetch,
  };
};
export const useProductById = (productId: string | undefined) => {
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const fetchProduct = async () => {
    if (!productId) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      setError(null);
      const response = await shopAPI.getProductById(productId);
      setProduct(response.data);
    } catch (error) {
      const appError = handleApiError(error);
      const errorMessage = getUserFriendlyMessage(appError) || "Ошибка при загрузке продукта";
      setError(errorMessage);
      logger.errorWithContext(appError, { context: 'fetchProduct' });
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    let cancelled = false;
    fetchProduct().finally(()=>{ if (cancelled) return; });
    return ()=>{ cancelled = true; };
  }, [productId]);
  return {
    product,
    loading,
    error,
    refetch: fetchProduct,
  };
};
export const useProductsByCategory = (categoryId: string | undefined) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const fetchProductsByCategory = async () => {
    if (!categoryId) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      setError(null);
      const response = await shopAPI.getProductsByCategory(categoryId);
      // Фильтруем товары: показываем только те, у которых есть цена (price > 0)
      const filteredProducts = response.data.filter(
        (product) => product.price && product.price > 0
      );
      setProducts(filteredProducts);
    } catch (error) {
      const appError = handleApiError(error);
      const errorMessage = getUserFriendlyMessage(appError) || "Ошибка при загрузке продуктов категории";
      setError(errorMessage);
      logger.errorWithContext(appError, { context: 'fetchProductsByCategory' });
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    let cancelled = false;
    fetchProductsByCategory().finally(()=>{ if (cancelled) return; });
    return ()=>{ cancelled = true; };
  }, [categoryId]);
  return {
    products,
    loading,
    error,
    refetch: fetchProductsByCategory,
  };
};
