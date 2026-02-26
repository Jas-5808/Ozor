import React, { memo, useMemo, useCallback, useEffect, useRef, useState } from "react";
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

// Примерная высота одной строки карточек (уточняем измерением первой карточки)
const ESTIMATED_ROW_HEIGHT = 460;
// Большой overscan — меньше изменений paddingTop при быстром скролле → меньше прыжков.
// 8 строк сверху и снизу: при высоте карточки ~460px это ~3680px буфера.
const OVERSCAN_ROWS = 8;

const ProductsListComponent: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { products, loading, error, refetch, hasMore, loadMore } = useProductsPaged();
  const listRef = useRef<HTMLDivElement | null>(null);
  const measureRef = useRef<HTMLDivElement | null>(null);
  const [rowHeight, setRowHeight] = useState<number>(ESTIMATED_ROW_HEIGHT);
  const rowHeightLockedRef = useRef(false);
  
  const { ref: sentinelRef } = useInfiniteScroll({
    hasMore,
    loading,
    onLoadMore: loadMore,
    threshold: 400,
    rootMargin: "700px 0px",
  });

  // Дополнительный скролл-триггер: на случай если IntersectionObserver запоздал
  // (например после быстрой прокрутки к самому низу). Вызываем loadMore, если
  // до конца страницы < 800px и данные ещё не грузятся.
  useEffect(() => {
    const check = () => {
      if (loading || !hasMore) return;
      const dist =
        document.documentElement.scrollHeight -
        window.scrollY -
        window.innerHeight;
      if (dist < 800) loadMore();
    };
    let raf = 0;
    const onScroll = () => {
      if (raf) return;
      raf = window.requestAnimationFrame(() => { raf = 0; check(); });
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    check(); // проверить сразу при монтировании (короткий список)
    return () => {
      window.removeEventListener('scroll', onScroll);
      if (raf) window.cancelAnimationFrame(raf);
    };
  }, [loading, hasMore, loadMore]);

  // Windowing: считаем, какие элементы реально рисовать, чтобы не раздувать DOM при бесконечной ленте
  const [viewport, setViewport] = useState(() => ({
    width: typeof window !== "undefined" ? window.innerWidth : 1280,
    height: typeof window !== "undefined" ? window.innerHeight : 800,
    scrollY: typeof window !== "undefined" ? window.scrollY : 0,
    listTop: 0,
  }));

  useEffect(() => {
    let raf = 0;
    const onUpdate = () => {
      if (raf) return;
      raf = window.requestAnimationFrame(() => {
        raf = 0;
        const top = listRef.current
          ? listRef.current.getBoundingClientRect().top + window.scrollY
          : 0;
        setViewport({
          width: window.innerWidth,
          height: window.innerHeight,
          scrollY: window.scrollY,
          listTop: top,
        });
      });
    };
    window.addEventListener("scroll", onUpdate, { passive: true });
    window.addEventListener("resize", onUpdate, { passive: true });
    // первичный расчёт
    onUpdate();
    return () => {
      window.removeEventListener("scroll", onUpdate);
      window.removeEventListener("resize", onUpdate);
      if (raf) window.cancelAnimationFrame(raf);
    };
  }, []);

  // Уточняем высоту строки по первой отрендеренной карточке (плюс vertical gap).
  // После первого измерения высота фиксируется — дальнейшие изменения products.length
  // не создают новых observers (проверяем rowHeightLockedRef перед подпиской).
  useEffect(() => {
    if (rowHeightLockedRef.current) return; // Уже измерено — не нужен новый observer
    if (!measureRef.current) return;
    const el = measureRef.current;
    const ro = new ResizeObserver(() => {
      if (rowHeightLockedRef.current) return;
      const rect = el.getBoundingClientRect();
      if (!rect.height) return;
      // + gap между рядами (примерно 16px; точность не критична, но снижает "прыжки")
      const next = Math.max(240, Math.round(rect.height + 16));
      setRowHeight(next);
      // Фиксируем после первого успешного измерения, чтобы при догрузке не было скачков
      rowHeightLockedRef.current = true;
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [products.length]);

  
  const handleToggleLike = useCallback((_productId: string) => {
    // Логика переключения лайка обрабатывается в AppContext
    // Этот callback оставлен для совместимости
  }, []);
  
  // windowedCards ниже

  const windowed = useMemo(() => {
    const cols = getColumns(viewport.width);
    const total = products.length;
    const totalRows = Math.ceil(total / cols);
    const effectiveRowHeight = rowHeight;
    const relativeScroll = Math.max(0, viewport.scrollY - (viewport.listTop || 0));

    const startRow = Math.max(0, Math.floor(relativeScroll / effectiveRowHeight) - OVERSCAN_ROWS);
    const visibleRows = Math.ceil(viewport.height / effectiveRowHeight) + OVERSCAN_ROWS * 2;
    const endRow = Math.min(totalRows, startRow + visibleRows);

    const startIndex = startRow * cols;
    const endIndex = Math.min(total, endRow * cols);

    const top = startRow * effectiveRowHeight;
    const bottom = Math.max(0, (totalRows - endRow) * effectiveRowHeight);

    return { cols, startIndex, endIndex, top, bottom, totalRows, rowHeight: effectiveRowHeight };
  }, [products.length, rowHeight, viewport.height, viewport.listTop, viewport.scrollY, viewport.width]);

  const windowedCards = useMemo(() => {
    if (!products || products.length === 0) return null;
    const sliced = products.slice(windowed.startIndex, windowed.endIndex);
    return sliced.map((product, index) => {
      const absoluteIndex = windowed.startIndex + index;
      const uniqueKey = product?.variant_id
        ? `${product.product_id}_${product.variant_id}`
        : product?.product_id || `product-${absoluteIndex}`;
      return (
        <div key={uniqueKey} ref={absoluteIndex === 0 ? measureRef : undefined}>
          <ProductCard product={product} onToggleLike={handleToggleLike} locale={i18n.language} />
        </div>
      );
    });
  }, [products, windowed.endIndex, windowed.startIndex, handleToggleLike, i18n.language]);
  
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
      {/* overflowAnchor: 'none' — отключает компенсацию скролла браузером при изменении paddingTop,
          что является основной причиной микро-прыжков при виртуализированной прокрутке */}
      <div ref={listRef} style={{ paddingTop: windowed.top, paddingBottom: windowed.bottom, overflowAnchor: 'none' } as React.CSSProperties}>
        <div
          className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4 lg:gap-5 items-stretch"
        >
          {windowedCards}
        </div>
      </div>
      {/* Сентинель для IntersectionObserver — высокий div, чтобы observer не пропустил */}
      <div ref={sentinelRef} className="h-40 w-full" aria-hidden="true" />
      {/* Фиксированная высота блока под списком — без сдвига при появлении/скрытии индикатора */}
      <div className="min-h-18 flex flex-col justify-center">
        {loading && hasMore && products.length > 0 && (
          <div className="flex justify-center items-center py-8">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-[#04734b]" aria-hidden />
          </div>
        )}
        {!hasMore && products.length > 0 && !loading && (
          <div className="flex justify-center py-6">
            <span className="text-sm text-slate-400">{t("catalog.allProductsLoaded") || "Все товары загружены"}</span>
          </div>
        )}
      </div>
    </>
  );
};

export const ProductsList = memo(ProductsListComponent);
ProductsList.displayName = 'ProductsList';

export default ProductsList;
