import React, { useState, useEffect, useRef, useMemo } from "react";

interface Slide {
  id: string;
  title: string;
  subtitle: string;
  image: string;
  link: string;
}

const slides: Slide[] = [
  {
    id: "1",
    title: "",
    subtitle: "",
    image: "https://images.uzum.uz/d33ptvl2llnd6jumh5lg/main_page_banner.jpg",
    link: "#",
  },
  {
    id: "2",
    title: "",
    subtitle: "",
    image: "https://images.uzum.uz/d34iind2llnd6jumo8kg/main_page_banner.jpg",
    link: "#",
  },
  {
    id: "3",
    title: "",
    subtitle: "",
    image: "https://images.uzum.uz/d30hgn7iub35i07kcma0/main_page_banner.jpg",
    link: "#",
  },
  {
    id: "4",
    title: "",
    subtitle: "",
    image: "https://images.uzum.uz/d1h3q78s9rffrfkvbhk0/main_page_banner.jpg",
    link: "#",
  },
  {
    id: "5",
    title: "",
    subtitle: "",
    image: "https://images.uzum.uz/d34jpk7iub35i07lfu50/main_page_banner.jpg",
    link: "#",
  },
  {
    id: "6",
    title: "",
    subtitle: "",
    image: "https://images.uzum.uz/d2tdblj4eu2hs07rovpg/main_page_banner.jpg",
    link: "#",
  },
  {
    id: "7",
    title: "",
    subtitle: "",
    image: "https://images.uzum.uz/d34ehtb4eu2up0aukimg/main_page_banner.jpg",
    link: "#",
  },
  {
    id: "8",
    title: "",
    subtitle: "",
    image: "https://images.uzum.uz/d34el1fiub35i07ldid0/main_page_banner.jpg",
    link: "#",
  },
  {
    id: "9",
    title: "",
    subtitle: "",
    image: "https://images.uzum.uz/d34kv5viub35i07lght0/main_page_banner.jpg",
    link: "#",
  },
  {
    id: "10",
    title: "",
    subtitle: "",
    image: "https://images.uzum.uz/d34f19t2llnd6jummkfg/main_page_banner.jpg",
    link: "#",
  },
  {
    id: "11",
    title: "",
    subtitle: "",
    image: "https://images.uzum.uz/d34i4qr4eu2up0aum370/main_page_banner.jpg",
    link: "#",
  },
  {
    id: "12",
    title: "",
    subtitle: "",
    image: "https://images.uzum.uz/d28amrt2lln1rmfjdk8g/main_page_banner.jpg",
    link: "#",
  },
  {
    id: "13",
    title: "",
    subtitle: "",
    image: "https://images.uzum.uz/d34j3kfiub35i07lfih0/main_page_banner.jpg",
    link: "#",
  },
  {
    id: "14",
    title: "",
    subtitle: "",
    image: "https://images.uzum.uz/d34khnfiub35i07lgbd0/main_page_banner.jpg",
    link: "#",
  },
  {
    id: "15",
    title: "",
    subtitle: "",
    image: "https://images.uzum.uz/d2vqva52llnd6julfnmg/main_page_banner.jpg",
    link: "#",
  },
  {
    id: "16",
    title: "",
    subtitle: "",
    image: "https://images.uzum.uz/d0cs0m0jsv1iusmhoq30/main_page_banner.jpg",
    link: "#",
  },
  {
    id: "17",
    title: "",
    subtitle: "",
    image: "https://images.uzum.uz/d34k38r4eu2up0aun5f0/main_page_banner.jpg",
    link: "#",
  },
  {
    id: "18",
    title: "",
    subtitle: "",
    image: "https://images.uzum.uz/d34kc4t2llnd6jump73g/main_page_banner.jpg",
    link: "#",
  },
  {
    id: "19",
    title: "",
    subtitle: "",
    image: "https://images.uzum.uz/d2mq5hl2llnd6juj88b0/main_page_banner.jpg",
    link: "#",
  },
  {
    id: "20",
    title: "",
    subtitle: "",
    image: "https://images.uzum.uz/d1id8sniub335orlvp1g/main_page_banner.jpg",
    link: "#",
  },
  {
    id: "21",
    title: "",
    subtitle: "",
    image: "https://images.uzum.uz/d2864352lln1rmfjb1gg/main_page_banner.jpg",
    link: "#",
  },
  {
    id: "22",
    title: "",
    subtitle: "",
    image: "https://images.uzum.uz/d34f6152llnd6jummm5g/main_page_banner.jpg",
    link: "#",
  },
  {
    id: "23",
    title: "",
    subtitle: "",
    image: "https://images.uzum.uz/d2vq7at2llnd6julfjcg/main_page_banner.jpg",
    link: "#",
  },
  {
    id: "24",
    title: "",
    subtitle: "",
    image: "https://images.uzum.uz/d34i36b4eu2up0aum240/main_page_banner.jpg",
    link: "#",
  },
  {
    id: "25",
    title: "",
    subtitle: "",
    image: "https://images.uzum.uz/d2vr0sl2llnd6julfo1g/main_page_banner.jpg",
    link: "#",
  },
  {
    id: "26",
    title: "",
    subtitle: "",
    image: "https://images.uzum.uz/d18fmsq7s4fup34aaj40/main_page_banner.jpg",
    link: "#",
  },
];

