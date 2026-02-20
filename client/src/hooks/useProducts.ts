import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import i18n from "../i18n";
import { shopAPI } from "../services/api";
import { Product } from "../types";
import { logger } from "../utils/logger";
import { handleApiError, getUserFriendlyMessage } from "../utils/errorHandler";
import { buildDisplayProductsFromRawOrder, resolveProductDescription, resolveProductName, splitProductsIntoPrimaryAndVariants } from "../utils/productUtils";
import {
  MAIN_PRODUCTS_API_LIMIT,
  MAIN_PRODUCTS_FIRST_PAGE_LIMIT,
  MAIN_PRODUCTS_PAGED_LIMIT,
} from "../config/pagination";

const getLocaleKey = () => (i18n.language?.split("-")[0] || "ru").toLowerCase();

const ITEMS_PER_PAGE = 20; // Количество товаров на страницу
const CACHE_TTL = 5 * 60 * 1000; // 5 минут кэш
const MAIN_PRODUCTS_CACHE_KEY = "main_products_cache";

const readMainCache = () => {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(MAIN_PRODUCTS_CACHE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (!data || typeof data !== "object") return null;
    if (Date.now() - Number(data.timestamp || 0) > CACHE_TTL) return null;
    return data;
  } catch {
    return null;
  }
};

const writeMainCache = (payload: { raw: any[]; offset: number; hasMore: boolean }) => {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(
      MAIN_PRODUCTS_CACHE_KEY,
      JSON.stringify({
        raw: payload.raw,
        offset: payload.offset,
        hasMore: payload.hasMore,
        timestamp: Date.now(),
      })
    );
  } catch {
    // ignore
  }
};

