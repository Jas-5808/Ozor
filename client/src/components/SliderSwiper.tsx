import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay, Pagination, Navigation } from "swiper/modules";
import apiClient from "../services/api";
import type { Slide } from "./SimpleSliderHeavy";
import { BANNER_SLIDER_SIZE_CLASS } from "./sliderBannerSizes";

import "swiper/css";
import "swiper/css/pagination";
import "swiper/css/navigation";

const BANNERS_CACHE_KEY = "ozar:banners:v1";
const BANNERS_CACHE_TTL = 10 * 60 * 1000;

const getBannerBase = () => "https://lab.ozar.uz/media/banners/";

const normalizeBannerUrl = (url: string): string => {
  if (!url) return "";
  const base = getBannerBase();
  const match = url.match(/\/media\/banners\/(.+)$/);
  const path = match ? match[1] : url;
  if (url.startsWith(base)) return url;
  if (/https?:\/\/(ozar\.uz|lab\.ozar\.uz)\/media\/banners\//.test(url)) return `${base}${path}`;
  return `${base}${path}`;
};

function readCachedSlides(): Slide[] {
  try {
    const raw = localStorage.getItem(BANNERS_CACHE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!parsed?.slides || !Array.isArray(parsed.slides)) return [];
    if (typeof parsed.time === "number" && Date.now() - parsed.time > BANNERS_CACHE_TTL) return [];
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

type Props = { initialSlides?: Slide[] };

export const SliderSwiper: React.FC<Props> = ({ initialSlides }) => {
  const { t } = useTranslation();
  const [slides, setSlides] = useState<Slide[]>(() => initialSlides || readCachedSlides());

  useEffect(() => {
    if (initialSlides?.length) setSlides(initialSlides);
  }, [initialSlides]);

  useEffect(() => {
    const controller = new AbortController();
    apiClient
      .get("/marketing/banners", { signal: controller.signal })
      .then((res: any) => {
        const results = res?.data?.results;
        if (!Array.isArray(results) || results.length === 0) return;
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
          setSlides(mapped);
          writeCachedSlides(mapped);
        }
      })
      .catch(() => {});
    return () => controller.abort();
  }, []);

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
