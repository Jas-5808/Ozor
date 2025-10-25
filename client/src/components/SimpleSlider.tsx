import React, { useState, useEffect } from "react";

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
  const [loadingImages, setLoadingImages] = useState<Set<string>>(new Set());
  const [allImagesLoaded, setAllImagesLoaded] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
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
  };

  return (
    <div className="relative w-full h-64 sm:h-80 md:h-96 lg:h-[500px] overflow-hidden rounded-2xl shadow-2xl">
      {/* Индикатор загрузки */}
      {!allImagesLoaded && (
        <div className="absolute inset-0 bg-white/90 backdrop-blur-sm flex flex-col items-center justify-center z-10">
          <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
          <p className="mt-4 text-gray-600 font-medium">
            Загрузка изображений...
          </p>
        </div>
      )}

      <div
        className="flex h-full transition-transform duration-500 ease-in-out"
        style={{ transform: `translateX(-${currentSlide * 100}%)` }}
      >
        {slides.map((slide) => (
          <div key={slide.id} className="w-full h-full flex-shrink-0">
            <a
              href={slide.link}
              target="_blank"
              rel="noopener noreferrer"
              className="block w-full h-full group"
            >
              <div className="relative w-full h-full overflow-hidden">
                <img
                  src={slide.image}
                  alt="Баннер"
                  className="w-full h-full object-cover transition-all duration-300 group-hover:scale-105"
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
                : "bg-white/50 hover:bg-white/75"
            }`}
            onClick={() => goToSlide(index)}
            aria-label={`Перейти к слайду ${index + 1}`}
          />
        ))}
      </div>

      {/* Navigation arrows */}
      <button
        className="absolute left-4 top-1/2 transform -translate-y-1/2 w-10 h-10 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center text-white hover:bg-white/30 transition-all duration-200 opacity-0 group-hover:opacity-100"
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
        className="absolute right-4 top-1/2 transform -translate-y-1/2 w-10 h-10 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center text-white hover:bg-white/30 transition-all duration-200 opacity-0 group-hover:opacity-100"
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
