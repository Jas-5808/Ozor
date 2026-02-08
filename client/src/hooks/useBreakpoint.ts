import { useState, useEffect } from "react";
import type { BreakpointKey } from "../components/sliderBannerSizes";
import { BANNER_VIEWPORT_RANGES } from "../components/sliderBannerSizes";

const KEYS: BreakpointKey[] = [
  "2xl",
  "xl",
  "lg",
  "md",
  "sm",
  "m407",
  "m385",
  "m363",
  "m340",
  "default",
];

function getBreakpoint(width: number): BreakpointKey {
  for (const key of KEYS) {
    const { minPx, maxPx } = BANNER_VIEWPORT_RANGES[key];
    if (width >= minPx && width <= maxPx) return key;
  }
  return "default";
}

/**
 * Возвращает текущий брейкпоинт по ширине окна (default, sm, md, lg, xl, 2xl).
 * Для удобной подстановки в BANNER_BETWEEN_CONFIG и BANNER_SLIDER_CONFIG.
 */
export function useBreakpoint(): BreakpointKey {
  const [bp, setBp] = useState<BreakpointKey>(() =>
    typeof window === "undefined" ? "default" : getBreakpoint(window.innerWidth)
  );

  useEffect(() => {
    const onResize = () => setBp(getBreakpoint(window.innerWidth));
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  return bp;
}
