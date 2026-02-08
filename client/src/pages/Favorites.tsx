import React from "react";
import { useTranslation } from "react-i18next";
import cn from "./style.module.scss";
import ProductCard from "../components/ui/ProductCard";
import { useApp } from "../context/AppContext";
import { useProductsByIds } from "../hooks/useProductsByIds";
import { useProductsPaged } from "../hooks/useProducts";
import useSEO from "../hooks/useSEO";

export function Favorites() {
  const { t, i18n } = useTranslation();
  useSEO({
    title: t("favorites.seoTitle"),
    robots: "noindex,nofollow",
    canonical:
      typeof window !== "undefined" ? window.location.origin + "/favorites" : undefined,
  });
  const { state } = useApp();

  const likedIds = state.likedProducts;
  const likedProductIds = React.useMemo(() => {
    const ids = new Set<string>();
    likedIds.forEach((key) => {
      const raw = String(key || "");
      const productId = raw.includes("_") ? raw.split("_")[0] : raw;
      if (productId) ids.add(productId);
    });
    return Array.from(ids);
  }, [likedIds]);

  const { products: likedProducts, loading, error, refetch } = useProductsByIds(likedProductIds);
  const {
    products: catalogProducts,
    loading: catalogLoading,
    error: catalogError,
    hasMore: catalogHasMore,
    loadMore: loadMoreCatalog,
  } = useProductsPaged();

  const loadMoreRef = React.useRef<HTMLDivElement | null>(null);

  const recommendedProducts = React.useMemo(() => {
    const likedSet = new Set(likedProductIds);
    return catalogProducts
      .filter((product: any) => {
        const productId = String(product?.product_id || "");
        return productId && !likedSet.has(productId);
      });
  }, [catalogProducts, likedProductIds]);

  const isCatalogInitialLoading = catalogLoading && catalogProducts.length === 0;

  React.useEffect(() => {
    if (!catalogHasMore || catalogLoading || !loadMoreRef.current) return;
    const node = loadMoreRef.current;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          loadMoreCatalog();
        }
      },
      { rootMargin: "200px" }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [catalogHasMore, catalogLoading, loadMoreCatalog]);

  if (loading) {
    return (
      <div className={cn.loading_container}>
        <div className={cn.loading_spinner} />
        <p>{t("favorites.loading")}</p>
      </div>
    );
  }
  if (error) {
    return (
      <div className={cn.error_container}>
        <p>{t("favorites.error", { message: String(error) })}</p>
        <button onClick={refetch} className={cn.retry_button}>
          {t("favorites.retry")}
        </button>
      </div>
    );
  }

  return (
    <div className="container mx-auto">
      <div className={`${cn.main} mx-auto`}>
        <div className={cn.main_content}>
          {likedProducts.length === 0 ? (
            <div className="grid gap-3 p-6 bg-white border border-gray-200 rounded-2xl shadow-[0_8px_30px_rgba(0,0,0,0.04)]">
              <div className="flex items-center gap-2 mb-2">
                <svg className="w-6 h-6 text-red-500" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                </svg>
                <h2 className="m-0 text-[22px] font-extrabold text-slate-900">
                  {t("favorites.title")}
                </h2>
              </div>
              <div className="grid place-items-center py-6 text-slate-500">
                {t("favorites.empty")}
              </div>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2 mb-4">
                <svg className="w-6 h-6 text-red-500" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                </svg>
                <h2 className="m-0 text-[22px] font-extrabold text-slate-900">
                  {t("favorites.title")}
                </h2>
              </div>
              <div className={`${cn.products_grid} px-3 sm:px-0`}>
                {likedProducts.map((product: any) => {
                  // Создаем уникальный ключ на основе product_id и variant_id
                  const uniqueKey = product.variant_id 
                    ? `${product.product_id}_${product.variant_id}` 
                    : product.product_id;
                  return (
                    <ProductCard
                      key={uniqueKey}
                      product={product}
                      isLiked={true}
                      locale={i18n.language}
                    />
                  );
                })}
              </div>
              <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-4 md:p-5 shadow-sm">
                <h3 className="text-base sm:text-lg font-bold text-slate-900">
                  {t("product.sections.recommendations")}
                </h3>

                {isCatalogInitialLoading && (
                  <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4 px-3 sm:px-0">
                    {Array.from({ length: 8 }).map((_, i) => (
                      <div key={i} className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                        <div className="h-32 rounded-xl bg-slate-200/60" />
                        <div className="mt-3 h-4 w-2/3 rounded bg-slate-200/70" />
                        <div className="mt-2 h-4 w-1/3 rounded bg-slate-200/70" />
                      </div>
                    ))}
                  </div>
                )}

                {catalogError && catalogProducts.length === 0 && (
                  <p className="mt-2 text-sm text-rose-500">{catalogError}</p>
                )}

                {!isCatalogInitialLoading && !catalogError && recommendedProducts.length === 0 && (
                  <p className="mt-2 text-sm text-slate-500">{t("catalog.empty")}</p>
                )}

                {recommendedProducts.length > 0 && (
                  <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4 px-3 sm:px-0">
                    {recommendedProducts.map((product: any) => {
                      const uniqueKey = product.variant_id
                        ? `${product.product_id}_${product.variant_id}`
                        : product.product_id;
                      return (
                        <div key={uniqueKey} className="min-w-0">
                          <ProductCard product={product} size="compact" locale={i18n.language} />
                        </div>
                      );
                    })}
                  </div>
                )}
                {catalogLoading && catalogProducts.length > 0 && (
                  <div className="mt-4 flex items-center justify-center text-sm text-slate-500">
                    {t("common.loading") || "Loading..."}
                  </div>
                )}
                {catalogError && catalogProducts.length > 0 && (
                  <p className="mt-2 text-sm text-rose-500">{catalogError}</p>
                )}
                {catalogHasMore && (
                  <div ref={loadMoreRef} className="h-8" />
                )}
              </section>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default Favorites;