// Простой кэш для продуктов
let productsCache: {
  raw: any[];
  primary: Product[];
  variants: Product[];
  timestamp: number;
  language: string;
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
  // Храним сырые данные в ref, чтобы loadMore не создавался заново при каждом обновлении списка.
  // Это устраняет стейл-замыкания и предотвращает лишние ре-рендеры при быстром скролле.
  const rawRef = useRef<any[]>([]);
  const [raw, setRawState] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [offset, setOffset] = useState<number>(0);
  const [hasMore, setHasMore] = useState<boolean>(true);
  const locale = getLocaleKey();

  // Синхронный сеттер: обновляет и ref, и state (для перерисовки)
  const setRaw = useCallback((data: any[]) => {
    rawRef.current = data;
    setRawState(data);
  }, []);

  const fetchFirstPage = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const now = Date.now();
      if (pagedCache && (now - pagedCache.timestamp) < CACHE_TTL) {
        setRaw(pagedCache.raw);
        setOffset(pagedCache.offset);
        setHasMore(pagedCache.hasMore);
        setLoading(false);
        return;
      }
      const persisted = readMainCache();
      if (persisted?.raw?.length) {
        pagedCache = {
          raw: persisted.raw,
          offset: Number(persisted.offset || 0),
          hasMore: Boolean(persisted.hasMore),
          timestamp: Number(persisted.timestamp || Date.now()),
        };
        setRaw(pagedCache.raw);
        setOffset(pagedCache.offset);
        setHasMore(pagedCache.hasMore);
        setLoading(false);
        return;
      }

      if (pagedInFlight) {
        await pagedInFlight;
        if (pagedCache) {
          setRaw(pagedCache.raw);
          setOffset(pagedCache.offset);
          setHasMore(pagedCache.hasMore);
        }
        setLoading(false);
        return;
      }

      const run = async () => {
        const response = await shopAPI.getProducts({ limit: MAIN_PRODUCTS_FIRST_PAGE_LIMIT, offset: 0 });
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
        writeMainCache({ raw: data, offset: nextOffset, hasMore: nextHasMore });

        // Все обновления state в одном месте → один React render (React 18 batching)
        setRaw(data);
        setOffset(nextOffset);
        setHasMore(nextHasMore);
        setLoading(false);
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
      setLoading(false);
      logger.errorWithContext(appError, { context: "useProductsPaged.fetchFirstPage" });
    }
  }, [setRaw]);

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
        // Читаем из ref, а не из замыкания — гарантированно актуальные данные без пересоздания callback
        const currentRaw = rawRef.current;
        const currentOffset = offset;

        const response = await shopAPI.getProducts({ limit: MAIN_PRODUCTS_PAGED_LIMIT, offset: currentOffset });
        const data = response.data || [];
        const nextOffset = currentOffset + data.length;

        // Дедуп на всякий случай (API может отдавать повторно)
        const existingKeys = new Set(
          currentRaw.map((it: any) => `${it?.product_id || it?.id || ""}_${it?.variant_id || it?.variantId || ""}`)
        );
        const merged = currentRaw.slice();
        for (const item of data) {
          const key = `${item?.product_id || item?.id || ""}_${item?.variant_id || item?.variantId || ""}`;
          if (!existingKeys.has(key)) {
            existingKeys.add(key);
            merged.push(item);
          }
        }
        const grew = merged.length > currentRaw.length;
        // "hasMore" продолжаем, пока сервер возвращает хоть что-то и список реально растёт.
        const nextHasMore = data.length > 0 && grew;

        pagedCache = {
          raw: merged,
          offset: nextOffset,
          hasMore: nextHasMore,
          timestamp: Date.now(),
        };
        writeMainCache({ raw: merged, offset: nextOffset, hasMore: nextHasMore });

        // Все обновления в одном batch → один React render, без промежуточных мерцаний
        setRaw(merged);
        setOffset(nextOffset);
        setHasMore(nextHasMore);
        setLoading(false);
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
      setLoading(false);
      logger.errorWithContext(appError, { context: "useProductsPaged.loadMore" });
    }
    // Убран finally { setLoading(false) } — setLoading теперь внутри run() и catch,
    // чтобы все state-обновления батчились в один рендер (React 18)
  }, [hasMore, loading, offset, setRaw]); // raw убран из зависимостей — используем rawRef

  const refetch = useCallback(() => {
    pagedCache = null;
    pagedInFlight = null;
    pagedLoadMoreInFlight = null;
    if (typeof window !== "undefined") {
      try {
        localStorage.removeItem(MAIN_PRODUCTS_CACHE_KEY);
      } catch {
        // ignore
      }
    }
    setRaw([]);
    setOffset(0);
    setHasMore(true);
    fetchFirstPage();
  }, [fetchFirstPage, setRaw]);

  useEffect(() => {
    let cancelled = false;
    fetchFirstPage().finally(() => {
      if (cancelled) return;
    });
    return () => {
      cancelled = true;
    };
  }, [fetchFirstPage]);

  // Порядок товаров = порядок API (raw), без переупорядочивания при подгрузке
  const products = useMemo(() => buildDisplayProductsFromRawOrder(raw), [raw]);

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
  const rawProductsRef = useRef<any[]>([]);
  const locale = getLocaleKey();
  
  const fetchProducts = useCallback(async () => {
    const currentLocale = getLocaleKey();
    // Если уже есть кэш — используем его сразу
    try {
      setLoading(true);
      setError(null);
      
      // Проверяем кэш
      const now = Date.now();
      if (productsCache && (now - productsCache.timestamp) < CACHE_TTL) {
        rawProductsRef.current = productsCache.raw || [];
        if (productsCache.language !== currentLocale && rawProductsRef.current.length) {
          const { primaryProducts: primary, variantProducts: variants } =
            splitProductsIntoPrimaryAndVariants(rawProductsRef.current);
          productsCache = {
            ...productsCache,
            primary,
            variants,
            language: currentLocale,
          };
          setPrimaryProducts(primary);
          setVariantProducts(variants);
        } else {
          setPrimaryProducts(productsCache.primary);
          setVariantProducts(productsCache.variants);
        }
        setDisplayedCount(ITEMS_PER_PAGE);
        setLoading(false);
        return;
      }

      // Если запрос уже летит — дожидаемся его
      if (productsInFlight) {
        await productsInFlight;
        const cached = productsCache;
        if (cached) {
          rawProductsRef.current = cached.raw || [];
          if (cached.language !== currentLocale && rawProductsRef.current.length) {
            const { primaryProducts: primary, variantProducts: variants } =
              splitProductsIntoPrimaryAndVariants(rawProductsRef.current);
            productsCache = {
              ...cached,
              primary,
              variants,
              language: currentLocale,
            };
            setPrimaryProducts(primary);
            setVariantProducts(variants);
          } else {
            setPrimaryProducts(cached.primary);
            setVariantProducts(cached.variants);
          }
          setDisplayedCount(ITEMS_PER_PAGE);
        }
        setLoading(false);
        return;
      }
      
      // Быстрая первая страница для мгновенного рендера
      const run = async () => {
        const allFetchedProducts: any[] = [];
        const firstResponse = await shopAPI.getProducts({ limit: MAIN_PRODUCTS_FIRST_PAGE_LIMIT, offset: 0 });
        const firstData = firstResponse.data || [];
        allFetchedProducts.push(...firstData);
        rawProductsRef.current = allFetchedProducts;

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
          const response = await shopAPI.getProducts({ limit: MAIN_PRODUCTS_API_LIMIT, offset });
          const data = response.data || [];
          if (data.length === 0) {
            hasMore = false;
          } else {
            allFetchedProducts.push(...data);
            offset += data.length;
            if (data.length < MAIN_PRODUCTS_API_LIMIT) {
              hasMore = false;
            }
          }
        }

        // Финализируем полную выдачу и кэшируем
        const { primaryProducts: primary, variantProducts: variants } =
          splitProductsIntoPrimaryAndVariants(allFetchedProducts);
        rawProductsRef.current = allFetchedProducts;
        productsCache = {
          raw: allFetchedProducts,
          primary,
          variants,
          timestamp: Date.now(),
          language: currentLocale,
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

  // Пересчитываем продукты при смене языка (без перезагрузки с сервера)
  useEffect(() => {
    if (!rawProductsRef.current.length) return;
    
    // Перетрансформируем уже загруженные данные с учетом нового языка
    const { primaryProducts: primary, variantProducts: variants } =
      splitProductsIntoPrimaryAndVariants(rawProductsRef.current);
    setPrimaryProducts(primary);
    setVariantProducts(variants);
    
    // Обновляем кеш с новым языком
    if (productsCache) {
      productsCache = {
        ...productsCache,
        raw: rawProductsRef.current,
        primary,
        variants,
        language: locale,
      };
    }
  }, [locale]);

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
    rawProductsRef.current = [];
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
  const [rawProductData, setRawProductData] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const locale = getLocaleKey();
  
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
      
      // Сохраняем сырые данные для пересчета при смене языка
      setRawProductData(data);
      
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
        base_price: Number(firstVariant?.base_price ?? data?.base_price ?? null),
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
  
  // Пересчитываем продукт при смене языка (без перезагрузки с сервера)
  useEffect(() => {
    if (!rawProductData) return;
    
    const firstVariant = Array.isArray(rawProductData?.variants) ? rawProductData.variants[0] : null;
    setProduct({
      product_id: String(rawProductData?.id || rawProductData?.product_id || ""),
      product_name: resolveProductName(rawProductData),
      product_description: resolveProductDescription(rawProductData),
      name_uz: rawProductData?.name_uz || rawProductData?.name || rawProductData?.product_name || rawProductData?.product_name_uz,
      name_ru: rawProductData?.name_ru || rawProductData?.product_name_ru,
      description_uz: rawProductData?.description_uz || rawProductData?.product_description_uz || rawProductData?.description || rawProductData?.product_description,
      description_ru: rawProductData?.description_ru || rawProductData?.product_description_ru || rawProductData?.description || rawProductData?.product_description,
      category: rawProductData?.category || { id: String(rawProductData?.category_id || ""), name: String(rawProductData?.category_name || "") },
      refferal_price: Number(rawProductData?.refferal_price || 0),
      base_price: Number(firstVariant?.base_price ?? rawProductData?.base_price ?? null),
      main_image: rawProductData?.main_image || "",
      variant_id: String(firstVariant?.id || rawProductData?.variant_id || ""),
      variant_sku: String(firstVariant?.sku || rawProductData?.variant_sku || ""),
      price: Number(firstVariant?.price ?? rawProductData?.price ?? rawProductData?.base_price ?? 0),
      stock: Number(firstVariant?.stock ?? rawProductData?.stock ?? 0),
      variant_attributes: Array.isArray(firstVariant?.attribute_values)
        ? firstVariant.attribute_values
        : Array.isArray(rawProductData?.variant_attributes)
        ? rawProductData.variant_attributes
        : [],
      variant_media: Array.isArray(firstVariant?.media)
        ? firstVariant.media
        : Array.isArray(rawProductData?.variant_media)
        ? rawProductData.variant_media
        : [],
    });
  }, [locale, rawProductData]);
  
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
