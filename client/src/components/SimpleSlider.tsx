import React, { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import apiClient from "../services/api";
import type { Slide } from "./SimpleSliderHeavy";

const BANNERS_CACHE_KEY = "ozar:banners:v1";
const BANNERS_CACHE_TTL = 10 * 60 * 1000; // 10 minutes

const getBannerBase = () => "https://lab.ozar.uz/media/banners/";

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

function preloadImage(url: string) {
  if (!url || typeof document === "undefined") return;
  const link = document.createElement("link");
  link.rel = "preload";
  link.as = "image";
  link.href = url;
  link.setAttribute("fetchpriority", "high");
  document.head.appendChild(link);
  const img = new Image();
  img.src = url;
}

/**
 * Lite wrapper: быстро показывает 1-й баннер для LCP,
 * а тяжелую карусель догружает после первого рендера.
 */
export const SimpleSlider: React.FC = () => {
  const { t } = useTranslation();
  const [slides, setSlides] = useState<Slide[]>([]);
  const [Heavy, setHeavy] = useState<React.ComponentType<{ initialSlides?: Slide[] }> | null>(() => null);

  useEffect(() => {
    // 1) Пытаемся показать кэш сразу (ускоряет LCP)
    const cached = readCachedSlides();
    if (cached.length > 0) {
      setSlides(cached);
      preloadImage(cached[0]?.image);
    }

    // 2) Обновляем баннеры с API
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
            setSlides(mapped);
            writeCachedSlides(mapped);
            preloadImage(mapped[0]?.image);
          }
        }
      } catch {
        // silent
      }
    };
    load();

    // 3) Догружаем heavy-карусель после idle (уменьшает стартовый JS)
    const idle = (cb: () => void) => {
      const ric = (window as any)?.requestIdleCallback;
      if (typeof ric === "function") {
        return ric(cb, { timeout: 1500 });
      }
      return window.setTimeout(cb, 400);
    };

    const idleId = idle(() => {
      import("./SliderSwiper").then((m) => {
        setHeavy(() => m.default as any);
      });
    });

    return () => {
      controller.abort();
      if (typeof idleId === "number") {
        clearTimeout(idleId);
      } else if (typeof (window as any)?.cancelIdleCallback === "function") {
        (window as any).cancelIdleCallback(idleId);
      }
    };
  }, []);

  const first = useMemo(() => slides?.[0] || null, [slides]);

  if (Heavy) {
    return <Heavy initialSlides={slides} />;
  }

  if (!first) return null;

  return (
    <div
      className="relative w-full aspect-[16/9] rounded-2xl shadow-2xl overflow-hidden"
      style={{ minHeight: "192px", maxHeight: "500px" }}
    >
      <a href={first.link} target="_blank" rel="noopener noreferrer" className="block w-full h-full">
        <img
          src={first.image}
          alt={t("slider.bannerAlt")}
          className="w-full h-full object-cover bg-white rounded-2xl"
          loading="eager"
          fetchPriority="high"
          decoding="async"
        />
      </a>
    </div>
  );
};

export default SimpleSlider;


