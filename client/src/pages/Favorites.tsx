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
          <h2 style={{ marginBottom: 16 }}>Saralanganlar</h2>
          {likedProducts.length === 0 ? (
            <div className={cn.empty_container}>
              <p>Saralangan mahsulotlar yo'q</p>
              <button onClick={refetch} className={cn.retry_button}>
                Yangilash
              </button>
            </div>
          ) : (
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
          )}
        </div>
      </div>
    </div>
  );
}

export default Favorites;
