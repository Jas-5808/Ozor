import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { shopAPI } from "../services/api";
import { useCategoryById, useCategories, getAllSubcategories } from "../hooks/useCategories";
import { Product } from "../types";
import ProductCard from "../components/ui/ProductCard";
import WindowedGrid from "../components/WindowedGrid";
import useSEO from "../hooks/useSEO";
import SkeletonGrid from "../components/SkeletonGrid";
import { useInfiniteScroll } from "../hooks/useInfiniteScroll";
import { useInView } from "../hooks/useInView";
import { buildDisplayProducts, splitProductsIntoPrimaryAndVariants, transformProductFromApi } from "../utils/productUtils";
import { CATEGORY_PAGE_LIMIT } from "../config/pagination";
import { logger } from "../utils/logger";

const PAGE_SIZE = 20;
const MOBILE_PAGE_SIZE = 12;
const MOBILE_INITIAL_TARGET_ITEMS = 30;
const MOBILE_CATEGORY_PAGE_LIMIT = 40;
const INITIAL_TARGET_ITEMS = 60; // сколько "сырых" items хотим быстро собрать до первого уверенного UX
const MAX_CONCURRENT = 3; // чтобы не спамить API
const CATEGORY_CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const CATEGORY_CACHE_MAX_ITEMS = 400;

const adaptProductsFromCategory = (items: any[], categoryCtx?: { id?: string; name?: string }) => {
  return (items || []).map((item) => {
    const product = transformProductFromApi(item);
    const categoryId = item?.category_id || categoryCtx?.id || product.category?.id || "";
    const categoryName = item?.category_name || categoryCtx?.name || product.category?.name || "";
    return {
      ...product,
      category: {
        id: categoryId,
        name: categoryName,
      },
      __categoryId: categoryId,
    };
  });
};

