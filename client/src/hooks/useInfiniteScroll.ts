import { useEffect, useRef, useCallback, useState } from 'react';

interface UseInfiniteScrollOptions {
  hasMore: boolean;
  loading: boolean;
  onLoadMore: () => void;
  threshold?: number; // Расстояние от конца страницы в пикселях
  root?: Element | null;
  rootMargin?: string;
}

/**
 * Хук для реализации бесконечной прокрутки
 */
type UseInfiniteScrollReturn = {
  ref: (node: HTMLDivElement | null) => void;
  getNode: () => HTMLDivElement | null;
};

export const useInfiniteScroll = ({
  hasMore,
  loading,
  onLoadMore,
  threshold = 200,
  root = null,
  rootMargin,
}: UseInfiniteScrollOptions): UseInfiniteScrollReturn => {
  const observerRef = useRef<IntersectionObserver | null>(null);
  const [sentinelNode, setSentinelNode] = useState<HTMLDivElement | null>(null);
  const scrollFallbackRef = useRef<number | null>(null);
  const canUseObserver = typeof window !== 'undefined' && 'IntersectionObserver' in window;
  
  // Сохраняем последние значения в ref, чтобы избежать пересоздания observer
  const hasMoreRef = useRef(hasMore);
  const loadingRef = useRef(loading);
  const onLoadMoreRef = useRef(onLoadMore);

  // Обновляем ref при изменении значений
  useEffect(() => {
    hasMoreRef.current = hasMore;
    loadingRef.current = loading;
    onLoadMoreRef.current = onLoadMore;
  }, [hasMore, loading, onLoadMore, threshold, rootMargin]);

  const handleObserver = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      const [target] = entries;
      if (target.isIntersecting && hasMoreRef.current && !loadingRef.current) {
        onLoadMoreRef.current();
      }
    },
    [] // Пустой массив зависимостей, так как используем ref
  );

  useEffect(() => {
    // Используем threshold как расстояние в пикселях через rootMargin
    const margin = rootMargin ?? `${threshold}px`;
    
    const options = {
      root,
      rootMargin: margin,
      threshold: 0.1,
    };

    if (!canUseObserver) return;

    // Удаляем старый observer перед созданием нового
    if (observerRef.current) {
      observerRef.current.disconnect();
    }

    observerRef.current = new IntersectionObserver(handleObserver, options);

    const currentObserver = observerRef.current;

    if (sentinelNode && currentObserver) {
      currentObserver.observe(sentinelNode);
    }

    return () => {
      if (currentObserver) {
        currentObserver.disconnect();
      }
    };
  }, [canUseObserver, handleObserver, root, rootMargin, threshold, sentinelNode]);

  // Резервный механизм: если IntersectionObserver не сработал (например, на старых браузерах),
  // слушаем прокрутку окна и проверяем расстояние до низа документа.
  useEffect(() => {
    if (canUseObserver) return;

    const checkPosition = () => {
      if (!hasMoreRef.current || loadingRef.current) return;
      const distanceToBottom =
        document.documentElement.scrollHeight -
        window.scrollY -
        window.innerHeight;
      if (distanceToBottom <= threshold * 2) {
        onLoadMoreRef.current();
      }
    };

    const onScroll = () => {
      if (scrollFallbackRef.current) {
        cancelAnimationFrame(scrollFallbackRef.current);
      }
      scrollFallbackRef.current = requestAnimationFrame(checkPosition);
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });

    // Проверяем сразу после монтирования/обновления
    checkPosition();

    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      if (scrollFallbackRef.current) {
        cancelAnimationFrame(scrollFallbackRef.current);
      }
    };
  }, [canUseObserver, threshold]);

  // ref-callback, чтобы поймать момент, когда sentinel появился в DOM
  const setSentinelRef = useCallback((node: HTMLDivElement | null) => {
    setSentinelNode(node);
  }, []);

  return {
    ref: setSentinelRef,
    getNode: () => sentinelNode,
  };
};

