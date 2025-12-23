import { useState, useEffect, useMemo, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { shopAPI } from "../services/api";
import { useCategoryById, useCategories, getAllSubcategories } from "../hooks/useCategories";
import { Product } from "../types";
import ProductCard from "../components/ui/ProductCard";
import useSEO from "../hooks/useSEO";
import SkeletonGrid from "../components/SkeletonGrid";
import { useInfiniteScroll } from "../hooks/useInfiniteScroll";
import { buildDisplayProducts, splitProductsIntoPrimaryAndVariants, transformProductFromApi } from "../utils/productUtils";

const PAGE_SIZE = 20;
const INITIAL_TARGET_ITEMS = 60; // сколько "сырых" items хотим быстро собрать до первого уверенного UX
const MAX_CONCURRENT = 3; // чтобы не спамить API

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
    };
  });
};

export function CategoryPage() {
  const { id } = useParams<{ id: string }>();
  const { t } = useTranslation();
  const { category, loading: categoryLoading, error: categoryError } = useCategoryById(id);
  const { categories } = useCategories();
  const [rawItems, setRawItems] = useState<any[]>([]);
  const [primaryProducts, setPrimaryProducts] = useState<Product[]>([]);
  const [variantProducts, setVariantProducts] = useState<Product[]>([]);
  const [displayedCount, setDisplayedCount] = useState<number>(PAGE_SIZE);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cursor, setCursor] = useState(0); // индекс следующей подкатегории для подгрузки
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const categoryUrl = origin && id ? `${origin}/category/${id}` : undefined;
  const categoryTitle = category?.name ? `${category.name} — OZAR` : "Категория — OZAR";
  const categoryDescription = category?.name
    ? `Купить ${category.name} в OZAR. Актуальные цены, варианты и быстрая доставка.`
    : "Категория товаров в OZAR. Актуальные цены и быстрая доставка.";

  // Важно: displayedProducts должен быть объявлен ДО использования в JSON-LD (иначе возможен runtime-crash)
  const displayedProducts = useMemo(() => {
    return buildDisplayProducts(primaryProducts, variantProducts, displayedCount);
  }, [primaryProducts, variantProducts, displayedCount]);

  const categoryJsonLd = useMemo(() => {
    const name = category?.name || "";
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
  }, [category?.name, category?.parent_id, category?.parent_name, categoryUrl, displayedProducts, origin, t]);

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

  // Получаем подкатегории для текущей категории - мемоизировано
  const subcategories = useMemo(() => {
    return id ? getAllSubcategories(categories, id) : [];
  }, [id, categories]);
  
  // Создаем стабильный ключ для подкатегорий (для зависимостей useEffect)
  const subcategoriesKey = useMemo(() => {
    return subcategories.map(s => s.id).sort().join(',');
  }, [subcategories]);

  // Список categoryIds (текущая + все подкатегории)
  const categoryIds = useMemo(() => {
    const ids = new Set<string>();
    if (id) ids.add(id);
    subcategories.forEach((sub) => ids.add(sub.id));
    return Array.from(ids);
  }, [id, subcategoriesKey]);

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
    const { primaryProducts: primary, variantProducts: variants } =
      splitProductsIntoPrimaryAndVariants(items);
    setPrimaryProducts(primary);
    setVariantProducts(variants);
  }, []);

  const fetchNextCategories = useCallback(async (opts?: { minTotalRaw?: number }) => {
    if (!id) return;
    if (loadingMore) return;
    if (cursor >= categoryIds.length) return;

    setLoadingMore(true);
    try {
      let localCursor = cursor;
      let localRaw = rawItems;

      while (localCursor < categoryIds.length) {
        const batch = categoryIds.slice(localCursor, localCursor + MAX_CONCURRENT);
        const responses = await Promise.all(
          batch.map((categoryId) =>
            shopAPI
              .getProductsByCategory(categoryId, { limit: 80, offset: 0 })
              .then((r) => r.data || [])
              .catch(() => [])
          )
        );

        const flat = responses.flat();
        localRaw = mergeRawItems(localRaw, flat);
        localCursor += batch.length;

        // если нам достаточно для UX — выходим раньше (остальное догрузим по скроллу)
        if (opts?.minTotalRaw && localRaw.length >= opts.minTotalRaw) {
          break;
        }
      }

      setRawItems(localRaw);
      syncDerivedProducts(localRaw);
      setCursor(localCursor);
    } finally {
      setLoadingMore(false);
    }
  }, [categoryIds, cursor, id, loadingMore, mergeRawItems, rawItems, syncDerivedProducts]);

  useEffect(() => {
    let cancelled = false;
    
    const fetchProducts = async () => {
      if (!id) {
        setLoading(false);
        return;
      }

      // reset on id change
      setError(null);
      setLoading(true);
      setLoadingMore(false);
      setCursor(0);
      setRawItems([]);
      setPrimaryProducts([]);
      setVariantProducts([]);
      setDisplayedCount(PAGE_SIZE);
      
      if (categoryLoading && !category) {
        await new Promise(resolve => setTimeout(resolve, 500));
        if (cancelled) return;
      }

      // 1) Если API /shop/category/{id} уже вернул товары, используем их (требование заказчика)
      if (category?.products && Array.isArray(category.products)) {
        const mapped = adaptProductsFromCategory(category.products as any[], { id: category.id, name: category.name });
        const { primaryProducts: primary, variantProducts: variants } = splitProductsIntoPrimaryAndVariants(mapped);
        if (!cancelled) {
          setRawItems(mapped);
          setPrimaryProducts(primary);
          setVariantProducts(variants);
          setDisplayedCount(PAGE_SIZE);
          setLoading(false);
        }
        return;
      }
      
      // 2) Фоллбек: прогрессивно собираем товары по текущей категории и подкатегориям
      try {
        setError(null);
        // быстро подгружаем первые категории до INITIAL_TARGET_ITEMS
        await fetchNextCategories({ minTotalRaw: INITIAL_TARGET_ITEMS });
      } catch (err) {
        if (!cancelled) {
          console.error("Error fetching products:", err);
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
  }, [id, category?.id, category?.parent_id, categoryLoading, subcategoriesKey, t, fetchNextCategories]);

  const totalProductsCount = useMemo(() => primaryProducts.length + variantProducts.length, [primaryProducts.length, variantProducts.length]);

  const hasMore = useMemo(() => {
    // есть ещё что показать ИЛИ есть что догрузить по категориям
    return displayedCount < totalProductsCount || cursor < categoryIds.length;
  }, [displayedCount, totalProductsCount, cursor, categoryIds.length]);

  const loadMore = useCallback(() => {
    if (!hasMore || loading) return;

    // Если у нас уже есть достаточно товаров — просто увеличиваем окно отображения
    if (displayedCount < totalProductsCount) {
      setDisplayedCount((prev) => Math.min(prev + PAGE_SIZE, totalProductsCount));
      return;
    }

    // Если показать нечего, но есть что догрузить — догружаем следующую порцию категорий
    if (cursor < categoryIds.length && !loadingMore) {
      void fetchNextCategories();
    }
  }, [categoryIds.length, cursor, displayedCount, fetchNextCategories, hasMore, loading, loadingMore, totalProductsCount]);

  const { ref: sentinelRef } = useInfiniteScroll({
    hasMore,
    loading: loading || loadingMore,
    onLoadMore: loadMore,
    threshold: 200,
  });

  return (
    <div className="container mx-auto px-4 py-6">
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
            {categoryLoading ? "..." : category?.name || t("catalog.category")}
          </li>
        </ol>
      </nav>

      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-slate-900">
          {categoryLoading ? (
            <div className="h-8 w-48 bg-slate-200 rounded animate-pulse"></div>
          ) : (
            category?.name || t("catalog.category")
          )}
        </h1>
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
            {subcategories.map((sub) => (
              <Link
                key={sub.id}
                to={`/category/${sub.id}`}
                className="px-4 py-2 bg-white border border-slate-200 rounded-full text-sm font-medium text-slate-700 hover:border-[#04734b] hover:text-[#04734b] transition shadow-sm"
              >
                {sub.name}
                <span className="ml-1 text-slate-400">({sub.products_count})</span>
              </Link>
            ))}
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
      ) : totalProductsCount === 0 ? (
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
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {displayedProducts.map((product) => (
              <ProductCard 
                key={`${product.product_id}_${product.variant_id || ''}`} 
                product={product} 
              />
            ))}
          </div>
          <div ref={sentinelRef} className="h-4 w-full" />
          {hasMore && (
            <div className="flex justify-center items-center py-8">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-[#04734b]"></div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default CategoryPage;

