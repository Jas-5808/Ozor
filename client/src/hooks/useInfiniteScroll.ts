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

  const handleObserver = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      const [target] = entries;
      if (target.isIntersecting && hasMore && !loading) {
        onLoadMore();
      }
    },
    [hasMore, loading, onLoadMore]
  );

  useEffect(() => {
    const options = {
      root,
      rootMargin,
      threshold: 0.1,
    };

    observerRef.current = new IntersectionObserver(handleObserver, options);

    const currentSentinel = sentinelRef.current;
    const currentObserver = observerRef.current;

    if (currentSentinel && currentObserver) {
      currentObserver.observe(currentSentinel);
    }

    return () => {
      if (currentSentinel && currentObserver) {
        currentObserver.unobserve(currentSentinel);
      }
    };
  }, [handleObserver, root, rootMargin]);

  return sentinelRef;
};

