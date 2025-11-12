import { useState, useEffect } from "react";
import { shopAPI } from "../api";
import { Category } from "../types";
import { logger } from "../utils/logger";
import { handleApiError, getUserFriendlyMessage } from "../utils/errorHandler";
export const useCategories = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const fetchCategories = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await shopAPI.getCategories();
      setCategories(response.data);
    } catch (error) {
      const appError = handleApiError(error);
      const errorMessage = getUserFriendlyMessage(appError) || "Ошибка при загрузке категорий";
      setError(errorMessage);
      logger.errorWithContext(appError, { context: 'fetchCategories' });
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    fetchCategories();
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
export const useCategoryById = (categoryId: string | undefined) => {
  const [category, setCategory] = useState<Category | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
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
    } catch (error) {
      const appError = handleApiError(error);
      const errorMessage = getUserFriendlyMessage(appError) || "Ошибка при загрузке категории";
      setError(errorMessage);
      logger.errorWithContext(appError, { context: 'fetchCategory' });
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
export const getSubcategories = (
  categories: Category[],
  parentId: string | null
) => {
  if (!parentId) return [];
  return categories.filter((category) => category.parent_id === parentId);
};

export const getMainCategories = (categories: Category[]) => {
  return categories.filter((category) => category.parent_id === null);
};
