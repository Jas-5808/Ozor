import React, { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay, Pagination, Navigation } from "swiper/modules";
import type { Slide } from "./SimpleSliderHeavy";
import { BANNER_SLIDER_SIZE_CLASS } from "./sliderBannerSizes";
import { useBanners } from "../hooks/useBanners";

import "swiper/css";
import "swiper/css/pagination";
import "swiper/css/navigation";

type Props = { initialSlides?: Slide[] };

export const SliderSwiper: React.FC<Props> = ({ initialSlides }) => {
  const { t } = useTranslation();
  const { slides: cachedSlides } = useBanners({ refresh: "idle" });
  const slides = useMemo(
    () => (initialSlides && initialSlides.length ? initialSlides : cachedSlides),
    [initialSlides, cachedSlides]
  );

  if (!slides.length) return null;

  return (
    <div
      className={`relative w-full rounded-2xl shadow-2xl overflow-hidden ${BANNER_SLIDER_SIZE_CLASS} min-[450px]:max-h-[250px] min-[150px]:min-h-[150px]`}
    >
      <Swiper
        modules={[Autoplay, Pagination, Navigation]}
        spaceBetween={0}
        slidesPerView={1}
        loop={slides.length > 1}
        autoplay={slides.length > 1 ? { delay: 4000, disableOnInteraction: false } : false}
        pagination={{
          clickable: true,
          bulletClass: "swiper-pagination-bullet !w-2 !h-2 !bg-white/50 !opacity-100",
          bulletActiveClass: "!bg-white !scale-125 !shadow-lg",
        }}
        navigation={{
          prevEl: ".hero-swiper-prev",
          nextEl: ".hero-swiper-next",
        }}
        className="h-full w-full"
        grabCursor
        touchEventsTarget="container"
      >
        {slides.map((slide, index) => (
          <SwiperSlide key={slide.id}>
            <a
              href={slide.link}
              target="_blank"
              rel="noopener noreferrer"
              className="flex w-full h-full items-center justify-center"
            >
              <div className="relative w-full h-full flex items-center justify-center overflow-hidden rounded-2xl">
                <div className="w-[100%] h-[100%] md:w-[100%] md:h-[100%] overflow-hidden rounded-2xl">
                  <img
                    src={slide.image}
                    alt={t("slider.bannerAlt")}
                    className="w-full h-full object-cover object-center bg-white"
                    loading={index === 0 ? "eager" : "lazy"}
                    fetchPriority={index === 0 ? "high" : "low"}
                    decoding="async"
                  />
                </div>
                <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent pointer-events-none" />
              </div>
            </a>
          </SwiperSlide>
        ))}
      </Swiper>

      {/* Кастомные стрелки (Swiper привязывает по классам) */}
      {slides.length > 1 && (
        <>
          <button
            type="button"
            className="hero-swiper-prev hidden md:flex absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/20 backdrop-blur-sm rounded-full items-center justify-center text-white transition hover:bg-white/30 z-20 disabled:opacity-40"
            aria-label={t("slider.prev", { defaultValue: "Предыдущий" })}
          >
            ‹
          </button>
          <button
            type="button"
            className="hero-swiper-next hidden md:flex absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/20 backdrop-blur-sm rounded-full items-center justify-center text-white transition hover:bg-white/30 z-20 disabled:opacity-40"
            aria-label={t("slider.next", { defaultValue: "Следующий" })}
          >
            ›
          </button>
        </>
      )}

      {/* Стили пагинации под наш дизайн */}
      <style>{`
        .swiper-pagination-bullets { bottom: 1rem !important; }
        .swiper-pagination-bullet { transition: transform 0.2s, background 0.2s; }
      `}</style>
    </div>
  );
};

export default SliderSwiper;
