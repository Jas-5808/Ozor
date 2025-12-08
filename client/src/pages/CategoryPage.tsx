import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { shopAPI } from "../services/api";
import { useCategoryById, useCategories, getAllSubcategories } from "../hooks/useCategories";
import { Product } from "../types";
import ProductCard from "../components/ui/ProductCard";
import useSEO from "../hooks/useSEO";
import SkeletonGrid from "../components/SkeletonGrid";
import { useInfiniteScroll } from "../hooks/useInfiniteScroll";
import { buildDisplayProducts, splitProductsIntoPrimaryAndVariants } from "../utils/productUtils";

const PAGE_SIZE = 20;

export function CategoryPage() {
  const { id } = useParams<{ id: string }>();
  const { t } = useTranslation();
  const { category, loading: categoryLoading, error: categoryError } = useCategoryById(id);
  const { categories } = useCategories();
  const [primaryProducts, setPrimaryProducts] = useState<Product[]>([]);
  const [variantProducts, setVariantProducts] = useState<Product[]>([]);
  const [displayedCount, setDisplayedCount] = useState<number>(PAGE_SIZE);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useSEO({
    title: category ? `${category.name} — OZAR` : "Категория — OZAR",
    robots: "index,follow",
    canonical: typeof window !== "undefined" ? window.location.href : undefined,
  });

  // Получаем подкатегории для текущей категории - мемоизировано
  const subcategories = useMemo(() => {
    return id ? getAllSubcategories(categories, id) : [];
  }, [id, categories]);
  
  // Создаем стабильный ключ для подкатегорий (для зависимостей useEffect)
  const subcategoriesKey = useMemo(() => {
    return subcategories.map(s => s.id).sort().join(',');
  }, [subcategories]);

  useEffect(() => {
    let cancelled = false;
    
    const fetchProducts = async () => {
      if (!id) {
        setLoading(false);
        return;
      }
      
      if (categoryLoading && !category) {
        await new Promise(resolve => setTimeout(resolve, 500));
        if (cancelled) return;
      }
      
      try {
        setLoading(true);
        setError(null);
        
        const collectedProducts: any[] = [];
        const categoryIdsSet = new Set<string>([id]);

        // Добавляем все вложенные подкатегории, чтобы категория показывала товары дочерних уровней
        subcategories.forEach(sub => {
          categoryIdsSet.add(sub.id);
        });

        const categoryIds = Array.from(categoryIdsSet);

        const MAX_CONCURRENT = 5;
        const allResponses: any[] = [];

        for (let i = 0; i < categoryIds.length; i += MAX_CONCURRENT) {
          const batch = categoryIds.slice(i, i + MAX_CONCURRENT);
          const productPromises = batch.map(categoryId =>
            shopAPI.getProductsByCategory(categoryId).catch(err => {
              console.warn(`Failed to fetch products for category ${categoryId}:`, err);
              return { data: [] };
            })
          );

          const responses = await Promise.all(productPromises);
          if (cancelled) return;

          allResponses.push(...responses);
        }

        allResponses.forEach(response => {
          const items = response.data || [];
          if (Array.isArray(items)) {
            collectedProducts.push(...items);
          }
        });

        // Убираем дубликаты (одинаковый product_id + variant_id), чтобы не плодить карточки и не ломать пагинацию
        const uniqueMap = new Map<string, any>();
        for (const item of collectedProducts) {
          const key = `${item?.product_id || item?.id || "unknown"}_${item?.variant_id || item?.variantId || ""}`;
          if (!uniqueMap.has(key)) {
            uniqueMap.set(key, item);
          }
        }
        const uniqueProducts = Array.from(uniqueMap.values());
        
        if (cancelled) return;
        
        const { primaryProducts: primary, variantProducts: variants } = splitProductsIntoPrimaryAndVariants(uniqueProducts);
        
        if (!cancelled) {
          setPrimaryProducts(primary);
          setVariantProducts(variants);
          setDisplayedCount(PAGE_SIZE);
        }
      } catch (err) {
        if (!cancelled) {
          console.error("Error fetching products:", err);
          setError(t("common.errors.productsLoad"));
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    fetchProducts();
    
    return () => {
      cancelled = true;
    };
  }, [id, category?.id, category?.parent_id, categoryLoading, subcategoriesKey, t]);

  const totalProductsCount = useMemo(() => primaryProducts.length + variantProducts.length, [primaryProducts.length, variantProducts.length]);

  const displayedProducts = useMemo(() => {
    return buildDisplayProducts(primaryProducts, variantProducts, displayedCount);
  }, [primaryProducts, variantProducts, displayedCount]);

  const hasMore = useMemo(() => {
    return displayedCount < totalProductsCount;
  }, [displayedCount, totalProductsCount]);

  const loadMore = useCallback(() => {
    if (hasMore && !loading) {
      setDisplayedCount(prev => Math.min(prev + PAGE_SIZE, totalProductsCount));
    }
  }, [hasMore, loading, totalProductsCount]);

  const sentinelRef = useInfiniteScroll({
    hasMore,
    loading,
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

