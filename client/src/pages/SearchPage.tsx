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
/** Показывать все совпадения с оценкой от 1%; выше процент — выше в выдаче. */
const MIN_MATCH_PERCENT = 1;

/**
 * Как работает поиск (SearchPage):
 *
 * 1. Запрос: пользователь вводит текст в поисковую строку (Header/SearchBar) и переходит на /search?q=...
 *
 * 2. Бэкенд (referal-shop):
 *    - Регистр не важен: запрос и поля сравниваются в lower(), «Телефон» и «телефон» найдут одно и то же.
 *    - Опечатки: используется расширение PostgreSQL pg_trgm (similarity > 0.15), поэтому похожие
 *      написания и мелкие опечатки тоже находят товары.
 *    - Ищет по: name, name_ru, description_uz, description_ru, SKU варианта (LIKE + триграммы).
 *
 * 3. Загрузка: API shopAPI.searchProducts(query, { offset, limit }) возвращает товары с сервера.
 *
 * 4. Кэш: результаты кэшируются в памяти на 2 мин; повторный тот же запрос — из кэша.
 *
 * 5. Релевантность на фронте: для каждого товара считается оценка совпадения 0–100% между
 *    запросом и названием (product_name, name_ru) по n-граммам (длина 3). Чем выше процент —
 *    тем выше товар в выдаче.
 *
 * 6. Порог показа: показываются все товары с оценкой >= MIN_MATCH_PERCENT (1%).
 *
 * 7. Сортировка: по убыванию релевантности, при равенстве — в наличии выше, затем по цене.
 */

type SearchCacheEntry = {
  time: number;
  raw: any[];
  offset: number;
  hasMore: boolean;
};

const searchCache = new Map<string, SearchCacheEntry>();
const searchInFlight = new Map<string, Promise<any[]>>();

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

      const filtered = scored.filter((s) => s.score >= MIN_MATCH_PERCENT);

      filtered.sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        const aInStock = (a.product.stock ?? 0) > 0;
        const bInStock = (b.product.stock ?? 0) > 0;
        if (aInStock && !bInStock) return -1;
        if (!aInStock && bInStock) return 1;
        return (a.product.price ?? 0) - (b.product.price ?? 0);
      });

      return { products: filtered.map((s) => s.product), scores };
    },
    [calcMatchPercent, queryLower]
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
          const filtered = scored.filter((s) => s.score >= MIN_MATCH_PERCENT);
          filtered.sort((a, b) => {
            if (b.score !== a.score) return b.score - a.score;
            const aInStock = (a.product.stock ?? 0) > 0;
            const bInStock = (b.product.stock ?? 0) > 0;
            if (aInStock && !bInStock) return -1;
            if (!aInStock && bInStock) return 1;
            return (a.product.price ?? 0) - (b.product.price ?? 0);
          });
          setProducts(filtered.map((s) => s.product));
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
        const filtered = scored.filter((s) => s.score >= MIN_MATCH_PERCENT);
        filtered.sort((a, b) => {
          if (b.score !== a.score) return b.score - a.score;
          const aInStock = (a.product.stock ?? 0) > 0;
          const bInStock = (b.product.stock ?? 0) > 0;
          if (aInStock && !bInStock) return -1;
          if (!aInStock && bInStock) return 1;
          return (a.product.price ?? 0) - (b.product.price ?? 0);
        });
        setProducts(filtered.map((s) => s.product));
        setOffset(nextOffset);
        setHasMore(nextHasMore);
      } catch (err: any) {
        if (cancelled) return;
        setError(err?.response?.data?.message || err?.message || t("search.error"));
        setProducts([]);
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
  }, [normalizedQuery, queryLower, calcMatchPercent, t]);

  useEffect(() => {
    if (rawItems.length > 0) {
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
      const filtered = scored.filter((s) => s.score >= MIN_MATCH_PERCENT);
      filtered.sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        const aInStock = (a.product.stock ?? 0) > 0;
        const bInStock = (b.product.stock ?? 0) > 0;
        if (aInStock && !bInStock) return -1;
        if (!aInStock && bInStock) return 1;
        return (a.product.price ?? 0) - (b.product.price ?? 0);
      });
      setProducts(filtered.map((s) => s.product));
    }
  }, [rawItems, queryLower, calcMatchPercent]);

  const [similarProducts, setSimilarProducts] = useState<Product[]>([]);
  const [similarLoading, setSimilarLoading] = useState(false);

  useEffect(() => {
    if (!normalizedQuery || loading || products.length > 0) {
      setSimilarProducts([]);
      return;
    }
    let cancelled = false;
    setSimilarLoading(true);
    shopAPI
      .getSimilarProducts(normalizedQuery, 12)
      .then((res) => {
        if (cancelled) return;
        const payload: any = (res as any)?.data ?? res;
        const data = Array.isArray(payload?.data) ? payload.data : Array.isArray(payload) ? payload : [];
        const { primaryProducts } = splitProductsIntoPrimaryAndVariants(data);
        setSimilarProducts(primaryProducts.slice(0, 12));
      })
      .catch(() => {
        if (!cancelled) setSimilarProducts([]);
      })
      .finally(() => {
        if (!cancelled) setSimilarLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [normalizedQuery, loading, products.length]);

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
          <>
            <div className="rounded-2xl border border-gray-200 bg-gray-50 p-8 text-center mb-8">
              <p className="text-lg text-slate-600">{t("search.noProductsMessage")}</p>
            </div>
            <div>
              <h2 className="text-xl font-semibold text-slate-900 mb-4">{t("search.similarProductsTitle")}</h2>
              {similarLoading ? (
                <div className="rounded-2xl border border-gray-200 p-6">
                  <SkeletonGrid count={8} columns={4} />
                </div>
              ) : similarProducts.length > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {similarProducts.map((product) => {
                    const key = product.variant_id
                      ? `${product.product_id}-${product.variant_id}`
                      : `${product.product_id}`;
                    return <ProductCard key={key} product={product} />;
                  })}
                </div>
              ) : null}
            </div>
          </>
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
                  />
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

