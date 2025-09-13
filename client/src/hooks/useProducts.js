import { useState, useEffect } from 'react';
import { shopAPI } from '../services/api';
export const useProducts = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const fetchProducts = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await shopAPI.getProducts();
      setProducts(response.data);
    } catch (err) {
      setError(err.message || 'Ошибка при загрузке продуктов');
      console.error('Error fetching products:', err);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    fetchProducts();
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
export const useProductById = (productId) => {
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
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
    } catch (err) {
      setError(err.message || 'Ошибка при загрузке продукта');
      console.error('Error fetching product:', err);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    fetchProduct();
  }, [productId]);
  return {
    product,
    loading,
    error,
    refetch: fetchProduct,
  };
};
export const useProductsByCategory = (categoryId) => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const fetchProductsByCategory = async () => {
    if (!categoryId) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      setError(null);
      const response = await shopAPI.getProductsByCategory(categoryId);
      setProducts(response.data);
    } catch (err) {
      setError(err.message || 'Ошибка при загрузке продуктов категории');
      console.error('Error fetching products by category:', err);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    fetchProductsByCategory();
  }, [categoryId]);
  return {
    products,
    loading,
    error,
    refetch: fetchProductsByCategory,
  };
};