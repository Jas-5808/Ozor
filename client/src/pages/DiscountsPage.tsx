import React, { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import useSEO from "../hooks/useSEO";
import ProductCard from "../components/ui/ProductCard";
import { shopAPI } from "../services/api";
import { transformProductFromApi } from "../utils/productUtils";

const PAGE_SIZE = 12;

export function DiscountsPage() {
  const { t, i18n } = useTranslation();
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  useSEO({
    title: t("home.discounts") + " — OZAR",
    description: t("home.seoDescription"),
    canonical: typeof window !== "undefined" ? window.location.origin + "/discounts" : undefined,
  });

  const loadPage = useCallback(async (off: number, append: boolean) => {
    if (append) setLoadingMore(true);
    else setLoading(true);
    try {
      const res = await shopAPI.getDiscountProducts({ offset: off, limit: PAGE_SIZE });
      const list = Array.isArray(res?.data) ? res.data : [];
      const transformed = list.map(transformProductFromApi);
      if (append) {
        setProducts((prev) => [...prev, ...transformed]);
      } else {
        setProducts(transformed);
      }
      setHasMore(list.length >= PAGE_SIZE);
      setOffset(off + list.length);
    } catch {
      setHasMore(false);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);

  useEffect(() => {
    loadPage(0, false);
  }, [loadPage]);

  const loadMore = () => {
    if (loadingMore || !hasMore) return;
    loadPage(offset, true);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="container mx-auto px-4 py-6">
        <div className="flex items-center gap-4 mb-6">
          <Link
            to="/"
            className="p-2 rounded-lg hover:bg-white/80 transition"
            aria-label={t("common.actions.back")}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-800">{t("home.discounts")}</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              {t("home.discountsOnlySubtitle")}
            </p>
          </div>
        </div>

        {loading && products.length === 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4 min-h-[320px] place-items-center">
            <div className="col-span-full flex justify-center py-12">
              <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-blue-500" />
            </div>
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <p>{t("common.errors.noProducts") || "Товары не найдены"}</p>
            <Link to="/" className="mt-4 inline-block text-blue-600 hover:underline">
              {t("common.navigation.home")}
            </Link>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4 items-stretch">
              {products.map((product) => (
                <ProductCard
                  key={
                    product.variant_id
                      ? `${product.product_id}_${product.variant_id}`
                      : product.product_id
                  }
                  product={product}
                  locale={i18n.language}
                />
              ))}
            </div>
            {hasMore && (
              <div className="flex justify-center mt-8">
                <button
                  type="button"
                  onClick={loadMore}
                  disabled={loadingMore}
                  className="px-6 py-3 rounded-xl bg-blue-500 text-white font-medium hover:bg-blue-600 disabled:opacity-50 transition"
                >
                  {loadingMore
                    ? t("common.loading") || "Загрузка…"
                    : t("home.moreProducts")}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default DiscountsPage;
