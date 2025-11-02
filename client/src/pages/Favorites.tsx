import React from "react";
import cn from "./style.module.scss";
import ProductCard from "../components/ui/ProductCard";
import { useApp } from "../context/AppContext";
import { useProducts } from "../hooks/useProducts";
import useSEO from "../hooks/useSEO";

export function Favorites() {
  useSEO({
    title: "Saralangan — OZAR",
    robots: "noindex,nofollow",
    canonical: typeof window !== 'undefined' ? window.location.origin + '/favorites' : undefined,
  });
  const { state } = useApp();
  const { products, loading, error, refetch } = useProducts();

  const likedIds = state.likedProducts;
  const likedProducts = React.useMemo(() => {
    if (!products || products.length === 0) return [];
    return products.filter((p: any) => {
      // Проверяем как по product_id, так и по уникальному идентификатору (product_id + variant_id)
      const uniqueId = p.variant_id ? `${p.product_id}_${p.variant_id}` : p.product_id;
      return likedIds.has(uniqueId) || likedIds.has(p.product_id);
    });
  }, [products, likedIds]);

  if (loading) {
    return (
      <div className={cn.loading_container}>
        <div className={cn.loading_spinner} />
        <p>Yuklanmoqda...</p>
      </div>
    );
  }
  if (error) {
    return (
      <div className={cn.error_container}>
        <p>Xatolik: {error}</p>
        <button onClick={refetch} className={cn.retry_button}>
          Qayta urinish
        </button>
      </div>
    );
  }

  return (
    <div className="container">
      <div className={cn.main}>
        <div className={cn.main_content}>
          {likedProducts.length === 0 ? (
            <div className="grid gap-3 p-6 bg-white border border-gray-200 rounded-2xl shadow-[0_8px_30px_rgba(0,0,0,0.04)]">
              <div className="flex items-center gap-2 mb-2">
                <svg className="w-6 h-6 text-red-500" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                </svg>
                <h2 className="m-0 text-[22px] font-extrabold text-slate-900">Saralanganlar</h2>
              </div>
              <div className="grid place-items-center py-6 text-slate-500">Saralangan mahsulotlar yo'q</div>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2 mb-4">
                <svg className="w-6 h-6 text-red-500" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                </svg>
                <h2 className="m-0 text-[22px] font-extrabold text-slate-900">Saralanganlar</h2>
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
