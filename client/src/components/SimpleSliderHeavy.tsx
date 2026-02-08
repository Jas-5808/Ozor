import React, { useState, useEffect, useRef, useMemo } from "react";
import { useTranslation } from "react-i18next";
import apiClient from "../services/api";
import { BANNER_SLIDER_SIZE_CLASS } from "./sliderBannerSizes";

export interface Slide {
  id: string;
  title: string;
  subtitle: string;
  image: string;
  link: string;
}

const SLIDE_WIDTH_PERCENT = 94; // ширина одного слайда, чтобы по 3% оставалось видно соседей
const SLIDE_GAP_PERCENT = 1;    // зазор между слайдами

const getBannerBase = () => {
  // Всегда используем lab-домен как базу для баннеров
  return "https://lab.ozar.uz/media/banners/";
};

const normalizeBannerUrl = (url: string): string => {
  if (!url) return "";
  const base = getBannerBase();
  const match = url.match(/\/media\/banners\/(.+)$/);
  const path = match ? match[1] : url;
  if (url.startsWith(base)) return url;
  if (/https?:\/\/(ozar\.uz|lab\.ozar\.uz)\/media\/banners\//.test(url)) {
    return `${base}${path}`;
  }
  return `${base}${path}`;
};

const BANNERS_CACHE_KEY = "ozar:banners:v1";
const BANNERS_CACHE_TTL = 10 * 60 * 1000; // 10 minutes

