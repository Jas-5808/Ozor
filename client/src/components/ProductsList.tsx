import React, { memo, useMemo, useCallback } from "react";
import { useEffect, useRef } from "react";
import { useProducts } from "../hooks/useProducts";
import { useInfiniteScroll } from "../hooks/useInfiniteScroll";
import ProductCard from "./ui/ProductCard";
import SkeletonGrid from "./SkeletonGrid";
import { useTranslation } from "react-i18next";
// CSS module removed - using Tailwind utilities

const ProductsListComponent: React.FC = () => {
  const { t } = useTranslation();
  const { products, loading, error, refetch, hasMore, loadMore } = useProducts();
  const LOG_PREFIX = "[ProductsList]";
  const autoLoadOnceRef = useRef(false);
  
  const { ref: sentinelRef, getNode: getSentinelNode } = useInfiniteScroll({
    hasMore,
    loading,
    onLoadMore: loadMore,
    threshold: 200,
    rootMargin: "400px 0px",
  });

  // Дополнительная подстраховка: если после рендера контента мало,
  // автозапрашиваем следующую порцию (один раз).
  useEffect(() => {
    if (loading || !hasMore) return;
    if (autoLoadOnceRef.current) return;
    const tryLoad = () => {
      const sentinelEl = getSentinelNode();
      if (!sentinelEl) return;
      const rect = sentinelEl.getBoundingClientRect();
      if (rect.top <= window.innerHeight + 150) {
        autoLoadOnceRef.current = true;
        console.log(`${LOG_PREFIX} auto-load after mount (few items)`, { products: products.length, rectTop: rect.top });
        loadMore();
        return true;
      }
      return false;
    };

    const timer = setTimeout(tryLoad, 150);
    return () => clearTimeout(timer);
  }, [products.length, hasMore, loading, loadMore, sentinelRef]);

  // Подстраховка: реагируем на близость к низу экрана (300px)
  useEffect(() => {
    const checkSentinel = () => {
      if (loading || !hasMore) return;
      const sentinelEl = getSentinelNode();
      if (!sentinelEl) return;
      const rect = sentinelEl.getBoundingClientRect();
      if (rect.top <= window.innerHeight + 300) {
        console.log(`${LOG_PREFIX} scroll proximity -> loadMore`, { rectTop: rect.top, vh: window.innerHeight });
        loadMore();
      }
    };
    const onScroll = () => requestAnimationFrame(checkSentinel);
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    // первичная проверка
    checkSentinel();
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [hasMore, loading, loadMore, sentinelRef]);

  useEffect(() => {
    console.log(`${LOG_PREFIX} state`, {
      products: products.length,
      loading,
      hasMore,
    });
  }, [products.length, loading, hasMore]);

  
  const handleToggleLike = useCallback((_productId: string) => {
    // Логика переключения лайка обрабатывается в AppContext
    // Этот callback оставлен для совместимости
  }, []);
  
  const productCards = useMemo(() => {
    if (!products || products.length === 0) return null;
    
    return products.map((product, index) => {
      const uniqueKey = product?.variant_id 
        ? `${product.product_id}_${product.variant_id}` 
        : product?.product_id || `product-${index}`;
      return (
        <ProductCard
          key={uniqueKey}
          product={product}
          onToggleLike={handleToggleLike}
        />
      );
    });
  }, [products, handleToggleLike]);
  
  if (loading && products.length === 0) {
    return <SkeletonGrid count={8} columns={4} />;
  }
  
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center p-10 text-center">
        <p className="mb-5 text-red-600">{t("common.errors.productsLoad")}: {error}</p>
        <button 
          className="bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600 transition-colors"
          onClick={refetch}
        >
          {t("common.actions.retry") || "Попробовать снова"}
        </button>
      </div>
    );
  }
  
  if (!products || products.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-10 text-center">
        <p className="mb-5 text-gray-500">{t("common.errors.noProducts") || "Продукты не найдены"}</p>
        <button 
          className="bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600 transition-colors"
          onClick={refetch}
        >
          {t("common.actions.refresh") || "Обновить"}
        </button>
      </div>
    );
  }
  
  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4 lg:gap-5 items-stretch">
        {productCards}
      </div>
      {/* Элемент-триггер для бесконечной прокрутки */}
      <div ref={sentinelRef} className="h-10 w-full" />
      {/* Индикатор загрузки при подгрузке */}
      {hasMore && (
        <div className="flex justify-center items-center py-8">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-[#04734b]"></div>
        </div>
      )}
      {/* Фолбэк-кнопка на случай если observer не сработает */}
      {hasMore && !loading && (
        <div className="flex justify-center mt-4">
          <button
            onClick={() => {
              console.log(`${LOG_PREFIX} manual button click -> loadMore`);
              loadMore();
            }}
            className="px-4 py-2 rounded-lg border border-slate-200 text-sm font-semibold text-slate-700 hover:border-emerald-500 hover:text-emerald-700 transition"
          >
            {t("common.actions.loadMore") || "Загрузить ещё"}
          </button>
        </div>
      )}
    </>
  );
};

export const ProductsList = memo(ProductsListComponent);
ProductsList.displayName = 'ProductsList';

export default ProductsList;