export function CategoryPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const { category, loading: categoryLoading, error: categoryError } = useCategoryById(id);
  const { categories } = useCategories();
  const isMobile = typeof window !== "undefined" ? window.innerWidth < 768 : false;
  const pageSize = isMobile ? MOBILE_PAGE_SIZE : PAGE_SIZE;
  const initialTargetItems = isMobile ? MOBILE_INITIAL_TARGET_ITEMS : INITIAL_TARGET_ITEMS;
  const categoryPageLimit = isMobile ? MOBILE_CATEGORY_PAGE_LIMIT : CATEGORY_PAGE_LIMIT;
  const [rawItems, setRawItems] = useState<any[]>([]);
  const [primaryProducts, setPrimaryProducts] = useState<Product[]>([]);
  const [variantProducts, setVariantProducts] = useState<Product[]>([]);
  const [otherPrimaryProducts, setOtherPrimaryProducts] = useState<Product[]>([]);
  const [otherVariantProducts, setOtherVariantProducts] = useState<Product[]>([]);
  const [displayedCount, setDisplayedCount] = useState<number>(pageSize);
  const [otherDisplayedCount, setOtherDisplayedCount] = useState<number>(pageSize);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cursor, setCursor] = useState(0); // индекс следующей подкатегории для подгрузки
  const [categoriesHasMore, setCategoriesHasMore] = useState(true);
  const categoryOffsetsRef = useRef<Record<string, number>>({});
  const categoryHasMoreRef = useRef<Record<string, boolean>>({});
  const categoryQueueRef = useRef<string[]>([]);
  const { ref: otherProductsRef, inView: otherProductsInView } = useInView({
    rootMargin: isMobile ? "700px 0px" : "500px 0px",
  });
  const cacheKey = useMemo(
    () => (id ? `category_products_cache:${id}` : ""),
    [id]
  );
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const categoryUrl = origin && id ? `${origin}/category/${id}` : undefined;
  const getCategoryDisplayName = (cat: typeof category) => {
    if (!cat) return "";
    return i18n.language?.split("-")[0] === "uz" ? cat.name : (cat.name_ru || cat.name);
  };
  const categoryDisplayName = getCategoryDisplayName(category);
  const categoryTitle = categoryDisplayName ? `${categoryDisplayName} — OZAR` : "Категория — OZAR";
  const categoryDescription = categoryDisplayName
    ? `Купить ${categoryDisplayName} в OZAR. Актуальные цены, варианты и быстрая доставка.`
    : "Категория товаров в OZAR. Актуальные цены и быстрая доставка.";

  // Важно: displayedProducts должен быть объявлен ДО использования в JSON-LD (иначе возможен runtime-crash)
  const displayedProducts = useMemo(() => {
    return buildDisplayProducts(primaryProducts, variantProducts, displayedCount);
  }, [primaryProducts, variantProducts, displayedCount]);

  const otherDisplayedProducts = useMemo(() => {
    const total = otherPrimaryProducts.length + otherVariantProducts.length;
    return buildDisplayProducts(otherPrimaryProducts, otherVariantProducts, Math.min(otherDisplayedCount, total));
  }, [otherDisplayedCount, otherPrimaryProducts, otherVariantProducts]);

  const categoryJsonLd = useMemo(() => {
    const name = getCategoryDisplayName(category) || "";
    const parentName = category?.parent_name || "";
    const parentId = category?.parent_id ? String(category.parent_id) : "";

    const breadcrumbItems: any[] = [
      {
        "@type": "ListItem",
        position: 1,
        name: t("common.navigation.home") || "Главная",
        item: origin ? `${origin}/` : undefined,
      },
      {
        "@type": "ListItem",
        position: 2,
        name: t("catalog.header") || "Каталог",
        item: origin ? `${origin}/catalog` : undefined,
      },
    ];

    if (parentName && parentId && origin) {
      breadcrumbItems.push({
        "@type": "ListItem",
        position: 3,
        name: parentName,
        item: `${origin}/category/${parentId}`,
      });
      breadcrumbItems.push({
        "@type": "ListItem",
        position: 4,
        name: name || (t("catalog.category") || "Категория"),
        item: categoryUrl,
      });
    } else {
      breadcrumbItems.push({
        "@type": "ListItem",
        position: 3,
        name: name || (t("catalog.category") || "Категория"),
        item: categoryUrl,
      });
    }

    const listItems = displayedProducts.slice(0, 24).map((p, idx) => ({
      "@type": "ListItem",
      position: idx + 1,
      url: origin && p?.product_id ? `${origin}/product/${p.product_id}` : undefined,
      name: p?.product_name || undefined,
    }));

    return [
      {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: breadcrumbItems,
      },
      {
        "@context": "https://schema.org",
        "@type": "CollectionPage",
        name: name || undefined,
        url: categoryUrl,
        isPartOf: origin ? { "@type": "WebSite", name: "OZAR", url: `${origin}/` } : undefined,
        mainEntity: {
          "@type": "ItemList",
          itemListElement: listItems,
        },
      },
    ];
  }, [category, categoryUrl, displayedProducts, origin, t, i18n.language]);

  useSEO({
    title: categoryTitle,
    description: categoryDescription,
    robots: "index,follow",
    canonical: categoryUrl,
    openGraph: {
      "og:type": "website",
      "og:title": categoryTitle,
      "og:description": categoryDescription,
      ...(categoryUrl ? { "og:url": categoryUrl } : {}),
    },
    twitter: {
      "twitter:card": "summary",
      "twitter:title": categoryTitle,
      "twitter:description": categoryDescription,
    },
    jsonLd: categoryJsonLd,
  });

  // Обработка браузерной кнопки "назад" для навигации по иерархии категорий
  const categoryIdRef = useRef<string | null>(null);
  const parentIdRef = useRef<string | null>(null);
  const isHandlingBackRef = useRef(false);
  
  // Сохраняем текущие значения в refs для использования в обработчике
  useEffect(() => {
    categoryIdRef.current = id || null;
    parentIdRef.current = category?.parent_id || null;
  }, [id, category?.parent_id]);
  
  // Обработчик popstate для перехвата навигации назад
  useEffect(() => {
    if (!id || categoryLoading) return;

    const handlePopState = () => {
      // Предотвращаем множественные вызовы
      if (isHandlingBackRef.current) return;
      
      isHandlingBackRef.current = true;
      
      // Используем актуальные значения из refs
      const currentCategoryId = categoryIdRef.current;
      const currentParentId = parentIdRef.current;
      
      if (!currentCategoryId) {
        isHandlingBackRef.current = false;
        return;
      }
      
      // Небольшая задержка для синхронизации с браузером
      setTimeout(() => {
        const currentPath = window.location.pathname;
        
        // Проверяем, находимся ли мы на странице текущей категории
        if (currentPath.startsWith('/category/')) {
          const pathCategoryId = currentPath.split('/category/')[1]?.split('/')[0];
          
          // Если это текущая категория, перехватываем навигацию
          if (pathCategoryId === currentCategoryId) {
            // Если у категории есть родитель, переходим на него
            if (currentParentId) {
              navigate(`/category/${currentParentId}`, { replace: false });
            } else {
              // Если родителя нет, переходим на каталог
              navigate('/catalog', { replace: false });
            }
          }
        }
        
        isHandlingBackRef.current = false;
      }, 10);
    };

    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('popstate', handlePopState);
      isHandlingBackRef.current = false;
    };
  }, [id, categoryLoading, navigate]);

  // Получаем подкатегории для текущей категории - мемоизировано
  const subcategories = useMemo(() => {
    return id ? getAllSubcategories(categories, id) : [];
  }, [id, categories]);
  
  // Создаем стабильный ключ для подкатегорий (для зависимостей useEffect)
  const subcategoriesKey = useMemo(() => {
    return subcategories.map(s => s.id).sort().join(',');
  }, [subcategories]);

  // Список categoryIds (текущая + все подкатегории) - стабильный массив
  const categoryIds = useMemo(() => {
    const ids = new Set<string>();
    if (id) ids.add(id);
    subcategories.forEach((sub) => ids.add(sub.id));
    return Array.from(ids).sort(); // Сортируем для стабильности
  }, [id, subcategoriesKey]);

  // refs: чтобы fetchNextCategories был стабильным и не ломал зависимости useEffect
  const rawItemsRef = useRef<any[]>([]);
  const cursorRef = useRef(0);
  const loadingMoreRef = useRef(false);
  const categoryIdsRef = useRef<string[]>([]);
  useEffect(() => {
    rawItemsRef.current = rawItems;
  }, [rawItems]);
  useEffect(() => {
    cursorRef.current = cursor;
  }, [cursor]);
  useEffect(() => {
    loadingMoreRef.current = loadingMore;
  }, [loadingMore]);
  useEffect(() => {
    categoryIdsRef.current = categoryIds;
  }, [categoryIds]);

  const restoreFromCache = useCallback(() => {
    if (!cacheKey || typeof window === "undefined") return null;
    try {
      const raw = localStorage.getItem(cacheKey);
      if (!raw) return null;
      const payload = JSON.parse(raw);
      if (!payload || typeof payload !== "object") return null;
      if (Date.now() - Number(payload.ts || 0) > CATEGORY_CACHE_TTL) return null;
      const items = Array.isArray(payload.items) ? payload.items : [];
      const nextCursor = Number(payload.cursor || 0);
      const offsets = payload.offsets && typeof payload.offsets === "object" ? payload.offsets : {};
      const hasMore = payload.hasMore && typeof payload.hasMore === "object" ? payload.hasMore : {};
      const queue = Array.isArray(payload.queue) ? payload.queue : [];
      return {
        items,
        cursor: Number.isFinite(nextCursor) ? nextCursor : 0,
        offsets,
        hasMore,
        queue,
      };
    } catch {
      return null;
    }
  }, [cacheKey]);

  const persistCache = useCallback(
    (items: any[], nextCursor: number) => {
      if (!cacheKey || typeof window === "undefined") return;
      try {
        const trimmed =
          items.length > CATEGORY_CACHE_MAX_ITEMS ? items.slice(0, CATEGORY_CACHE_MAX_ITEMS) : items;
        localStorage.setItem(
          cacheKey,
          JSON.stringify({
            ts: Date.now(),
            items: trimmed,
            cursor: nextCursor,
            offsets: categoryOffsetsRef.current,
            hasMore: categoryHasMoreRef.current,
            queue: categoryQueueRef.current,
          })
        );
      } catch {
        // ignore cache write errors
      }
    },
    [cacheKey]
  );

  useEffect(() => {
    if (!rawItems.length) return;
    persistCache(rawItems, cursor);
  }, [rawItems, cursor, persistCache]);

  const mergeRawItems = useCallback((prev: any[], next: any[]) => {
    const existing = new Set(
      prev.map((it: any) => `${it?.product_id || it?.id || ""}_${it?.variant_id || it?.variantId || ""}`)
    );
    const merged = prev.slice();
    for (const item of next) {
      const key = `${item?.product_id || item?.id || ""}_${item?.variant_id || item?.variantId || ""}`;
      if (!existing.has(key)) {
        existing.add(key);
        merged.push(item);
      }
    }
    return merged;
  }, []);

  const syncDerivedProducts = useCallback((items: any[]) => {
    const currentId = String(id || "");
    const categoryItems: any[] = [];
    const otherItems: any[] = [];

    (items || []).forEach((item) => {
      const itemCategoryId = String(
        item?.category_id || item?.category?.id || item?.categoryId || item?.__categoryId || ""
      );
      if (currentId && itemCategoryId === currentId) {
        categoryItems.push(item);
      } else {
        otherItems.push(item);
      }
    });

    const { primaryProducts: primary, variantProducts: variants } =
      splitProductsIntoPrimaryAndVariants(categoryItems);
    const { primaryProducts: otherPrimary, variantProducts: otherVariants } =
      splitProductsIntoPrimaryAndVariants(otherItems);

    setPrimaryProducts(primary);
    setVariantProducts(variants);
    setOtherPrimaryProducts(otherPrimary);
    setOtherVariantProducts(otherVariants);
  }, [id]);
  
  // Пересчитываем продукты при смене языка (без перезагрузки с сервера)
  useEffect(() => {
    if (rawItems.length > 0) {
      syncDerivedProducts(rawItems);
    }
  }, [i18n.language, rawItems, syncDerivedProducts]);

  const fetchNextCategories = useCallback(async (opts?: { minTotalRaw?: number }) => {
    if (!id) return;
    if (loadingMoreRef.current) return;
    // Инициализируем очередь из categoryIdsRef, если она пуста
    if (categoryQueueRef.current.length === 0) {
      const ids = categoryIdsRef.current.length > 0 ? categoryIdsRef.current : categoryIds;
      if (ids.length === 0) {
        setCategoriesHasMore(false);
        return;
      }
      categoryQueueRef.current = ids.slice();
    }

    loadingMoreRef.current = true;
    setLoadingMore(true);
    try {
      let localCursor = cursorRef.current;
      let localRaw = rawItemsRef.current;

      while (categoryQueueRef.current.length > 0) {
        const batch: string[] = [];
        while (batch.length < MAX_CONCURRENT && categoryQueueRef.current.length > 0) {
          const nextId = categoryQueueRef.current.shift() as string;
          if (categoryHasMoreRef.current[nextId] === false) {
            continue;
          }
          batch.push(nextId);
        }
        if (batch.length === 0) {
          setCategoriesHasMore(false);
          break;
        }
        const responses = await Promise.all(
          batch.map(async (categoryId) => {
            if (categoryHasMoreRef.current[categoryId] === false) {
              return { categoryId, items: [], skipped: true, error: false };
            }
            const offset = Number(categoryOffsetsRef.current[categoryId] || 0);
            try {
              const r = await shopAPI.getProductsByCategory(categoryId, {
                limit: categoryPageLimit,
                offset,
              });
              const data = (r as any)?.data ?? r;
              const items = Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : [];
              const mapped = items.map((item: any) => ({ ...item, __categoryId: categoryId }));
              const nextOffset = offset + items.length;
              categoryOffsetsRef.current[categoryId] = nextOffset;
              if (items.length < categoryPageLimit) {
                categoryHasMoreRef.current[categoryId] = false;
              }
              return { categoryId, items: mapped, skipped: false, error: false };
            } catch {
              return { categoryId, items: [], skipped: false, error: true };
            }
          })
        );

        const flat = responses.flatMap((r) => r.items || []);
        localRaw = mergeRawItems(localRaw, flat);
        localCursor += batch.length;

        // Добавляем категории обратно в очередь ТОЛЬКО если есть еще данные
        // и только если они не были пропущены/ошибка
        responses.forEach((res) => {
          if (res.skipped || res.error) return;
          const hasMore = categoryHasMoreRef.current[res.categoryId] !== false;
          // Проверяем, что offset действительно увеличился (есть новые данные)
          const currentOffset = categoryOffsetsRef.current[res.categoryId] || 0;
          if (hasMore && currentOffset > 0 && res.items.length > 0) {
            categoryQueueRef.current.push(res.categoryId);
          }
        });

        // если нам достаточно для UX — выходим раньше (остальное догрузим по скроллу)
        if (opts?.minTotalRaw && localRaw.length >= opts.minTotalRaw) {
          break;
        }
      }

      setRawItems(localRaw);
      rawItemsRef.current = localRaw;
      syncDerivedProducts(localRaw);
      setCursor(localCursor);
      cursorRef.current = localCursor;
      setCategoriesHasMore(categoryQueueRef.current.length > 0);
    } finally {
      loadingMoreRef.current = false;
      setLoadingMore(false);
    }
  }, [categoryPageLimit, id, mergeRawItems, syncDerivedProducts]); // Убрали categoryIds из зависимостей, используем ref

  useEffect(() => {
    let cancelled = false;
    
    const fetchProducts = async () => {
      if (!id) {
        setLoading(false);
        return;
      }

      const restored = restoreFromCache();
      // reset on id change (unless we have cache)
      setError(null);
      setLoading(true);
      setLoadingMore(false);
      if (restored?.items?.length) {
        setRawItems(restored.items);
        rawItemsRef.current = restored.items;
        syncDerivedProducts(restored.items);
        setCursor(restored.cursor || 0);
        cursorRef.current = restored.cursor || 0;
        categoryOffsetsRef.current = restored.offsets || {};
        categoryHasMoreRef.current = restored.hasMore || {};
        categoryQueueRef.current =
          restored.queue && restored.queue.length ? restored.queue : categoryIds.slice();
        setCategoriesHasMore(categoryQueueRef.current.length > 0);
        setDisplayedCount(Math.min(pageSize, restored.items.length));
        setOtherDisplayedCount(pageSize);
        loadingMoreRef.current = false;
        setLoading(false);
      } else {
        setCursor(0);
        setRawItems([]);
        setPrimaryProducts([]);
        setVariantProducts([]);
        setOtherPrimaryProducts([]);
        setOtherVariantProducts([]);
        setDisplayedCount(pageSize);
        setOtherDisplayedCount(pageSize);
        // sync refs too
        rawItemsRef.current = [];
        cursorRef.current = 0;
        categoryOffsetsRef.current = {};
        categoryHasMoreRef.current = {};
        categoryQueueRef.current = categoryIds.slice();
        setCategoriesHasMore(categoryQueueRef.current.length > 0);
        loadingMoreRef.current = false;
      }
      
      if (categoryLoading && !category) {
        await new Promise(resolve => setTimeout(resolve, 500));
        if (cancelled) return;
      }

      // 1) Если API /shop/category/{id} уже вернул товары, используем их (требование заказчика)
      if (category?.products && Array.isArray(category.products)) {
        const mapped = adaptProductsFromCategory(category.products as any[], { id: category.id, name: category.name });
        if (!cancelled) {
          const merged = mergeRawItems(rawItemsRef.current, mapped);
          setRawItems(merged);
          rawItemsRef.current = merged;
          syncDerivedProducts(merged);
          setDisplayedCount(Math.min(pageSize, merged.length));
          setCursor(Math.max(cursorRef.current || 0, 1));
          cursorRef.current = Math.max(cursorRef.current || 0, 1);
          setLoading(false);
        }
        return;
      }
      
      // 2) Фоллбек: прогрессивно собираем товары по текущей категории и подкатегориям
      try {
        setError(null);
        // быстро подгружаем первые категории до initialTargetItems
        await fetchNextCategories({
          minTotalRaw: restored?.items?.length ? Math.max(initialTargetItems, restored.items.length + 1) : initialTargetItems,
        });
      } catch (err) {
        if (!cancelled) {
          logger.errorWithContext(err, { context: "CategoryPage.fetchProducts" });
          setError(t("common.errors.productsLoad"));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchProducts();
    
    return () => {
      cancelled = true;
    };
  }, [id, category?.id, category?.parent_id, categoryLoading, subcategoriesKey, t, fetchNextCategories, syncDerivedProducts, initialTargetItems, pageSize]);

  const totalProductsCount = useMemo(() => primaryProducts.length + variantProducts.length, [primaryProducts.length, variantProducts.length]);
  const otherProductsCount = useMemo(
    () => otherPrimaryProducts.length + otherVariantProducts.length,
    [otherPrimaryProducts.length, otherVariantProducts.length]
  );

  const hasMore = useMemo(() => {
    // есть ещё что показать ИЛИ есть что догрузить по категориям
    return displayedCount < totalProductsCount || categoriesHasMore;
  }, [displayedCount, totalProductsCount, categoriesHasMore]);

  const loadMore = useCallback(() => {
    if (!hasMore || loading) return;

    // Если у нас уже есть достаточно товаров — просто увеличиваем окно отображения
    if (displayedCount < totalProductsCount) {
      setDisplayedCount((prev) => Math.min(prev + pageSize, totalProductsCount));
      return;
    }

    // Если показать нечего, но есть что догрузить — догружаем следующую порцию категорий
    if (categoriesHasMore && !loadingMore) {
      void fetchNextCategories();
    }
  }, [categoriesHasMore, displayedCount, fetchNextCategories, hasMore, loading, loadingMore, totalProductsCount, pageSize]);

  const { ref: sentinelRef } = useInfiniteScroll({
    hasMore,
    loading: loading || loadingMore,
    onLoadMore: loadMore,
    threshold: 200,
  });

  useEffect(() => {
    if (!isMobile) return;
    if (!otherProductsInView) return;
    if (!categoriesHasMore || loadingMore) return;
    void fetchNextCategories();
  }, [categoriesHasMore, fetchNextCategories, isMobile, loadingMore, otherProductsInView]);

  // Infinite scroll для "Boshqa mahsulotlar" (товары из подкатегорий / других подгруженных категорий)
  const hasMoreOther = useMemo(() => {
    return otherDisplayedCount < otherProductsCount || categoriesHasMore;
  }, [categoriesHasMore, otherDisplayedCount, otherProductsCount]);

  const loadMoreOther = useCallback(() => {
    if (loading) return;
    if (!hasMoreOther) return;

    // 1) сначала просто раскрываем уже загруженные товары
    if (otherDisplayedCount < otherProductsCount) {
      setOtherDisplayedCount((prev) => Math.min(prev + pageSize, otherProductsCount));
      return;
    }

    // 2) если показать нечего, но есть что догрузить — догружаем следующую порцию категорий
    if (categoriesHasMore && !loadingMore) {
      void fetchNextCategories();
    }
  }, [categoriesHasMore, fetchNextCategories, hasMoreOther, loading, loadingMore, otherDisplayedCount, otherProductsCount, pageSize]);

  const { ref: otherSentinelRef } = useInfiniteScroll({
    hasMore: hasMoreOther,
    loading: loading || loadingMore,
    onLoadMore: loadMoreOther,
    threshold: 200,
  });

  return (
    <div className="container mx-auto px-3 sm:px-4 md:px-6 py-4 sm:py-6">
      {/* Breadcrumb */}
      <nav className="mb-4 text-sm">
        <ol className="flex items-center gap-2 text-slate-500">
          <li>
            <Link to="/" className="hover:text-[#04734b] transition">
              {t("common.navigation.home")}
            </Link>
          </li>
          <li>/</li>
          <li>
            <Link to="/catalog" className="hover:text-[#04734b] transition">
              {t("catalog.header")}
            </Link>
          </li>
          {category?.parent_name && (
            <>
              <li>/</li>
              <li>
                <Link 
                  to={`/category/${category.parent_id}`} 
                  className="hover:text-[#04734b] transition"
                >
                  {category.parent_name}
                </Link>
              </li>
            </>
          )}
          <li>/</li>
          <li className="text-slate-900 font-medium">
            {categoryLoading ? "..." : categoryDisplayName || t("catalog.category")}
          </li>
        </ol>
      </nav>

      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-slate-900">
          {categoryLoading ? (
            <div className="h-8 w-48 bg-slate-200 rounded animate-pulse"></div>
          ) : (
            categoryDisplayName || t("catalog.category")
          )}
        </h1>
            {category?.parent_id && category?.parent_name && (
              <div className="mt-2">
                <Link
                  to={`/category/${category.parent_id}`}
                  className="inline-flex items-center gap-2 text-sm font-semibold text-[#04734b] hover:brightness-110 transition"
                >
                  <span aria-hidden="true">←</span>
                  {category.parent_name}
                </Link>
              </div>
            )}
        {category?.products_count !== undefined && (
          <p className="text-slate-500 mt-1">
            {t("catalog.productsCount", { count: category.products_count })}
          </p>
        )}
        {categoryError && !categoryLoading && (
          <p className="text-amber-600 text-sm mt-2">
            {t("common.warnings.categoryLoadFailed") || "Не удалось загрузить информацию о категории, но товары отображаются"}
          </p>
        )}
      </div>

      {/* Подкатегории */}
      {subcategories.length > 0 && (
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-slate-800 mb-3">
            {t("catalog.subcategories")}
          </h2>
          <div className="flex flex-wrap gap-2">
            {subcategories.map((sub) => {
              const subName = i18n.language?.split("-")[0] === "uz" ? sub.name : (sub.name_ru || sub.name);
              return (
                <Link
                  key={sub.id}
                  to={`/category/${sub.id}`}
                  className="px-4 py-2 bg-white border border-slate-200 rounded-full text-sm font-medium text-slate-700 hover:border-[#04734b] hover:text-[#04734b] transition shadow-sm"
                >
                  {subName}
                  <span className="ml-1 text-slate-400">({sub.products_count})</span>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* Products Grid */}
      {loading ? (
        <SkeletonGrid count={8} />
      ) : error ? (
        <div className="text-center py-12">
          <div className="text-5xl mb-4">😕</div>
          <p className="text-slate-500">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-6 py-2 bg-[#04734b] text-white rounded-lg hover:brightness-110 transition"
          >
            {t("common.actions.retry")}
          </button>
        </div>
      ) : totalProductsCount === 0 && otherProductsCount === 0 ? (
        <div className="text-center py-12">
          <div className="text-5xl mb-4">📦</div>
          <p className="text-slate-500 text-lg">{t("catalog.noProducts")}</p>
          <Link
            to="/catalog"
            className="mt-4 inline-block px-6 py-2 bg-[#04734b] text-white rounded-lg hover:brightness-110 transition"
          >
            {t("catalog.backToCatalog")}
          </Link>
        </div>
      ) : (
        <>
          {totalProductsCount > 0 && (
            <WindowedGrid
              items={displayedProducts}
              gridClassName="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4 lg:gap-5 items-stretch"
              getItemKey={(product) => `${product.product_id}_${product.variant_id || ""}`}
              renderItem={(product) => (
                <ProductCard product={product} size="compact" locale={i18n.language} />
              )}
            />
          )}
          <div ref={sentinelRef} className="h-4 w-full" />
          {hasMore && (
            <div className="flex justify-center items-center py-8">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-[#04734b]"></div>
            </div>
          )}

          {(otherProductsCount > 0 || categoriesHasMore) && (
            <div ref={otherProductsRef} className="mt-10">
              <div className="mb-4 text-lg font-semibold text-slate-900">
                {t("catalog.otherProducts")}
              </div>
              {!otherProductsInView ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4 lg:gap-5 items-stretch">
                  {Array.from({ length: 6 }).map((_, idx) => (
                    <div key={idx} className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                      <div className="h-28 rounded-xl bg-slate-200/60" />
                      <div className="mt-3 h-3 w-2/3 rounded bg-slate-200/70" />
                      <div className="mt-2 h-3 w-1/3 rounded bg-slate-200/70" />
                    </div>
                  ))}
                </div>
              ) : otherProductsCount > 0 ? (
                <>
                  <WindowedGrid
                    items={otherDisplayedProducts}
                    gridClassName="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4 lg:gap-5 items-stretch"
                    getItemKey={(product) => `other_${product.product_id}_${product.variant_id || ""}`}
                    renderItem={(product) => (
                      <ProductCard product={product} size="compact" locale={i18n.language} />
                    )}
                  />
                  <div ref={otherSentinelRef} className="h-4 w-full" />
                  {hasMoreOther && (
                    <div className="flex justify-center items-center py-8">
                      <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-[#04734b]"></div>
                    </div>
                  )}
                </>
              ) : (
                <div className="flex justify-center items-center py-6">
                  <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-[#04734b]"></div>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default CategoryPage;
