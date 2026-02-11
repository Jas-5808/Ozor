import React from "react";
import { useTranslation } from "react-i18next";
import { BANNER_BETWEEN_CONFIG, BANNER_BETWEEN_SIZE_CLASS } from "./sliderBannerSizes";
import { useBreakpoint } from "../hooks/useBreakpoint";
import { useBanners } from "../hooks/useBanners";

/** Куда сдвинуть картинку внутри баннера (блок не двигается). */
export type BannerImagePosition =
  | "center"
  | "top"
  | "bottom"
  | "left"
  | "right"
  | "top-left"
  | "top-right"
  | "bottom-left"
  | "bottom-right";

const OBJECT_POSITION_CLASS: Record<BannerImagePosition, string> = {
  center: "object-center",
  top: "object-top",
  bottom: "object-bottom",
  left: "object-left",
  right: "object-right",
  "top-left": "object-left-top",
  "top-right": "object-right-top",
  "bottom-left": "object-left-bottom",
  "bottom-right": "object-right-bottom",
};

/** Выравнивание картинки внутри блока (flex), чтобы двигать её, не трогая баннер. */
const ALIGN_CLASS: Record<BannerImagePosition, string> = {
  center: "justify-center items-center",
  top: "justify-center items-start",
  bottom: "justify-center items-end",
  left: "justify-start items-center",
  right: "justify-end items-center",
  "top-left": "justify-start items-start",
  "top-right": "justify-end items-start",
  "bottom-left": "justify-start items-end",
  "bottom-right": "justify-end items-end",
};

interface SliderBannerBetweenProps {
  slideIndex?: number;
  /** Сдвиг картинки внутри блока: какая часть картинки в кадре (center, top, bottom, left, right и углы). */
  imagePosition?: BannerImagePosition;
}

/**
 * Один баннер из тех же слайдов, что и главная карусель. Между блоками на главной.
 */
export const SliderBannerBetween: React.FC<SliderBannerBetweenProps> = ({
  slideIndex = 0,
  imagePosition = "center",
}) => {
  const { t } = useTranslation();
  const breakpoint = useBreakpoint();
  const config = BANNER_BETWEEN_CONFIG[breakpoint];
  const { slides } = useBanners({ refresh: "idle" });

  const index = slides.length ? slideIndex % slides.length : 0;
  const slide = slides[index];
  if (!slide?.image) return null;

  return (
    <section className="relative rounded-2xl overflow-hidden shadow-sm" aria-hidden="true">
      <a
        href={slide.link}
        target="_blank"
        rel="noopener noreferrer"
        className={`flex w-full ${BANNER_BETWEEN_SIZE_CLASS} ${ALIGN_CLASS[imagePosition]}`}
        style={{
          minHeight: config.bannerMinHeightPx,
          maxHeight: config.bannerMaxHeightPx,
          padding: config.imagePaddingPx,
        }}
      >
        <img
          src={slide.image}
          alt={t("slider.bannerAlt")}
          className={`w-auto h-auto object-contain rounded-xl ${OBJECT_POSITION_CLASS[imagePosition]}`}
          style={{
            maxWidth: `${config.imageMaxWidthPercent}%`,
            maxHeight: `${config.imageMaxHeightPercent}%`,
            transform: `translate(${config.imageOffsetXpx}px, ${config.imageOffsetYpx}px)`,
          }}
          loading="lazy"
        />
      </a>
    </section>
  );
};

export default SliderBannerBetween;
