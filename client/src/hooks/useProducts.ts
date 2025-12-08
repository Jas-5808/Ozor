import { useState, useEffect, useMemo, useCallback } from "react";
import i18n from "../i18n";
import { shopAPI } from "../api";
import { Product } from "../types";
import { logger } from "../utils/logger";
import { handleApiError, getUserFriendlyMessage } from "../utils/errorHandler";
import { buildDisplayProducts, splitProductsIntoPrimaryAndVariants } from "../utils/productUtils";

const ITEMS_PER_PAGE = 20; // Количество товаров на страницу
const API_LIMIT = 100; // Максимальный лимит для API запроса
const CACHE_TTL = 5 * 60 * 1000; // 5 минут кэш

// Простой кэш для продуктов
let productsCache: {
  primary: Product[];
  variants: Product[];
  timestamp: number;
} | null = null;

export const useProducts = () => {
  const [primaryProducts, setPrimaryProducts] = useState<Product[]>([]);
  const [variantProducts, setVariantProducts] = useState<Product[]>([]);
  const [displayedCount, setDisplayedCount] = useState<number>(ITEMS_PER_PAGE);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  
  const fetchProducts = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Проверяем кэш
      const now = Date.now();
      if (productsCache && (now - productsCache.timestamp) < CACHE_TTL) {
        setPrimaryProducts(productsCache.primary);
        setVariantProducts(productsCache.variants);
        setDisplayedCount(ITEMS_PER_PAGE);
        setLoading(false);
        return;
      }
      
      // Загружаем все продукты с пагинацией
      const allFetchedProducts: any[] = [];
      let offset = 0;
      let hasMore = true;
      
      while (hasMore) {
        const response = await shopAPI.getProducts({ limit: API_LIMIT, offset });
        const data = response.data || [];
        
        if (data.length === 0) {
          hasMore = false;
        } else {
          // Используем прямой push элементов для лучшей производительности
          for (let i = 0; i < data.length; i++) {
            allFetchedProducts.push(data[i]);
          }
          offset += data.length;
          
          // Если получили меньше лимита, значит это последняя страница
          if (data.length < API_LIMIT) {
            hasMore = false;
          }
        }
      }
      
      // Обрабатываем продукты: основные и варианты
      const { primaryProducts: primary, variantProducts: variants } = splitProductsIntoPrimaryAndVariants(allFetchedProducts);
      
      // Сохраняем в кэш
      productsCache = {
        primary,
        variants,
        timestamp: Date.now(),
      };
      
      setPrimaryProducts(primary);
      setVariantProducts(variants);
      setDisplayedCount(ITEMS_PER_PAGE); // Сбрасываем счетчик при новой загрузке
    } catch (error) {
      const appError = handleApiError(error);
      const errorMessage = getUserFriendlyMessage(appError) || i18n.t("common.errors.productsLoad");
      setError(errorMessage);
      logger.errorWithContext(appError, { context: 'fetchProducts' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetchProducts().finally(()=>{ if (cancelled) return; });
    return ()=>{ cancelled = true; };
  }, [fetchProducts]);

  // Отображаемые продукты (пагинация на клиенте) - мемоизировано
  const products = useMemo(() => {
    return buildDisplayProducts(primaryProducts, variantProducts, displayedCount);
  }, [primaryProducts, variantProducts, displayedCount]);

  // Есть ли еще продукты для загрузки - мемоизировано
  const hasMore = useMemo(() => {
    return displayedCount < (primaryProducts.length + variantProducts.length);
  }, [displayedCount, primaryProducts.length, variantProducts.length]);

  // Загрузить следующую порцию - мемоизировано
  const loadMore = useCallback(() => {
    if (hasMore && !loading) {
      setDisplayedCount(prev => Math.min(
        prev + ITEMS_PER_PAGE, 
        primaryProducts.length + variantProducts.length
      ));
    }
  }, [hasMore, loading, primaryProducts.length, variantProducts.length]);

  const refetch = useCallback(() => {
    // Очищаем кэш при принудительном обновлении
    productsCache = null;
    fetchProducts();
  }, [fetchProducts]);

  return {
    products,
    loading,
    error,
    refetch,
    hasMore,
    loadMore,
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
      const errorMessage = getUserFriendlyMessage(appError) || i18n.t("common.errors.productLoad");
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
      const errorMessage = getUserFriendlyMessage(appError) || i18n.t("common.errors.productCategoryLoad");
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
