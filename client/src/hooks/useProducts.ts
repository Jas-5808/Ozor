import { useState, useEffect, useMemo, useCallback } from "react";
import i18n from "../i18n";
import { shopAPI } from "../api";
import { Product } from "../types";
import { logger } from "../utils/logger";
import { handleApiError, getUserFriendlyMessage } from "../utils/errorHandler";
import { buildDisplayProducts, splitProductsIntoPrimaryAndVariants } from "../utils/productUtils";

const ITEMS_PER_PAGE = 20; // Количество товаров на страницу
const API_LIMIT = 100; // Максимальный лимит для API запроса
const FIRST_PAGE_LIMIT = 40; // Быстрая первая страница для улучшения LCP
const CACHE_TTL = 5 * 60 * 1000; // 5 минут кэш
const PRODUCTS_CACHE_KEY = "ozar_products_cache_v1";

// Простой кэш для продуктов
let productsCache: {
  primary: Product[];
  variants: Product[];
  timestamp: number;
} | null = null;

const loadCacheFromStorage = () => {
  try {
    const raw = localStorage.getItem(PRODUCTS_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.timestamp || !parsed?.primary || !parsed?.variants) return null;
    // TTL проверка
    if (Date.now() - parsed.timestamp > CACHE_TTL) return null;
    return parsed as typeof productsCache;
  } catch {
    return null;
  }
};

const saveCacheToStorage = (data: typeof productsCache) => {
  try {
    if (!data) return;
    localStorage.setItem(PRODUCTS_CACHE_KEY, JSON.stringify(data));
  } catch {
    // игнорируем ошибки storage
  }
};

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
      const memoryCacheValid = productsCache && (now - productsCache.timestamp) < CACHE_TTL;
      const storageCache = loadCacheFromStorage();
      const storageCacheValid = storageCache && (now - storageCache.timestamp) < CACHE_TTL;
      const cacheToUse = memoryCacheValid ? productsCache : storageCacheValid ? storageCache : null;

      if (cacheToUse) {
        setPrimaryProducts(cacheToUse.primary);
        setVariantProducts(cacheToUse.variants);
        setDisplayedCount(ITEMS_PER_PAGE);
        setLoading(false);
        // не выходим — можем в фоне обновить, но без повторного запроса сразу после холодного старта.
        // Если хотим полностью избежать запроса, раскомментировать return;
        return;
      }
      
      // Быстрая первая страница для мгновенного рендера
      const allFetchedProducts: any[] = [];
      const firstResponse = await shopAPI.getProducts({ limit: FIRST_PAGE_LIMIT, offset: 0 });
      const firstData = firstResponse.data || [];
      allFetchedProducts.push(...firstData);

      // Отдаем первую партию сразу
      const { primaryProducts: firstPrimary, variantProducts: firstVariants } =
        splitProductsIntoPrimaryAndVariants(allFetchedProducts);
      setPrimaryProducts(firstPrimary);
      setVariantProducts(firstVariants);
      setDisplayedCount(ITEMS_PER_PAGE); // Сбрасываем счетчик при новой загрузке
      setLoading(false); // skeleton уходит после первой быстрой партии

      // Догружаем остальное в фоне
      let offset = allFetchedProducts.length;
      let hasMore = true;
      while (hasMore) {
        const response = await shopAPI.getProducts({ limit: API_LIMIT, offset });
        const data = response.data || [];
        if (data.length === 0) {
          hasMore = false;
        } else {
          for (let i = 0; i < data.length; i++) {
            allFetchedProducts.push(data[i]);
          }
          offset += data.length;
          if (data.length < API_LIMIT) {
            hasMore = false;
          }
        }
      }

      // Финализируем полную выдачу и кэшируем
      const { primaryProducts: primary, variantProducts: variants } =
        splitProductsIntoPrimaryAndVariants(allFetchedProducts);
      productsCache = {
        primary,
        variants,
        timestamp: Date.now(),
      };
      saveCacheToStorage(productsCache);
      setPrimaryProducts(primary);
      setVariantProducts(variants);
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
    const total = primaryProducts.length + variantProducts.length;
    const value = displayedCount < total;
    console.log("[useProducts] hasMore calc", {
      displayedCount,
      total,
      primary: primaryProducts.length,
      variants: variantProducts.length,
      value
    });
    return value;
  }, [displayedCount, primaryProducts.length, variantProducts.length]);

  useEffect(() => {
    console.log("[useProducts] state", {
      displayedCount,
      products: primaryProducts.length + variantProducts.length,
      primary: primaryProducts.length,
      variants: variantProducts.length,
      hasMore,
      loading,
    });
  }, [displayedCount, primaryProducts.length, variantProducts.length, hasMore, loading]);

  // Загрузить следующую порцию - мемоизировано
  const loadMore = useCallback(() => {
    if (hasMore && !loading) {
      const next = Math.min(
        displayedCount + ITEMS_PER_PAGE,
        primaryProducts.length + variantProducts.length
      );
      console.log("[useProducts] loadMore", {
        from: displayedCount,
        to: next,
        total: primaryProducts.length + variantProducts.length,
      });
      setDisplayedCount(next);
    } else {
      console.log("[useProducts] loadMore skipped", { hasMore, loading });
    }
  }, [hasMore, loading, displayedCount, primaryProducts.length, variantProducts.length]);

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
