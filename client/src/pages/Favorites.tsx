import React from "react";
import { useTranslation } from "react-i18next";
import cn from "./style.module.scss";
import ProductCard from "../components/ui/ProductCard";
import { useApp } from "../context/AppContext";
import { useProductsByIds } from "../hooks/useProductsByIds";
import useSEO from "../hooks/useSEO";

export function Favorites() {
  const { t } = useTranslation();
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
              <div className={cn.products_grid}>
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
                    />
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default Favorites;