export const SimpleSlider: React.FC = () => {
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

  // Для мобильной версии создаем массив с дубликатами: последний + все слайды + первый
  const infiniteSlides = useMemo(() => {
    if (slides.length === 0) return [];
    return [slides[slides.length - 1], ...slides, slides[0]];
  }, []);

  // Обработка перехода в начало/конец для мобильной версии
  useEffect(() => {
    if (!sliderRef.current || infiniteSlides.length === 0) return;
    
    if (mobileSlideIndex === 0) {
      // Достигли начала (дубликат последнего), мгновенно переходим к предпоследнему (реальный последний)
      setTimeout(() => {
        setIsTransitioning(false);
        setMobileSlideIndex(infiniteSlides.length - 2);
        setTimeout(() => setIsTransitioning(true), 50);
      }, 500);
    } else if (mobileSlideIndex === infiniteSlides.length - 1) {
      // Достигли конца (дубликат первого), мгновенно переходим ко второму (реальный первый)
      setTimeout(() => {
        setIsTransitioning(false);
        setMobileSlideIndex(1);
        setTimeout(() => setIsTransitioning(true), 50);
      }, 500);
    }
  }, [mobileSlideIndex, infiniteSlides.length]);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
      // Для мобильной версии - просто увеличиваем индекс, переход обработается в useEffect выше
      setMobileSlideIndex((prev) => prev + 1);
    }, 4000); // Автопрокрутка каждые 4 секунды

    return () => clearInterval(interval);
  }, []);

  // Отслеживание загрузки изображений
  useEffect(() => {
    const imagePromises = slides.map((slide) => {
      return new Promise<void>((resolve) => {
        const img = new Image();
        img.onload = () => {
          setLoadingImages((prev) => {
            const newSet = new Set(prev);
            newSet.delete(slide.id);
            return newSet;
          });
          resolve();
        };
        img.onerror = () => {
          setLoadingImages((prev) => {
            const newSet = new Set(prev);
            newSet.delete(slide.id);
            return newSet;
          });
          resolve();
        };
        img.src = slide.image;
      });
    });

    // Инициализируем состояние загрузки
    setLoadingImages(new Set(slides.map((slide) => slide.id)));

    Promise.all(imagePromises).then(() => {
      setAllImagesLoaded(true);
    });
  }, []);

  const goToSlide = (index: number) => {
    setCurrentSlide(index);
    // Для мобильной версии: добавляем 1, т.к. первый слайд - дубликат
    setMobileSlideIndex(index + 1);
  };

  // Обработчики свайпа для мобильной версии
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
    e.preventDefault(); // Предотвращаем прокрутку страницы и клики по ссылкам
    const currentX = e.touches[0].clientX;
    const offset = currentX - touchStartX.current;
    setDragOffset(offset);
    
    // Если движение превышает 10px, считаем это свайпом
    if (Math.abs(offset) > 10) {
      wasSwiped.current = true;
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!isDragging) return;
    touchEndX.current = e.changedTouches[0].clientX;
    setIsDragging(false);
    
    const minSwipeDistance = 50; // Минимальное расстояние для свайпа
    const diff = touchEndX.current - touchStartX.current;

    if (Math.abs(diff) > minSwipeDistance) {
      wasSwiped.current = true;
      if (diff > 0) {
        // Свайп вправо - предыдущий слайд
        setMobileSlideIndex((prev) => prev - 1);
        setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length);
      } else {
        // Свайп влево - следующий слайд
        setMobileSlideIndex((prev) => prev + 1);
        setCurrentSlide((prev) => (prev + 1) % slides.length);
      }
    }
    
    setIsTransitioning(true);
    setDragOffset(0);
    
    // Небольшая задержка перед разрешением кликов, если был свайп
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

  return (
    <div className="relative w-full h-48 sm:h-80 md:h-96 lg:h-[500px] rounded-2xl shadow-2xl md:overflow-hidden">
      {/* Индикатор загрузки */}
      {!allImagesLoaded && (
        <div className="absolute inset-0 bg-white/90 backdrop-blur-sm flex flex-col items-center justify-center z-10">
          <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
          <p className="mt-4 text-gray-600 font-medium">
            Загрузка изображений...
          </p>
        </div>
      )}

      {/* Мобильная версия с горизонтальной прокруткой (бесконечный слайдер) */}
      <div 
        className="md:hidden relative w-full h-full overflow-visible touch-pan-y"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div className="relative w-full h-full px-[1%] overflow-visible">
          <div
            ref={sliderRef}
            className="flex h-full"
            style={{
              transform: isDragging 
                ? `translateX(${-mobileSlideIndex * 100 + (dragOffset / (sliderRef.current?.offsetWidth || 1)) * 100}%)`
                : `translateX(-${mobileSlideIndex * 100}%)`,
              transition: isTransitioning && !isDragging ? 'transform 500ms ease-out' : 'none',
            }}
          >
            {infiniteSlides.map((slide, index) => (
              <div
                key={`${slide.id}-${index}`}
                className="w-full flex-shrink-0 h-full px-[1%]"
              >
              <a
                href={slide.link}
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full h-full"
                onClick={handleLinkClick}
                onTouchStart={(e) => {
                  // Предотвращаем клик, если началось перетаскивание
                  if (isDragging) {
                    e.preventDefault();
                  }
                }}
              >
                <div className="relative w-full h-full overflow-hidden rounded-2xl">
                  <img
                    src={slide.image}
                    alt="Баннер"
                    className="w-full h-full object-cover"
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
                  {/* Gradient overlay for better text readability */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent"></div>
                </div>
              </a>
            </div>
          ))}
          </div>
        </div>
      </div>

      {/* Десктопная версия с fade-эффектом */}
      <div className="hidden md:block relative w-full h-full">
        {slides.map((slide, index) => (
          <div
            key={slide.id}
            className={`absolute inset-0 w-full h-full transition-opacity duration-700 ease-in-out ${
              index === currentSlide ? 'opacity-100 z-10' : 'opacity-0 z-0'
            }`}
          >
            <a
              href={slide.link}
              target="_blank"
              rel="noopener noreferrer"
              className="block w-full h-full"
            >
              <div className="relative w-full h-full overflow-hidden rounded-2xl">
                <img
                  src={slide.image}
                  alt="Баннер"
                  className="w-full h-full object-cover"
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
                {/* Gradient overlay for better text readability */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent"></div>
              </div>
            </a>
          </div>
        ))}
      </div>

      {/* Индикаторы */}
      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-2">
        {slides.map((_, index) => (
          <button
            key={index}
            className={`w-2 h-2 rounded-full transition-all duration-300 ${
              index === currentSlide
                ? "bg-white shadow-lg scale-125"
                : "bg-white/50"
            }`}
            onClick={() => goToSlide(index)}
            aria-label={`Перейти к слайду ${index + 1}`}
          />
        ))}
      </div>

      {/* Navigation arrows - только для десктопной версии */}
      <button
        className="hidden md:flex absolute left-4 top-1/2 transform -translate-y-1/2 w-10 h-10 bg-white/20 backdrop-blur-sm rounded-full items-center justify-center text-white transition-all duration-200 opacity-100 z-20"
        onClick={() =>
          goToSlide((currentSlide - 1 + slides.length) % slides.length)
        }
        aria-label="Предыдущий слайд"
      >
        <svg
          className="w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 19l-7-7 7-7"
          />
        </svg>
      </button>

      <button
        className="hidden md:flex absolute right-4 top-1/2 transform -translate-y-1/2 w-10 h-10 bg-white/20 backdrop-blur-sm rounded-full items-center justify-center text-white transition-all duration-200 opacity-100 z-20"
        onClick={() => goToSlide((currentSlide + 1) % slides.length)}
        aria-label="Следующий слайд"
      >
        <svg
          className="w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 5l7 7-7 7"
          />
        </svg>
      </button>
    </div>
  );
};

export default SimpleSlider;
