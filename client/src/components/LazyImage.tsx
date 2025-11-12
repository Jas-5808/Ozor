import React, { useState, useRef, useEffect, memo } from 'react';

interface LazyImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
  placeholder?: string;
  fallback?: string;
  threshold?: number;
  rootMargin?: string;
}

/**
 * Компонент для ленивой загрузки изображений
 * Использует Intersection Observer API для оптимизации производительности
 */
const LazyImageComponent: React.FC<LazyImageProps> = ({
  src,
  alt,
  placeholder = '/img/NaturalTitanium.jpg',
  fallback = '/img/NaturalTitanium.jpg',
  threshold = 0.1,
  rootMargin = '50px',
  className = '',
  ...props
}) => {
  const [imageSrc, setImageSrc] = useState<string>(placeholder);
  const [isLoaded, setIsLoaded] = useState<boolean>(false);
  const [hasError, setHasError] = useState<boolean>(false);
  const imgRef = useRef<HTMLImageElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    const img = imgRef.current;
    if (!img) return;

    // Если изображение уже загружено или есть ошибка, не создаем observer
    if (isLoaded || hasError) return;

    // Создаем Intersection Observer
    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            // Когда изображение видно, начинаем загрузку
            const imageLoader = new Image();
            imageLoader.src = src;

            imageLoader.onload = () => {
              setImageSrc(src);
              setIsLoaded(true);
            };

            imageLoader.onerror = () => {
              setImageSrc(fallback);
              setHasError(true);
            };

            // Отключаем observer после начала загрузки
            if (observerRef.current && img) {
              observerRef.current.unobserve(img);
            }
          }
        });
      },
      {
        threshold,
        rootMargin,
      }
    );

    observerRef.current.observe(img);

    return () => {
      if (observerRef.current && img) {
        observerRef.current.unobserve(img);
      }
    };
  }, [src, fallback, threshold, rootMargin, isLoaded, hasError]);

  const handleError = (e: React.SyntheticEvent<HTMLImageElement>) => {
    if (!hasError) {
      setImageSrc(fallback);
      setHasError(true);
    }
    props.onError?.(e);
  };

  return (
    <img
      ref={imgRef}
      src={imageSrc}
      alt={alt}
      className={`${className} ${!isLoaded ? 'opacity-50 transition-opacity duration-300' : 'opacity-100'}`}
      loading="lazy"
      {...props}
      onError={handleError}
    />
  );
};

export const LazyImage = memo(LazyImageComponent);
LazyImage.displayName = 'LazyImage';

export default LazyImage;

