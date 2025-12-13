import { useState, useEffect } from "react";
import i18n from "../i18n";
import { shopAPI } from "../api";
import { Category } from "../types";
import { logger } from "../utils/logger";
import { handleApiError, getUserFriendlyMessage } from "../utils/errorHandler";

const normalizeCategories = (payload: unknown): Category[] => {
  if (Array.isArray(payload)) return payload;
  const data = (payload as any)?.data;
  if (Array.isArray(data)) return data;
  logger.warn?.("Неверный формат ответа для категорий", { payload });
  return [];
};

const normalizeCategory = (payload: unknown): Category | null => {
  if (!payload) return null;
  const candidate = (payload as any)?.data ?? payload;
  if (candidate && typeof candidate === "object") {
    return candidate as Category;
  }
  logger.warn?.("Неверный формат ответа для категории", { payload });
  return null;
};
export const useCategories = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const fetchCategories = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await shopAPI.getCategories();
      const normalized = normalizeCategories(response.data);
      setCategories(normalized);
    } catch (error) {
      const appError = handleApiError(error);
      const errorMessage = getUserFriendlyMessage(appError) || i18n.t("common.errors.categoriesLoad");
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
      setCategory(null);
      setError(null);
      return;
    }
    try {
      setLoading(true);
      setError(null);
      const response = await shopAPI.getCategoryById(categoryId);
      const normalized = normalizeCategory(response.data);
      setCategory(normalized);
    } catch (error) {
      const appError = handleApiError(error);
      const errorMessage = getUserFriendlyMessage(appError) || i18n.t("common.errors.categoryLoad");
      setError(errorMessage);
      // Не сбрасываем category в null при ошибке, чтобы сохранить предыдущие данные если есть
      // Но логируем ошибку для отладки
      logger.errorWithContext(appError, { context: 'fetchCategory', categoryId });
      
      // Если это ошибка 500 или 404, пытаемся получить базовую информацию из списка категорий
      if (appError.status === 500 || appError.status === 404) {
        // Позволяем компоненту работать без полной информации о категории
        console.warn(`Category ${categoryId} not found or server error, continuing without category details`);
      }
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    let cancelled = false;
    fetchCategory().finally(() => {
      if (cancelled) return;
    });
    return () => {
      cancelled = true;
    };
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
  if (!parentId || !Array.isArray(categories)) return [];
  return categories.filter((category) => category.parent_id === parentId);
};

// Рекурсивно собираем все вложенные подкатегории
export const getAllSubcategories = (categories: Category[], parentId: string | null) => {
  if (!parentId || !Array.isArray(categories)) return [];

  const result: Category[] = [];
  const stack = categories.filter((category) => category.parent_id === parentId);

  while (stack.length) {
    const current = stack.pop()!;
    result.push(current);

    const children = categories.filter((cat) => cat.parent_id === current.id);
    if (children.length) {
      stack.push(...children);
    }
  }

  return result;
};

export const getMainCategories = (categories: Category[]) => {
  return categories.filter((category) => category.parent_id === null);
};
