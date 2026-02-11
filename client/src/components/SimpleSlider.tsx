import React, { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useBanners } from "../hooks/useBanners";
import type { Slide } from "./SimpleSliderHeavy";

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
  const { slides } = useBanners({ refresh: "idle" });
  const [Heavy, setHeavy] = useState<React.ComponentType<{ initialSlides?: Slide[] }> | null>(() => null);

  useEffect(() => {
    if (slides.length > 0) preloadImage(slides[0]?.image);
  }, [slides]);

  useEffect(() => {
    // Догружаем heavy-карусель после idle (уменьшает стартовый JS)
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


