import { useState, useEffect } from 'react';
import { shopAPI } from '../services/api';
export const useCategories = () => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const fetchCategories = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await shopAPI.getCategories();
      setCategories(response.data);
    } catch (err) {
      setError(err.message || 'Ошибка при загрузке категорий');
      console.error('Error fetching categories:', err);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    let cancelled = false;
    fetchCategories().finally(()=>{ if (cancelled) return; });
    return ()=>{ cancelled = true; };
  }, []);
  const refetch = () => {
    fetchCategories();
  };
  return {
    categories,
    loading,
    error,
    refetch,
  };
};
export const useCategoryById = (categoryId) => {
  const [category, setCategory] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const fetchCategory = async () => {
    if (!categoryId) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      setError(null);
      const response = await shopAPI.getCategoryById(categoryId);
      setCategory(response.data);
    } catch (err) {
      setError(err.message || 'Ошибка при загрузке категории');
      console.error('Error fetching category:', err);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    fetchCategory();
  }, [categoryId]);
  return {
    category,
    loading,
    error,
    refetch: fetchCategory,
  };
};
export const getSubcategories = (categories, parentId) => {
  if (!parentId) return [];
  return categories.filter(category => category.parent_id === parentId);
};
export const getMainCategories = (categories) => {
  return categories.filter(category => category.parent_id === null);
};
