import { useState, useEffect, useMemo, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { shopAPI } from "../services/api";
import { Product } from "../types";
import ProductCard from "../components/ui/ProductCard";
import useSEO from "../hooks/useSEO";
import SkeletonGrid from "../components/SkeletonGrid";
import { splitProductsIntoPrimaryAndVariants } from "../utils/productUtils";
import { SEARCH_PAGE_LIMIT } from "../config/pagination";
const SEARCH_CACHE_TTL = 2 * 60 * 1000; // 2 minutes
const NGRAM_SIZE = 3;

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
  const [matchScores, setMatchScores] = useState<Record<string, number>>({});
  const [minMatchPercent, setMinMatchPercent] = useState<number>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("searchMinMatchPercent");
      return saved ? Number(saved) : 0;
    }
    return 0;
  });
  const [hiddenCount, setHiddenCount] = useState<number>(0);

  const normalizedQuery = useMemo(() => query.trim(), [query]);
  const queryLower = useMemo(() => normalizedQuery.toLowerCase(), [normalizedQuery]);
  const origin = typeof window !== "undefined" ? window.location.origin : "";

  useSEO({
    title: query ? `${t("search.title")}: ${query} — OZAR` : t("search.title") + " — OZAR",
    description: query ? `${t("search.title")}: ${query}` : t("search.title"),
    robots: "noindex,follow",
    canonical: origin ? `${origin}/search` : undefined,
  });

  const normalizeText = useCallback((value: string) => {
    return value
      .toLowerCase()
      .replace(/[^a-z0-9а-яё]+/gi, "")
      .trim();
  }, []);

  const toNgrams = useCallback((value: string) => {
    const normalized = normalizeText(value);
    if (!normalized) return [];
    if (normalized.length <= NGRAM_SIZE) return [normalized];
    const grams: string[] = [];
    for (let i = 0; i <= normalized.length - NGRAM_SIZE; i += 1) {
      grams.push(normalized.slice(i, i + NGRAM_SIZE));
    }
    return grams;
  }, [normalizeText]);

  const calcMatchPercent = useCallback(
    (queryValue: string, targetValue: string) => {
      const q = normalizeText(queryValue);
      const t = normalizeText(targetValue);
      if (!q || !t) return 0;
      if (q === t) return 100;
      const qGrams = new Set(toNgrams(q));
      const tGrams = new Set(toNgrams(t));
      if (qGrams.size === 0 || tGrams.size === 0) return 0;
      let inter = 0;
      qGrams.forEach((g) => {
        if (tGrams.has(g)) inter += 1;
      });
      const union = qGrams.size + tGrams.size - inter;
      return union ? Math.round((inter / union) * 100) : 0;
    },
    [normalizeText, toNgrams]
  );

  const computeProducts = useCallback(
    (items: any[]) => {
      const { primaryProducts } = splitProductsIntoPrimaryAndVariants(items);
      const scores: Record<string, number> = {};

      const scored = primaryProducts.map((product) => {
        const nameUz = product.product_name || "";
        const nameRu = product.name_ru || "";
        const score = Math.max(
          calcMatchPercent(queryLower, nameUz),
          calcMatchPercent(queryLower, nameRu)
        );
        const key = product.variant_id
          ? `${product.product_id}-${product.variant_id}`
          : `${product.product_id}`;
        scores[key] = score;
        return { product, score };
      });

      const filtered = scored.filter((s) => s.score >= minMatchPercent);
      const hidden = scored.length - filtered.length;

      filtered.sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        const aInStock = (a.product.stock ?? 0) > 0;
        const bInStock = (b.product.stock ?? 0) > 0;
        if (aInStock && !bInStock) return -1;
        if (!aInStock && bInStock) return 1;
        return (a.product.price ?? 0) - (b.product.price ?? 0);
      });

      return { products: filtered.map((s) => s.product), scores, hidden };
    },
    [calcMatchPercent, queryLower, minMatchPercent]
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
          // Пересчитываем локально без зависимости от computeProducts
          const { primaryProducts } = splitProductsIntoPrimaryAndVariants(cached.raw);
          const scores: Record<string, number> = {};
          const scored = primaryProducts.map((product) => {
            const nameUz = product.product_name || "";
            const nameRu = product.name_ru || "";
            const score = Math.max(
              calcMatchPercent(queryLower, nameUz),
              calcMatchPercent(queryLower, nameRu)
            );
            const key = product.variant_id
              ? `${product.product_id}-${product.variant_id}`
              : `${product.product_id}`;
            scores[key] = score;
            return { product, score };
          });
          const filtered = scored.filter((s) => s.score >= minMatchPercent);
          const hidden = scored.length - filtered.length;
          filtered.sort((a, b) => {
            if (b.score !== a.score) return b.score - a.score;
            const aInStock = (a.product.stock ?? 0) > 0;
            const bInStock = (b.product.stock ?? 0) > 0;
            if (aInStock && !bInStock) return -1;
            if (!aInStock && bInStock) return 1;
            return (a.product.price ?? 0) - (b.product.price ?? 0);
          });
          setProducts(filtered.map((s) => s.product));
          setMatchScores(scores);
          setHiddenCount(hidden);
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
              limit: SEARCH_PAGE_LIMIT,
            });
            const payload: any = (response as any)?.data ?? response;
            return Array.isArray(payload?.data) ? payload.data : Array.isArray(payload) ? payload : [];
          })();

        if (!existing) {
          searchInFlight.set(normalizedQuery, promise);
        }

        const data = await promise;
        if (cancelled) return;

        const nextOffset = data.length;
        const nextHasMore = data.length > 0;

        searchCache.set(normalizedQuery, {
          time: Date.now(),
          raw: data,
          offset: nextOffset,
          hasMore: nextHasMore,
        });

        setRawItems(data);
        // Пересчитываем локально без зависимости от computeProducts
        const { primaryProducts } = splitProductsIntoPrimaryAndVariants(data);
        const scores: Record<string, number> = {};
        const scored = primaryProducts.map((product) => {
          const nameUz = product.product_name || "";
          const nameRu = product.name_ru || "";
          const score = Math.max(
            calcMatchPercent(queryLower, nameUz),
            calcMatchPercent(queryLower, nameRu)
          );
          const key = product.variant_id
            ? `${product.product_id}-${product.variant_id}`
            : `${product.product_id}`;
          scores[key] = score;
          return { product, score };
        });
        const filtered = scored.filter((s) => s.score >= minMatchPercent);
        const hidden = scored.length - filtered.length;
        filtered.sort((a, b) => {
          if (b.score !== a.score) return b.score - a.score;
          const aInStock = (a.product.stock ?? 0) > 0;
          const bInStock = (b.product.stock ?? 0) > 0;
          if (aInStock && !bInStock) return -1;
          if (!aInStock && bInStock) return 1;
          return (a.product.price ?? 0) - (b.product.price ?? 0);
        });
        setProducts(filtered.map((s) => s.product));
        setMatchScores(scores);
        setHiddenCount(hidden);
        setOffset(nextOffset);
        setHasMore(nextHasMore);
      } catch (err: any) {
        if (cancelled) return;
        setError(err?.response?.data?.message || err?.message || t("search.error"));
        setProducts([]);
        setMatchScores({});
        setRawItems([]);
      } finally {
        searchInFlight.delete(normalizedQuery);
        if (!cancelled) setLoading(false);
      }
    };

    fetchProducts();
    return () => {
      cancelled = true;
    };
  }, [normalizedQuery, queryLower, minMatchPercent, calcMatchPercent, t]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("searchMinMatchPercent", minMatchPercent.toString());
    }
  }, [minMatchPercent]);

  useEffect(() => {
    if (rawItems.length > 0) {
      // Пересчитываем локально без зависимости от computeProducts
      const { primaryProducts } = splitProductsIntoPrimaryAndVariants(rawItems);
      const scores: Record<string, number> = {};
      const scored = primaryProducts.map((product) => {
        const nameUz = product.product_name || "";
        const nameRu = product.name_ru || "";
        const score = Math.max(
          calcMatchPercent(queryLower, nameUz),
          calcMatchPercent(queryLower, nameRu)
        );
        const key = product.variant_id
          ? `${product.product_id}-${product.variant_id}`
          : `${product.product_id}`;
        scores[key] = score;
        return { product, score };
      });
      const filtered = scored.filter((s) => s.score >= minMatchPercent);
      const hidden = scored.length - filtered.length;
      filtered.sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        const aInStock = (a.product.stock ?? 0) > 0;
        const bInStock = (b.product.stock ?? 0) > 0;
        if (aInStock && !bInStock) return -1;
        if (!aInStock && bInStock) return 1;
        return (a.product.price ?? 0) - (b.product.price ?? 0);
      });
      setProducts(filtered.map((s) => s.product));
      setMatchScores(scores);
      setHiddenCount(hidden);
    }
  }, [minMatchPercent, rawItems, queryLower, calcMatchPercent]);

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
            limit: SEARCH_PAGE_LIMIT,
          });
          const payload: any = (response as any)?.data ?? response;
          return Array.isArray(payload?.data) ? payload.data : Array.isArray(payload) ? payload : [];
        })();

      if (!existing) {
        searchLoadMoreInFlight.set(key, promise);
      }

      const data = await promise;

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
      const grew = merged.length > rawItems.length;
      const nextHasMore = data.length > 0 && grew;

      searchCache.set(normalizedQuery, {
        time: Date.now(),
        raw: merged,
        offset: nextOffset,
        hasMore: nextHasMore,
      });

      setRawItems(merged);
      const computed = computeProducts(merged);
      setProducts(computed.products);
      setMatchScores(computed.scores);
      setHiddenCount(computed.hidden);
      setOffset(nextOffset);
      setHasMore(nextHasMore);
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || t("search.error"));
    } finally {
      searchLoadMoreInFlight.delete(key);
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
            <>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-2">
                <h1 className="text-2xl md:text-3xl font-bold text-slate-900">
                  {t("search.foundInCategories", { 
                    productsCount: products.length, 
                    categoriesCount: uniqueCategoriesCount 
                  })}
                </h1>
                <div className="flex items-center gap-2">
                  <label className="text-xs text-slate-600 whitespace-nowrap">
                    {t("search.minMatch", "Мин. совпадение")}:
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={minMatchPercent}
                    onChange={(e) => setMinMatchPercent(Number(e.target.value))}
                    className="flex-1 h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-emerald-600"
                  />
                  <span className="text-xs font-semibold text-slate-700 min-w-12 text-right">
                    {minMatchPercent}%
                  </span>
                </div>
              </div>
              {minMatchPercent > 0 && hiddenCount > 0 && (
                <div className="text-sm text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-2 inline-block">
                  {t("search.hiddenProducts", "Скрыто товаров: {count}", { 
                    count: hiddenCount
                  })}
                </div>
              )}
            </>
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
              {products.map((product) => {
                const key = product.variant_id
                  ? `${product.product_id}-${product.variant_id}`
                  : `${product.product_id}`;
                return (
                  <ProductCard
                    key={key}
                    product={product}
                    matchPercent={matchScores[key]}
                  />
                );
              })}
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

