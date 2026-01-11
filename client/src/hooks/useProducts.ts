import { useState, useEffect, useMemo, useCallback } from "react";
import i18n from "../i18n";
import { shopAPI } from "../services/api";
import { Product } from "../types";
import { logger } from "../utils/logger";
import { handleApiError, getUserFriendlyMessage } from "../utils/errorHandler";
import { buildDisplayProducts, resolveProductDescription, resolveProductName, splitProductsIntoPrimaryAndVariants } from "../utils/productUtils";

const ITEMS_PER_PAGE = 20; // Количество товаров на страницу
const API_LIMIT = 100; // Максимальный лимит для API запроса
const FIRST_PAGE_LIMIT = 40; // Быстрая первая страница для улучшения LCP
const PAGED_LIMIT = 40; // Лимит для постраничной витрины (infinite scroll)
const CACHE_TTL = 5 * 60 * 1000; // 5 минут кэш

// Простой кэш для продуктов
let productsCache: {
  primary: Product[];
  variants: Product[];
  timestamp: number;
} | null = null;
let productsInFlight: Promise<void> | null = null;

// Кэш + дедуп для витрины с серверной пагинацией (НЕ грузим весь каталог)
let pagedCache: {
  raw: any[];
  offset: number;
  hasMore: boolean;
  timestamp: number;
} | null = null;
let pagedInFlight: Promise<void> | null = null;
let pagedLoadMoreInFlight: Promise<void> | null = null;

/**
 * Витрина (главная): постраничная загрузка с API (infinite scroll).
 * Важно: НЕ выкачивает весь каталог, чтобы не убивать API и не держать мегабайты в памяти.
 */
export const useProductsPaged = () => {
  const [raw, setRaw] = useState<any[]>([]);
  const [primaryProducts, setPrimaryProducts] = useState<Product[]>([]);
  const [variantProducts, setVariantProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [offset, setOffset] = useState<number>(0);
  const [hasMore, setHasMore] = useState<boolean>(true);

  const hydrateFromRaw = useCallback((items: any[]) => {
    const { primaryProducts: primary, variantProducts: variants } =
      splitProductsIntoPrimaryAndVariants(items);
    setPrimaryProducts(primary);
    setVariantProducts(variants);
  }, []);

  const fetchFirstPage = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const now = Date.now();
      if (pagedCache && (now - pagedCache.timestamp) < CACHE_TTL) {
        setRaw(pagedCache.raw);
        hydrateFromRaw(pagedCache.raw);
        setOffset(pagedCache.offset);
        setHasMore(pagedCache.hasMore);
        setLoading(false);
        return;
      }

      if (pagedInFlight) {
        await pagedInFlight;
        if (pagedCache) {
          setRaw(pagedCache.raw);
          hydrateFromRaw(pagedCache.raw);
          setOffset(pagedCache.offset);
          setHasMore(pagedCache.hasMore);
        }
        setLoading(false);
        return;
      }

      const run = async () => {
        const response = await shopAPI.getProducts({ limit: FIRST_PAGE_LIMIT, offset: 0 });
        const data = response.data || [];
        const nextOffset = data.length;
        // Некоторые бэки игнорируют limit и отдают меньше, но страниц ещё много.
        // Поэтому не режем hasMore по "=== limit" на первой странице.
        const nextHasMore = data.length > 0;

        pagedCache = {
          raw: data,
          offset: nextOffset,
          hasMore: nextHasMore,
          timestamp: Date.now(),
        };

        setRaw(data);
        hydrateFromRaw(data);
        setOffset(nextOffset);
        setHasMore(nextHasMore);
      };

      pagedInFlight = run();
      await pagedInFlight;
      pagedInFlight = null;
    } catch (error) {
      pagedInFlight = null;
      const appError = handleApiError(error);
      const errorMessage =
        getUserFriendlyMessage(appError) || i18n.t("common.errors.productsLoad");
      setError(errorMessage);
      logger.errorWithContext(appError, { context: "useProductsPaged.fetchFirstPage" });
    } finally {
      setLoading(false);
    }
  }, [hydrateFromRaw]);

  const loadMore = useCallback(async () => {
    if (loading || !hasMore) return;

    try {
      setLoading(true);
      setError(null);

      if (pagedLoadMoreInFlight) {
        await pagedLoadMoreInFlight;
        return;
      }

      const run = async () => {
        const response = await shopAPI.getProducts({ limit: PAGED_LIMIT, offset });
        const data = response.data || [];
        const nextOffset = offset + data.length;

        // Дедуп на всякий случай (API может отдавать повторно)
        const existingKeys = new Set(
          raw.map((it: any) => `${it?.product_id || it?.id || ""}_${it?.variant_id || it?.variantId || ""}`)
        );
        const merged = raw.slice();
        for (const item of data) {
          const key = `${item?.product_id || item?.id || ""}_${item?.variant_id || item?.variantId || ""}`;
          if (!existingKeys.has(key)) {
            existingKeys.add(key);
            merged.push(item);
          }
        }
        const grew = merged.length > raw.length;
        // "hasMore" продолжаем, пока сервер возвращает хоть что-то и список реально растёт.
        // Это устойчиво к бэкам, которые:
        // - игнорируют limit
        // - иногда возвращают дубликаты
        const nextHasMore = data.length > 0 && grew;

        pagedCache = {
          raw: merged,
          offset: nextOffset,
          hasMore: nextHasMore,
          timestamp: Date.now(),
        };

        setRaw(merged);
        hydrateFromRaw(merged);
        setOffset(nextOffset);
        setHasMore(nextHasMore);
      };

      pagedLoadMoreInFlight = run();
      await pagedLoadMoreInFlight;
      pagedLoadMoreInFlight = null;
    } catch (error) {
      pagedLoadMoreInFlight = null;
      const appError = handleApiError(error);
      const errorMessage =
        getUserFriendlyMessage(appError) || i18n.t("common.errors.productsLoad");
      setError(errorMessage);
      logger.errorWithContext(appError, { context: "useProductsPaged.loadMore" });
    } finally {
      setLoading(false);
    }
  }, [hasMore, hydrateFromRaw, loading, offset, raw]);

  const refetch = useCallback(() => {
    pagedCache = null;
    pagedInFlight = null;
    pagedLoadMoreInFlight = null;
    setRaw([]);
    setOffset(0);
    setHasMore(true);
    fetchFirstPage();
  }, [fetchFirstPage]);

  useEffect(() => {
    let cancelled = false;
    fetchFirstPage().finally(() => {
      if (cancelled) return;
    });
    return () => {
      cancelled = true;
    };
  }, [fetchFirstPage]);

  const products = useMemo(() => {
    const total = primaryProducts.length + variantProducts.length;
    return buildDisplayProducts(primaryProducts, variantProducts, total);
  }, [primaryProducts, variantProducts]);

  return {
    products,
    loading,
    error,
    refetch,
    hasMore,
    loadMore,
  };
};

