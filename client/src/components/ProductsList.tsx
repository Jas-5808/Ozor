import React, { memo, useMemo, useCallback, useEffect, useState } from "react";
import { useProductsPaged } from "../hooks/useProducts";
import { useInfiniteScroll } from "../hooks/useInfiniteScroll";
import ProductCard from "./ui/ProductCard";
import SkeletonGrid from "./SkeletonGrid";
import { useTranslation } from "react-i18next";
// CSS module removed - using Tailwind utilities

const GRID_BREAKPOINTS = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
} as const;

const getColumns = (width: number) => {
  if (width >= GRID_BREAKPOINTS.xl) return 6;
  if (width >= GRID_BREAKPOINTS.lg) return 5;
  if (width >= GRID_BREAKPOINTS.md) return 4;
  if (width >= GRID_BREAKPOINTS.sm) return 3;
  return 2;
};

// Примерная высота одной строки карточек (фиксированная оценка для windowing)
const ESTIMATED_ROW_HEIGHT = 460;
const OVERSCAN_ROWS = 4;

const ProductsListComponent: React.FC = () => {
  const { t } = useTranslation();
  const { products, loading, error, refetch, hasMore, loadMore } = useProductsPaged();
  
  const { ref: sentinelRef } = useInfiniteScroll({
    hasMore,
    loading,
    onLoadMore: loadMore,
    threshold: 200,
    rootMargin: "400px 0px",
  });

  // Windowing: считаем, какие элементы реально рисовать, чтобы не раздувать DOM при бесконечной ленте
  const [viewport, setViewport] = useState(() => ({
    width: typeof window !== "undefined" ? window.innerWidth : 1280,
    height: typeof window !== "undefined" ? window.innerHeight : 800,
    scrollY: typeof window !== "undefined" ? window.scrollY : 0,
  }));

  useEffect(() => {
    let raf = 0;
    const onUpdate = () => {
      if (raf) return;
      raf = window.requestAnimationFrame(() => {
        raf = 0;
        setViewport({
          width: window.innerWidth,
          height: window.innerHeight,
          scrollY: window.scrollY,
        });
      });
    };
    window.addEventListener("scroll", onUpdate, { passive: true });
    window.addEventListener("resize", onUpdate, { passive: true });
    return () => {
      window.removeEventListener("scroll", onUpdate);
      window.removeEventListener("resize", onUpdate);
      if (raf) window.cancelAnimationFrame(raf);
    };
  }, []);

  
  const handleToggleLike = useCallback((_productId: string) => {
    // Логика переключения лайка обрабатывается в AppContext
    // Этот callback оставлен для совместимости
  }, []);
  
  // windowedCards ниже

  const windowed = useMemo(() => {
    const cols = getColumns(viewport.width);
    const total = products.length;
    const totalRows = Math.ceil(total / cols);
    const rowHeight = ESTIMATED_ROW_HEIGHT;

    const startRow = Math.max(0, Math.floor(viewport.scrollY / rowHeight) - OVERSCAN_ROWS);
    const visibleRows = Math.ceil(viewport.height / rowHeight) + OVERSCAN_ROWS * 2;
    const endRow = Math.min(totalRows, startRow + visibleRows);

    const startIndex = startRow * cols;
    const endIndex = Math.min(total, endRow * cols);

    const top = startRow * rowHeight;
    const bottom = Math.max(0, (totalRows - endRow) * rowHeight);

    return { cols, startIndex, endIndex, top, bottom, totalRows, rowHeight };
  }, [products.length, viewport.height, viewport.scrollY, viewport.width]);

  const windowedCards = useMemo(() => {
    if (!products || products.length === 0) return null;
    const sliced = products.slice(windowed.startIndex, windowed.endIndex);
    return sliced.map((product, index) => {
      const absoluteIndex = windowed.startIndex + index;
      const uniqueKey = product?.variant_id
        ? `${product.product_id}_${product.variant_id}`
        : product?.product_id || `product-${absoluteIndex}`;
      return (
        <ProductCard
          key={uniqueKey}
          product={product}
          onToggleLike={handleToggleLike}
        />
      );
    });
  }, [products, windowed.endIndex, windowed.startIndex, handleToggleLike]);
  
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
      <div style={{ paddingTop: windowed.top, paddingBottom: windowed.bottom }}>
        <div
          className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4 lg:gap-5 items-stretch"
        >
          {windowedCards}
        </div>
      </div>
      {/* Элемент-триггер для бесконечной прокрутки */}
      <div ref={sentinelRef} className="h-10 w-full" />
      {/* Индикатор загрузки только во время подгрузки следующей страницы */}
      {loading && hasMore && products.length > 0 && (
        <div className="flex justify-center items-center py-8">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-[#04734b]"></div>
        </div>
      )}
      {/* Фолбэк-кнопка на случай если observer не сработает */}
      {hasMore && !loading && (
        <div className="flex justify-center mt-4">
          <button
            onClick={() => {
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
