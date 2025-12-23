import { useCallback, useEffect, useMemo, useState } from "react";
import i18n from "../i18n";
import { shopAPI } from "../services/api";
import type { Product } from "../types";
import { logger } from "../utils/logger";
import { handleApiError, getUserFriendlyMessage } from "../utils/errorHandler";

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const MAX_CONCURRENT = 4;

type CacheEntry = {
  time: number;
  product: Product;
  promise: Promise<Product> | null;
};

const cache = new Map<string, CacheEntry>();

function mapProductDetailToProduct(data: any): Product {
  const firstVariant = Array.isArray(data?.variants) ? data.variants[0] : null;
  return {
    product_id: String(data?.id || data?.product_id || ""),
    product_name: data?.name || data?.product_name || "",
    product_description: data?.description || data?.product_description || "",
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
  };
}

async function fetchOne(productId: string): Promise<Product> {
  const key = String(productId || "");
  const now = Date.now();
  const entry = cache.get(key);
  if (entry?.product && now - entry.time < CACHE_TTL) {
    return entry.product;
  }
  if (entry?.promise) {
    return entry.promise;
  }

  const promise = shopAPI
    .getProductById(key)
    .then((res) => mapProductDetailToProduct((res as any)?.data ?? res))
    .then((product) => {
      cache.set(key, { time: Date.now(), product, promise: null });
      return product;
    })
    .catch((e) => {
      cache.delete(key);
      throw e;
    });

  cache.set(key, { time: 0, product: null as unknown as Product, promise });
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
  }, [normalized]);

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


