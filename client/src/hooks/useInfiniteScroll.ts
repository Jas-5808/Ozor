import { useEffect, useRef, useCallback } from 'react';

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
export const useInfiniteScroll = ({
  hasMore,
  loading,
  onLoadMore,
  threshold = 200,
  root = null,
  rootMargin = '0px',
}: UseInfiniteScrollOptions) => {
  const observerRef = useRef<IntersectionObserver | null>(null);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  
  // Сохраняем последние значения в ref, чтобы избежать пересоздания observer
  const hasMoreRef = useRef(hasMore);
  const loadingRef = useRef(loading);
  const onLoadMoreRef = useRef(onLoadMore);

  // Обновляем ref при изменении значений
  useEffect(() => {
    hasMoreRef.current = hasMore;
    loadingRef.current = loading;
    onLoadMoreRef.current = onLoadMore;
  }, [hasMore, loading, onLoadMore]);

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
    const margin = rootMargin || `${threshold}px`;
    
    const options = {
      root,
      rootMargin: margin,
      threshold: 0.1,
    };

    // Удаляем старый observer перед созданием нового
    if (observerRef.current) {
      observerRef.current.disconnect();
    }

    observerRef.current = new IntersectionObserver(handleObserver, options);

    const currentSentinel = sentinelRef.current;
    const currentObserver = observerRef.current;

    if (currentSentinel && currentObserver) {
      currentObserver.observe(currentSentinel);
    }

    return () => {
      if (currentObserver) {
        currentObserver.disconnect();
      }
    };
  }, [handleObserver, root, rootMargin, threshold]);

  return sentinelRef;
};

