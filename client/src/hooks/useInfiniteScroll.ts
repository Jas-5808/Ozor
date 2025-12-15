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
  const LOG_PREFIX = "[inf-scroll]";
  
  // Сохраняем последние значения в ref, чтобы избежать пересоздания observer
  const hasMoreRef = useRef(hasMore);
  const loadingRef = useRef(loading);
  const onLoadMoreRef = useRef(onLoadMore);

  // Обновляем ref при изменении значений
  useEffect(() => {
    hasMoreRef.current = hasMore;
    loadingRef.current = loading;
    onLoadMoreRef.current = onLoadMore;
    console.log(`${LOG_PREFIX} deps`, { hasMore, loading, threshold, rootMargin });
  }, [hasMore, loading, onLoadMore, threshold, rootMargin]);

  const handleObserver = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      const [target] = entries;
      if (target.isIntersecting && hasMoreRef.current && !loadingRef.current) {
        console.debug(`${LOG_PREFIX} observer -> loadMore`);
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

    // Удаляем старый observer перед созданием нового
    if (observerRef.current) {
      observerRef.current.disconnect();
    }

    observerRef.current = new IntersectionObserver(handleObserver, options);

    const currentObserver = observerRef.current;

    if (sentinelNode && currentObserver) {
      console.log(`${LOG_PREFIX} observe sentinel`, { margin, threshold, hasMore });
      currentObserver.observe(sentinelNode);
    } else {
      console.log(`${LOG_PREFIX} no sentinel to observe yet`);
    }

    return () => {
      if (currentObserver) {
        console.log(`${LOG_PREFIX} disconnect observer`);
        currentObserver.disconnect();
      }
    };
  }, [handleObserver, root, rootMargin, threshold, sentinelNode, hasMore]);

  // Резервный механизм: если IntersectionObserver не сработал (например, на старых браузерах),
  // слушаем прокрутку окна и проверяем расстояние до низа документа.
  useEffect(() => {
    const checkPosition = () => {
      if (!hasMoreRef.current || loadingRef.current) return;
      const distanceToBottom =
        document.documentElement.scrollHeight -
        window.scrollY -
        window.innerHeight;
      console.log(`${LOG_PREFIX} fallback check`, {
        distanceToBottom,
        scrollY: window.scrollY,
        innerHeight: window.innerHeight,
        scrollHeight: document.documentElement.scrollHeight,
      });
      if (distanceToBottom <= threshold * 2) {
        console.log(`${LOG_PREFIX} fallback scroll -> loadMore`, { distanceToBottom });
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
  }, [threshold, hasMore, loading]);

  // ref-callback, чтобы поймать момент, когда sentinel появился в DOM
  const setSentinelRef = useCallback((node: HTMLDivElement | null) => {
    if (node) {
      console.log(`${LOG_PREFIX} set sentinel node`);
    } else {
      console.log(`${LOG_PREFIX} unset sentinel node`);
    }
    setSentinelNode(node);
  }, []);

  return {
    ref: setSentinelRef,
    getNode: () => sentinelNode,
  };
};

