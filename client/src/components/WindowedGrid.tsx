import React, { useEffect, useMemo, useRef, useState } from "react";

type ColumnsConfig = {
  base?: number;
  sm?: number;
  md?: number;
  lg?: number;
  xl?: number;
};

type WindowedGridProps<T> = {
  items: T[];
  renderItem: (item: T, index: number) => React.ReactNode;
  getItemKey?: (item: T, index: number) => string;
  containerClassName?: string;
  gridClassName?: string;
  estimatedRowHeight?: number;
  overscanRows?: number;
  gapPx?: number;
  columns?: ColumnsConfig;
};

const GRID_BREAKPOINTS = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
} as const;

const getColumns = (width: number, columns?: ColumnsConfig) => {
  const cfg = {
    base: 2,
    sm: 3,
    md: 4,
    lg: 5,
    xl: 6,
    ...(columns || {}),
  };
  if (width >= GRID_BREAKPOINTS.xl) return cfg.xl;
  if (width >= GRID_BREAKPOINTS.lg) return cfg.lg;
  if (width >= GRID_BREAKPOINTS.md) return cfg.md;
  if (width >= GRID_BREAKPOINTS.sm) return cfg.sm;
  return cfg.base;
};

export function WindowedGrid<T>({
  items,
  renderItem,
  getItemKey,
  containerClassName,
  gridClassName,
  estimatedRowHeight = 420,
  overscanRows = 4,
  gapPx = 16,
  columns,
}: WindowedGridProps<T>) {
  const listRef = useRef<HTMLDivElement | null>(null);
  const measureRef = useRef<HTMLDivElement | null>(null);
  const [rowHeight, setRowHeight] = useState<number>(estimatedRowHeight);
  const [viewport, setViewport] = useState(() => ({
    width: typeof window !== "undefined" ? window.innerWidth : 1280,
    height: typeof window !== "undefined" ? window.innerHeight : 800,
    scrollY: typeof window !== "undefined" ? window.scrollY : 0,
    listTop: 0,
  }));

  useEffect(() => {
    if (typeof window === "undefined") return;
    let raf = 0;
    const update = () => {
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
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update, { passive: true });
    update();
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
      if (raf) window.cancelAnimationFrame(raf);
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const top = listRef.current
      ? listRef.current.getBoundingClientRect().top + window.scrollY
      : 0;
    setViewport((prev) => ({
      ...prev,
      width: window.innerWidth,
      height: window.innerHeight,
      scrollY: window.scrollY,
      listTop: top,
    }));
  }, [items.length]);

  useEffect(() => {
    if (!measureRef.current) return;
    if (typeof ResizeObserver === "undefined") return;
    const el = measureRef.current;
    const ro = new ResizeObserver(() => {
      const rect = el.getBoundingClientRect();
      if (!rect.height) return;
      const next = Math.max(200, Math.round(rect.height + gapPx));
      setRowHeight(next);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [items.length, gapPx]);

  const windowed = useMemo(() => {
    const cols = Math.max(1, getColumns(viewport.width, columns));
    const total = items.length;
    const totalRows = total ? Math.ceil(total / cols) : 0;
    const effectiveRowHeight = rowHeight || estimatedRowHeight;
    const relativeScroll = Math.max(0, viewport.scrollY - (viewport.listTop || 0));

    const startRow = Math.max(0, Math.floor(relativeScroll / effectiveRowHeight) - overscanRows);
    const visibleRows = Math.ceil(viewport.height / effectiveRowHeight) + overscanRows * 2;
    const endRow = Math.min(totalRows, startRow + visibleRows);

    const startIndex = startRow * cols;
    const endIndex = Math.min(total, endRow * cols);

    const top = startRow * effectiveRowHeight;
    const bottom = Math.max(0, (totalRows - endRow) * effectiveRowHeight);

    return { cols, startIndex, endIndex, top, bottom };
  }, [columns, estimatedRowHeight, items.length, overscanRows, rowHeight, viewport.height, viewport.listTop, viewport.scrollY, viewport.width]);

  if (!items || items.length === 0) return null;

  const sliced = items.slice(windowed.startIndex, windowed.endIndex);

  return (
    <div ref={listRef} className={containerClassName} style={{ paddingTop: windowed.top, paddingBottom: windowed.bottom }}>
      <div className={gridClassName}>
        {sliced.map((item, index) => {
          const absoluteIndex = windowed.startIndex + index;
          const key = getItemKey ? getItemKey(item, absoluteIndex) : String(absoluteIndex);
          return (
            <div key={key} ref={absoluteIndex === 0 ? measureRef : undefined} className="min-w-0">
              {renderItem(item, absoluteIndex)}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default WindowedGrid;
