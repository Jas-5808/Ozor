import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { shopAPI } from "../services/api";
import { Product } from "../types";
import ProductCard from "../components/ui/ProductCard";
import useSEO from "../hooks/useSEO";
import SkeletonGrid from "../components/SkeletonGrid";
import { splitProductsIntoPrimaryAndVariants } from "../utils/productUtils";

const LIMIT = 20;
const SEARCH_CACHE_TTL = 2 * 60 * 1000; // 2 minutes

type SearchCacheEntry = {
  time: number;
  raw: any[];
  offset: number;
  hasMore: boolean;
};

const searchCache = new Map<string, SearchCacheEntry>();
const searchInFlight = new Map<string, Promise<any[]>>();
const searchLoadMoreInFlight = new Map<string, Promise<any[]>>();

export function SearchPage() {
  const [searchParams] = useSearchParams();
  const query = searchParams.get("q") || "";
  const { t } = useTranslation();
  const [products, setProducts] = useState<Product[]>([]);
  const [rawItems, setRawItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  const normalizedQuery = useMemo(() => query.trim(), [query]);
  const queryLower = useMemo(() => normalizedQuery.toLowerCase(), [normalizedQuery]);
  const origin = typeof window !== "undefined" ? window.location.origin : "";

  useSEO({
    title: query ? `${t("search.title")}: ${query} — OZAR` : t("search.title") + " — OZAR",
    description: query ? `${t("search.title")}: ${query}` : t("search.title"),
    robots: "noindex,follow",
    canonical: origin ? `${origin}/search` : undefined,
  });

  const computeProducts = useCallback(
    (items: any[]) => {
      const { primaryProducts } = splitProductsIntoPrimaryAndVariants(items);

      // Сортируем: сначала совпадения по названию, затем товары в наличии
      const sorted = [...primaryProducts].sort((a, b) => {
        const aNameMatch = a.product_name?.toLowerCase().includes(queryLower) || false;
        const bNameMatch = b.product_name?.toLowerCase().includes(queryLower) || false;
        if (aNameMatch && !bNameMatch) return -1;
        if (!aNameMatch && bNameMatch) return 1;

        const aInStock = (a.stock ?? 0) > 0;
        const bInStock = (b.stock ?? 0) > 0;
        if (aInStock && !bInStock) return -1;
        if (!aInStock && bInStock) return 1;

        return (a.price ?? 0) - (b.price ?? 0);
      });

      return sorted;
    },
    [queryLower]
  );

  useEffect(() => {
    let cancelled = false;

    const fetchProducts = async () => {
      if (!normalizedQuery) {
        setProducts([]);
        setRawItems([]);
        setLoading(false);
        setError(null);
        return;
      }

      setLoading(true);
      setError(null);
      setOffset(0);
      setHasMore(true);

      try {
        const now = Date.now();
        const cached = searchCache.get(normalizedQuery);
        if (cached && (now - cached.time) < SEARCH_CACHE_TTL) {
          if (cancelled) return;
          setRawItems(cached.raw);
          setProducts(computeProducts(cached.raw));
          setOffset(cached.offset);
          setHasMore(cached.hasMore);
          return;
        }

        const existing = searchInFlight.get(normalizedQuery);
        const promise =
          existing ??
          (async () => {
            const response = await shopAPI.searchProducts(normalizedQuery, {
              offset: 0,
              limit: LIMIT,
            });
            return response.data || [];
          })();

        if (!existing) {
          searchInFlight.set(normalizedQuery, promise);
        }

        const data = await promise;
        searchInFlight.delete(normalizedQuery);
        if (cancelled) return;

        const nextOffset = data.length;
        const nextHasMore = data.length === LIMIT;

        searchCache.set(normalizedQuery, {
          time: Date.now(),
          raw: data,
          offset: nextOffset,
          hasMore: nextHasMore,
        });

        setRawItems(data);
        setProducts(computeProducts(data));
        setOffset(nextOffset);
        setHasMore(nextHasMore);
      } catch (err: any) {
        if (cancelled) return;
        setError(err?.response?.data?.message || err?.message || t("search.error"));
        setProducts([]);
        setRawItems([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchProducts();
    return () => {
      cancelled = true;
    };
  }, [computeProducts, normalizedQuery, t]);

  const loadMore = useCallback(async () => {
    if (loading || !hasMore || !normalizedQuery) return;

    setLoading(true);
    try {
      const key = `${normalizedQuery}:${offset}`;
      const existing = searchLoadMoreInFlight.get(key);
      const promise =
        existing ??
        (async () => {
          const response = await shopAPI.searchProducts(normalizedQuery, {
            offset,
            limit: LIMIT,
          });
          return response.data || [];
        })();

      if (!existing) {
        searchLoadMoreInFlight.set(key, promise);
      }

      const data = await promise;
      searchLoadMoreInFlight.delete(key);

      const existingKeys = new Set(
        rawItems.map((it: any) => `${it?.product_id || it?.id || ""}_${it?.variant_id || it?.variantId || ""}`)
      );
      const merged = rawItems.slice();
      for (const item of data) {
        const k = `${item?.product_id || item?.id || ""}_${item?.variant_id || item?.variantId || ""}`;
        if (!existingKeys.has(k)) {
          existingKeys.add(k);
          merged.push(item);
        }
      }

      const nextOffset = offset + data.length;
      const nextHasMore = data.length === LIMIT;

      searchCache.set(normalizedQuery, {
        time: Date.now(),
        raw: merged,
        offset: nextOffset,
        hasMore: nextHasMore,
      });

      setRawItems(merged);
      setProducts(computeProducts(merged));
      setOffset(nextOffset);
      setHasMore(nextHasMore);
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || t("search.error"));
    } finally {
      setLoading(false);
    }
  }, [computeProducts, hasMore, loading, normalizedQuery, offset, rawItems, t]);

  // Подсчет уникальных категорий
  const uniqueCategoriesCount = useMemo(() => {
    const categoryIds = new Set<string>();
    products.forEach((product) => {
      if (product.category?.id) {
        categoryIds.add(product.category.id);
      }
    });
    return categoryIds.size;
  }, [products]);

  if (!normalizedQuery) {
    return (
      <div className="container mx-auto px-4 py-6">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-2xl font-bold text-slate-900 mb-4">{t("search.title")}</h1>
          <p className="text-slate-600">{t("search.emptyQuery")}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          {products.length > 0 && (
            <h1 className="text-2xl md:text-3xl font-bold text-slate-900 mb-2">
              {t("search.foundInCategories", { 
                productsCount: products.length, 
                categoriesCount: uniqueCategoriesCount 
              })}
            </h1>
          )}
        </div>

        {loading && products.length === 0 && (
          <div className="rounded-2xl border border-gray-200 p-6">
            <SkeletonGrid count={8} columns={4} />
          </div>
        )}

        {error && (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
            {error}
          </div>
        )}

        {!loading && !error && products.length === 0 && (
          <div className="rounded-2xl border border-gray-200 bg-gray-50 p-8 text-center">
            <p className="text-lg text-slate-600 mb-2">{t("search.noResults")}</p>
            <p className="text-sm text-slate-500">{t("search.tryDifferent")}</p>
          </div>
        )}

        {products.length > 0 && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-6">
              {products.map((product) => (
                <ProductCard key={`${product.product_id}-${product.variant_id}`} product={product} />
              ))}
            </div>

            {hasMore && (
              <div className="text-center">
                <button
                  onClick={loadMore}
                  disabled={loading}
                  className="px-6 py-3 rounded-2xl bg-white border border-gray-200 text-slate-700 font-semibold hover:bg-gray-50 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? t("search.loading") : t("search.loadMore")}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

