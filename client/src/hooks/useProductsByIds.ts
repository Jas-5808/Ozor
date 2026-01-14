import { useCallback, useEffect, useMemo, useState } from "react";
import i18n from "../i18n";
import { shopAPI } from "../services/api";
import type { Product } from "../types";
import { logger } from "../utils/logger";
import { handleApiError, getUserFriendlyMessage } from "../utils/errorHandler";
import { resolveProductDescription, resolveProductName } from "../utils/productUtils";

const getLocaleKey = () => (i18n.language?.split("-")[0] || "ru").toLowerCase();

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const MAX_CONCURRENT = 4;

type CacheEntry = {
  time: number;
  product: Product;
  raw: any;
  language: string;
  promise: Promise<Product> | null;
};

const cache = new Map<string, CacheEntry>();

function mapProductDetailToProduct(data: any): Product {
  const payload = data?.data ?? data;
  const firstVariant = Array.isArray(payload?.variants) ? payload.variants[0] : null;
  return {
    product_id: String(payload?.id || payload?.product_id || ""),
    product_name: resolveProductName(payload),
    product_description: resolveProductDescription(payload),
    name_uz: payload?.name_uz || payload?.name || payload?.product_name || payload?.product_name_uz,
    name_ru: payload?.name_ru || payload?.product_name_ru,
    description_uz: payload?.description_uz || payload?.product_description_uz || payload?.description || payload?.product_description,
    description_ru: payload?.description_ru || payload?.product_description_ru || payload?.description || payload?.product_description,
    category: payload?.category || { id: String(payload?.category_id || ""), name: String(payload?.category_name || "") },
    refferal_price: Number(payload?.refferal_price || 0),
    base_price: Number(firstVariant?.base_price ?? payload?.base_price ?? null),
    main_image: payload?.main_image || "",
    variant_id: String(firstVariant?.id || payload?.variant_id || ""),
    variant_sku: String(firstVariant?.sku || payload?.variant_sku || ""),
    price: Number(firstVariant?.price ?? payload?.price ?? payload?.base_price ?? 0),
    stock: Number(firstVariant?.stock ?? payload?.stock ?? 0),
    variant_attributes: Array.isArray(firstVariant?.attribute_values)
      ? firstVariant.attribute_values
      : Array.isArray(payload?.variant_attributes)
      ? payload.variant_attributes
      : [],
    variant_media: Array.isArray(firstVariant?.media)
      ? firstVariant.media
      : Array.isArray(payload?.variant_media)
      ? payload.variant_media
      : [],
  };
}

async function fetchOne(productId: string): Promise<Product> {
  const key = String(productId || "");
  const now = Date.now();
  const locale = getLocaleKey();
  const entry = cache.get(key);
  if (entry?.product && now - entry.time < CACHE_TTL) {
    if (entry.language === locale) {
      return entry.product;
    }
    if (entry.raw) {
      const product = mapProductDetailToProduct(entry.raw);
      cache.set(key, { ...entry, product, language: locale });
      return product;
    }
  }
  if (entry?.promise) {
    return entry.promise;
  }

  const promise = shopAPI
    .getProductById(key)
    .then((res) => {
      const raw = (res as any)?.data ?? res;
      const product = mapProductDetailToProduct(raw);
      const resolvedLocale = getLocaleKey();
      cache.set(key, { time: Date.now(), product, raw, language: resolvedLocale, promise: null });
      return product;
    })
    .catch((e) => {
      cache.delete(key);
      throw e;
    });

  cache.set(key, { time: 0, product: null as unknown as Product, raw: null, language: locale, promise });
  return promise;
}

async function runWithConcurrency<T>(tasks: Array<() => Promise<T>>, limit: number): Promise<T[]> {
  const results: T[] = new Array(tasks.length);
  let idx = 0;

  const workers = new Array(Math.min(limit, tasks.length)).fill(0).map(async () => {
    while (idx < tasks.length) {
      const current = idx++;
      results[current] = await tasks[current]();
    }
  });

  await Promise.all(workers);
  return results;
}

export function useProductsByIds(productIds: string[]) {
  const normalized = useMemo(() => {
    const ids = (productIds || [])
      .map((id) => String(id || "").trim())
      .filter(Boolean);
    return Array.from(new Set(ids)).sort();
  }, [productIds]);
  const locale = getLocaleKey();

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (normalized.length === 0) {
      setProducts([]);
      setError(null);
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      setError(null);

      const tasks = normalized.map((id) => () => fetchOne(id));
      const data = await runWithConcurrency(tasks, MAX_CONCURRENT);
      setProducts(data);
    } catch (e) {
      const appError = handleApiError(e);
      const msg = getUserFriendlyMessage(appError) || i18n.t("common.errors.productsLoad");
      setError(msg);
      logger.errorWithContext(appError, { context: "useProductsByIds" });
    } finally {
      setLoading(false);
    }
  }, [normalized, locale]);

  useEffect(() => {
    let cancelled = false;
    load().finally(() => {
      if (cancelled) return;
    });
    return () => {
      cancelled = true;
    };
  }, [load]);

  return { products, loading, error, refetch: load };
}