function readCachedSlides(): Slide[] {
  try {
    const raw = localStorage.getItem(BANNERS_CACHE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return [];
    if (typeof parsed.time !== "number" || !Array.isArray(parsed.slides)) return [];
    if (Date.now() - parsed.time > BANNERS_CACHE_TTL) return [];
    return parsed.slides as Slide[];
  } catch {
    return [];
  }
}

function writeCachedSlides(slides: Slide[]) {
  try {
    localStorage.setItem(BANNERS_CACHE_KEY, JSON.stringify({ time: Date.now(), slides }));
  } catch {
    // ignore
  }
}

type Props = {
  initialSlides?: Slide[];
};

export const SimpleSliderHeavy: React.FC<Props> = ({ initialSlides }) => {
  const { t } = useTranslation();
  const [remoteSlides, setRemoteSlides] = useState<Slide[]>(() => initialSlides || []);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [mobileSlideIndex, setMobileSlideIndex] = useState(1); // Начинаем с 1, т.к. первый слайд - дубликат
  const [loadingImages, setLoadingImages] = useState<Set<string>>(new Set());
  const [allImagesLoaded, setAllImagesLoaded] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(true);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState(0);
  const sliderRef = useRef<HTMLDivElement>(null);
  const touchStartX = useRef<number>(0);
  const touchEndX = useRef<number>(0);
  const wasSwiped = useRef<boolean>(false);

  useEffect(() => {
    // Инициализация из cache, если initialSlides не дали
    if (!initialSlides || initialSlides.length === 0) {
      const cached = readCachedSlides();
      if (cached.length > 0) {
        setRemoteSlides(cached);
      }
    }
  }, [initialSlides]);

  useEffect(() => {
    const controller = new AbortController();
    const load = async () => {
      try {
        const res = await apiClient.get("/marketing/banners", { signal: controller.signal });
        const results = (res as any)?.data?.results;
        if (Array.isArray(results) && results.length > 0) {
          const mapped: Slide[] = results
            .sort((a: any, b: any) => (a?.order ?? 0) - (b?.order ?? 0))
            .map((b: any) => ({
              id: b?.id || crypto.randomUUID(),
              title: b?.title || "",
              subtitle: "",
              image: normalizeBannerUrl(b?.image || ""),
              link: b?.link || "#",
            }))
            .filter((s) => s.image);
          if (mapped.length > 0) {
            setRemoteSlides(mapped);
            writeCachedSlides(mapped);
          }
        }
      } catch {
        // silent
      }
    };
    load();
    return () => controller.abort();
  }, []);

  const slides = remoteSlides;

  const infiniteSlides = useMemo(() => {
    if (slides.length === 0) return [];
    return [slides[slides.length - 1], ...slides, slides[0]];
  }, [slides]);

  useEffect(() => {
    if (!sliderRef.current || infiniteSlides.length === 0) return;
    if (mobileSlideIndex === 0) {
      setTimeout(() => {
        setIsTransitioning(false);
        setMobileSlideIndex(infiniteSlides.length - 2);
        setTimeout(() => setIsTransitioning(true), 50);
      }, 500);
    } else if (mobileSlideIndex === infiniteSlides.length - 1) {
      setTimeout(() => {
        setIsTransitioning(false);
        setMobileSlideIndex(1);
        setTimeout(() => setIsTransitioning(true), 50);
      }, 500);
    }
  }, [mobileSlideIndex, infiniteSlides.length]);

  useEffect(() => {
    if (!slides || slides.length === 0) return;
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
      setMobileSlideIndex((prev) => prev + 1);
    }, 4000);
    return () => clearInterval(interval);
  }, [slides]);

  useEffect(() => {
    if (!slides || slides.length === 0) {
      setAllImagesLoaded(true);
      return;
    }

    setAllImagesLoaded(false);
    const imagesToPreload = [0, 1, 2].filter((i) => i < slides.length);
    const imagePromises = imagesToPreload.map((index) => {
      const slide = slides[index];
      return new Promise<void>((resolve) => {
        const img = new Image();
        img.onload = () => {
          setLoadingImages((prev) => {
            const next = new Set(prev);
            next.delete(slide.id);
            return next;
          });
          resolve();
        };
        img.onerror = () => {
          setLoadingImages((prev) => {
            const next = new Set(prev);
            next.delete(slide.id);
            return next;
          });
          resolve();
        };
        img.src = slide.image;
      });
    });
    setLoadingImages(new Set(imagesToPreload.map((i) => slides[i].id)));
    Promise.all(imagePromises).then(() => setAllImagesLoaded(true));
  }, [slides]);

  const goToSlide = (index: number) => {
    setCurrentSlide(index);
    setMobileSlideIndex(index + 1);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchEndX.current = e.touches[0].clientX;
    wasSwiped.current = false;
    setIsDragging(true);
    setIsTransitioning(false);
    setDragOffset(0);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return;
    e.preventDefault();
    const currentX = e.touches[0].clientX;
    const offset = currentX - touchStartX.current;
    setDragOffset(offset);
    if (Math.abs(offset) > 10) {
      wasSwiped.current = true;
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!isDragging) return;
    touchEndX.current = e.changedTouches[0].clientX;
    setIsDragging(false);
    const minSwipeDistance = 50;
    const diff = touchEndX.current - touchStartX.current;

    if (Math.abs(diff) > minSwipeDistance) {
      wasSwiped.current = true;
      if (diff > 0) {
        setMobileSlideIndex((prev) => prev - 1);
        setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length);
      } else {
        setMobileSlideIndex((prev) => prev + 1);
        setCurrentSlide((prev) => (prev + 1) % slides.length);
      }
    }

    setIsTransitioning(true);
    setDragOffset(0);

    if (wasSwiped.current) {
      setTimeout(() => {
        wasSwiped.current = false;
      }, 300);
    }
  };

  const handleLinkClick = (e: React.MouseEvent) => {
    if (wasSwiped.current || isDragging) {
      e.preventDefault();
      e.stopPropagation();
    }
  };

  if (!slides || slides.length === 0) {
    return null;
  }

  return (
    <div className={`relative w-full rounded-2xl shadow-2xl overflow-hidden ${BANNER_SLIDER_SIZE_CLASS}`}>
      {!allImagesLoaded && (
        <div className="absolute inset-0 bg-white/90 backdrop-blur-sm flex flex-col items-center justify-center z-10">
          <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
          <p className="mt-4 text-gray-600 font-medium">Загрузка изображений...</p>
        </div>
      )}

      {/* Mobile */}
      <div
        className="md:hidden relative w-full h-full overflow-visible touch-pan-y"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div className="relative w-full h-full px-0 sm:px-[1%] overflow-hidden sm:overflow-visible">
          <div
            ref={sliderRef}
            className="flex h-full"
            style={{
              transform: `translateX(calc(-${mobileSlideIndex * (SLIDE_WIDTH_PERCENT + SLIDE_GAP_PERCENT)}% + ${dragOffset}px))`,
              transition: isTransitioning ? "transform 0.5s ease" : "none",
              gap: `${SLIDE_GAP_PERCENT}%`,
            }}
          >
            {infiniteSlides.map((slide, index) => (
              <div
                key={`${slide.id}-${index}`}
                className="flex-shrink-0 h-full px-0 sm:px-[1%]"
                style={{
                  flexBasis: `${SLIDE_WIDTH_PERCENT}%`,
                  maxWidth: `${SLIDE_WIDTH_PERCENT}%`,
                }}
              >
                <a
                  href={slide.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block w-full h-full"
                  onClick={handleLinkClick}
                  onTouchStart={(e) => {
                    if (isDragging) e.preventDefault();
                  }}
                >
                  <div className="relative w-full h-full overflow-hidden rounded-2xl">
                    <img
                      src={slide.image}
                      alt={t("slider.bannerAlt")}
                      className="w-full h-full object-cover bg-white"
                      loading={index === 0 ? "eager" : "lazy"}
                      fetchPriority={index === 0 ? "high" : "low"}
                      decoding="async"
                      style={{
                        opacity: loadingImages.has(slide.id) ? 0.3 : 1,
                        transition: "opacity 0.3s ease",
                      }}
                    />
                    {loadingImages.has(slide.id) && (
                      <div className="absolute inset-0 flex items-center justify-center bg-white/50">
                        <div className="w-6 h-6 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent"></div>
                  </div>
                </a>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Desktop */}
      <div className="hidden md:block relative w-full h-full">
        {slides.map((slide, index) => (
          <div
            key={slide.id}
            className={`absolute inset-0 w-full h-full transition-opacity duration-700 ease-in-out ${
              index === currentSlide ? "opacity-100 z-10" : "opacity-0 z-0"
            }`}
          >
            <a href={slide.link} target="_blank" rel="noopener noreferrer" className="block w-full h-full">
              <div className="relative w-full h-full overflow-hidden rounded-2xl">
                <img
                  src={slide.image}
                  alt={t("slider.bannerAlt")}
                  className="w-full h-full object-cover bg-white"
                  loading={index === 0 ? "eager" : "lazy"}
                  fetchPriority={index === 0 ? "high" : "low"}
                  decoding="async"
                  style={{
                    opacity: loadingImages.has(slide.id) ? 0.3 : 1,
                    transition: "opacity 0.3s ease",
                  }}
                />
                {loadingImages.has(slide.id) && (
                  <div className="absolute inset-0 flex items-center justify-center bg-white/50">
                    <div className="w-6 h-6 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent"></div>
              </div>
            </a>
          </div>
        ))}
      </div>

      {/* Dots */}
      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-2">
        {slides.map((_, index) => (
          <button
            key={index}
            className={`w-2 h-2 rounded-full transition-all duration-300 ${
              index === currentSlide ? "bg-white shadow-lg scale-125" : "bg-white/50"
            }`}
            onClick={() => goToSlide(index)}
            aria-label={t("slider.goTo", { index: index + 1 })}
          />
        ))}
      </div>

      {/* Arrows */}
      <button
        className="hidden md:flex absolute left-4 top-1/2 transform -translate-y-1/2 w-10 h-10 bg-white/20 backdrop-blur-sm rounded-full items-center justify-center text-white transition-all duration-200 opacity-100 z-20"
        onClick={() => goToSlide((currentSlide - 1 + slides.length) % slides.length)}
        aria-label="Prev"
      >
        ‹
      </button>
      <button
        className="hidden md:flex absolute right-4 top-1/2 transform -translate-y-1/2 w-10 h-10 bg-white/20 backdrop-blur-sm rounded-full items-center justify-center text-white transition-all duration-200 opacity-100 z-20"
        onClick={() => goToSlide((currentSlide + 1) % slides.length)}
        aria-label="Next"
      >
        ›
      </button>
    </div>
  );
};

export default SimpleSliderHeavy;