export const useProducts = () => {
  const [primaryProducts, setPrimaryProducts] = useState<Product[]>([]);
  const [variantProducts, setVariantProducts] = useState<Product[]>([]);
  const [displayedCount, setDisplayedCount] = useState<number>(ITEMS_PER_PAGE);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  
  const fetchProducts = useCallback(async () => {
    // Если уже есть кэш — используем его сразу
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

      // Если запрос уже летит — дожидаемся его
      if (productsInFlight) {
        await productsInFlight;
        const cached = productsCache;
        if (cached) {
          setPrimaryProducts(cached.primary);
          setVariantProducts(cached.variants);
          setDisplayedCount(ITEMS_PER_PAGE);
        }
        setLoading(false);
        return;
      }
      
      // Быстрая первая страница для мгновенного рендера
      const run = async () => {
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
            allFetchedProducts.push(...data);
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
        setPrimaryProducts(primary);
        setVariantProducts(variants);
      };

      productsInFlight = run();
      await productsInFlight;
      productsInFlight = null;
    } catch (error) {
      productsInFlight = null;
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
    return value;
  }, [displayedCount, primaryProducts.length, variantProducts.length]);

  // Загрузить следующую порцию - мемоизировано
  const loadMore = useCallback(() => {
    if (hasMore && !loading) {
      const next = Math.min(
        displayedCount + ITEMS_PER_PAGE,
        primaryProducts.length + variantProducts.length
      );
      setDisplayedCount(next);
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
      const payload: any = (response as any)?.data ?? response;
      const data: any = payload?.data ?? payload;
      const firstVariant = Array.isArray(data?.variants) ? data.variants[0] : null;
      setProduct({
        product_id: String(data?.id || data?.product_id || ""),
        product_name: resolveProductName(data),
        product_description: resolveProductDescription(data),
        name_uz: data?.name_uz || data?.name || data?.product_name || data?.product_name_uz,
        name_ru: data?.name_ru || data?.product_name_ru,
        description_uz: data?.description_uz || data?.product_description_uz || data?.description || data?.product_description,
        description_ru: data?.description_ru || data?.product_description_ru || data?.description || data?.product_description,
        category: data?.category || { id: String(data?.category_id || ""), name: String(data?.category_name || "") },
        refferal_price: Number(data?.refferal_price || 0),
        main_image: data?.main_image || "",
        variant_id: String(firstVariant?.id || data?.variant_id || ""),
        variant_sku: String(firstVariant?.sku || data?.variant_sku || ""),
        price: Number(firstVariant?.price ?? data?.price ?? data?.base_price ?? 0),
        stock: Number(firstVariant?.stock ?? data?.stock ?? 0),
        variant_attributes: Array.isArray(firstVariant?.attribute_values)
          ? firstVariant.attribute_values
          : Array.isArray(data?.variant_attributes)
          ? data.variant_attributes
          : [],
        variant_media: Array.isArray(firstVariant?.media)
          ? firstVariant.media
          : Array.isArray(data?.variant_media)
          ? data.variant_media
          : [],
      });
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
