/**
 * Размеры баннеров: главная карусель и баннеры между блоками на главной.
 * Удобная регулировка в пикселях по каждому этапу адаптива — правь конфиги ниже.
 */

export type BreakpointKey =
  | "default"
  | "m340"
  | "m363"
  | "m385"
  | "m407"
  | "sm"
  | "md"
  | "lg"
  | "xl"
  | "2xl";

/** Ширины экрана (px), с которых действует брейкпоинт (для обратной совместимости). */
export const BREAKPOINT_WIDTHS: Record<BreakpointKey, number> = {
  default: 0,
  m340: 340,
  m363: 363,
  m385: 385,
  m407: 407,
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  "2xl": 1536,
};

/**
 * Диапазоны viewport (min – max в px). Конфиг брейкпоинта применяется, когда
 * ширина окна в этом диапазоне. Меняй minPx/maxPx под себя (например md: 768–1023).
 */
export const BANNER_VIEWPORT_RANGES: Record<
  BreakpointKey,
  { minPx: number; maxPx: number }
> = {
  default: { minPx: 0, maxPx: 339 },
  m340: { minPx: 340, maxPx: 362 },
  m363: { minPx: 363, maxPx: 384 },
  m385: { minPx: 385, maxPx: 406 },
  m407: { minPx: 407, maxPx: 430 },
  sm: { minPx: 431, maxPx: 767 },
  md: { minPx: 768, maxPx: 1023 },
  lg: { minPx: 1024, maxPx: 1279 },
  xl: { minPx: 1280, maxPx: 1535 },
  "2xl": { minPx: 1536, maxPx: 9999 },
};

/** Настройки баннера между блоками для одного брейкпоинта (всё в px или %). */
export interface BannerBetweenBreakpointConfig {
  /** Минимальная высота блока баннера, px */
  bannerMinHeightPx: number;
  /** Максимальная высота блока баннера, px */
  bannerMaxHeightPx: number;
  /** Макс. ширина картинки внутри блока, % (0–100) */
  imageMaxWidthPercent: number;
  /** Макс. высота картинки внутри блока, % (0–100) */
  imageMaxHeightPercent: number;
  /** Внутренний отступ от краёв блока для картинки, px */
  imagePaddingPx: number;
  /** Сдвиг картинки по горизонтали, px: положительное — вправо, отрицательное — влево */
  imageOffsetXpx: number;
  /** Сдвиг картинки по вертикали, px: положительное — вниз, отрицательное — вверх */
  imageOffsetYpx: number;
}

/** Регулировка баннера и картинки между блоками в пикселях по каждому этапу адаптива. */
export const BANNER_BETWEEN_CONFIG: Record<BreakpointKey, BannerBetweenBreakpointConfig> = {
  /** 0 – 339 px */
  default: {
    bannerMinHeightPx: 240,
    bannerMaxHeightPx: 250,
    imageMaxWidthPercent: 140,
    imageMaxHeightPercent: 140,
    imagePaddingPx: 0,
    imageOffsetXpx: 0,
    imageOffsetYpx: 0,
  },
  /** 340 – 362 px */
  m340: {
    bannerMinHeightPx: 240,
    bannerMaxHeightPx: 250,
    imageMaxWidthPercent: 140,
    imageMaxHeightPercent: 140,
    imagePaddingPx: 0,
    imageOffsetXpx: 0,
    imageOffsetYpx: -10,
  },
  /** 363 – 384 px */
  m363: {
    bannerMinHeightPx: 240,
    bannerMaxHeightPx: 250,
    imageMaxWidthPercent: 140,
    imageMaxHeightPercent: 140,
    imagePaddingPx: 0,
    imageOffsetXpx: 0,
    imageOffsetYpx: -20,
  },
  /** 385 – 406 px */
  m385: {
    bannerMinHeightPx: 240,
    bannerMaxHeightPx: 250,
    imageMaxWidthPercent: 140,
    imageMaxHeightPercent: 140,
    imagePaddingPx: 0,
    imageOffsetXpx: 0,
    imageOffsetYpx: -20,
  },
  /** 407 – 430 px */
  m407: {
    bannerMinHeightPx: 240,
    bannerMaxHeightPx: 250,
    imageMaxWidthPercent: 120,
    imageMaxHeightPercent: 120,
    imagePaddingPx: 0,
    imageOffsetXpx: 0,
    imageOffsetYpx: -10,
  },
  /** 640 – 767 px */
  sm: {
    bannerMinHeightPx: 260,
    bannerMaxHeightPx: 340,
    imageMaxWidthPercent: 110,
    imageMaxHeightPercent: 110,
    imagePaddingPx: 0,
    imageOffsetXpx: 0,
    imageOffsetYpx: -10,
  },
  /** 768 – 1023 px (диапазон в BANNER_VIEWPORT_RANGES) */
  md: {
    bannerMinHeightPx: 240,
    bannerMaxHeightPx: 500,
    imageMaxWidthPercent: 110,
    imageMaxHeightPercent: 190,
    imagePaddingPx: 45,
    imageOffsetXpx: 0,
    imageOffsetYpx: 0,
  },
  /** 1024 – 1279 px (диапазон в BANNER_VIEWPORT_RANGES) */
  lg: {
    bannerMinHeightPx: 360,
    bannerMaxHeightPx: 550,
    imageMaxWidthPercent: 140,
    imageMaxHeightPercent: 120,
    imagePaddingPx: 0,
    imageOffsetXpx: 0,
    imageOffsetYpx: -50,
  },
  /** 1280 – 1535 px */
  xl: {
    bannerMinHeightPx: 420,
    bannerMaxHeightPx: 600,
    imageMaxWidthPercent: 140,
    imageMaxHeightPercent: 115,
    imagePaddingPx: 0,
    imageOffsetXpx: 0,
    imageOffsetYpx: -20,
  },
  /** от 1536 px */
  "2xl": {
    bannerMinHeightPx: 460,
    bannerMaxHeightPx: 650,
    imageMaxWidthPercent: 140,
    imageMaxHeightPercent: 115,
    imagePaddingPx: 0,
    imageOffsetXpx: 0,
    imageOffsetYpx: 0,
  },
};

/** Настройки главной карусели для одного брейкпоинта, px. */
export interface BannerSliderBreakpointConfig {
  bannerMinHeightPx: number;
  bannerMaxHeightPx: number;
}

/** Регулировка главной карусели в пикселях по каждому этапу адаптива. (m340–m407 для баннера не используются.) */
export const BANNER_SLIDER_CONFIG: Record<BreakpointKey, BannerSliderBreakpointConfig> = {
  default: { bannerMinHeightPx: 190, bannerMaxHeightPx: 250 },
  m340: { bannerMinHeightPx: 190, bannerMaxHeightPx: 250 },
  m363: { bannerMinHeightPx: 190, bannerMaxHeightPx: 250 },
  m385: { bannerMinHeightPx: 190, bannerMaxHeightPx: 250 },
  m407: { bannerMinHeightPx: 190, bannerMaxHeightPx: 250 },
  sm: { bannerMinHeightPx: 220, bannerMaxHeightPx: 300 },
  md: { bannerMinHeightPx: 280, bannerMaxHeightPx: 360 },
  lg: { bannerMinHeightPx: 340, bannerMaxHeightPx: 440 },
  xl: { bannerMinHeightPx: 400, bannerMaxHeightPx: 500 },
  "2xl": { bannerMinHeightPx: 440, bannerMaxHeightPx: 560 },
};

/** Главная карусель — классы из BANNER_SLIDER_CONFIG (для совместимости). default = 340–430 px. */
export const BANNER_SLIDER_SIZE_CLASS =
  "aspect-[16/9] min-h-[190px] max-h-[250px] sm:min-h-[220px] sm:max-h-[300px] md:min-h-[280px] md:max-h-[360px] lg:min-h-[340px] lg:max-h-[440px] xl:min-h-[400px] xl:max-h-[500px] 2xl:min-h-[440px] 2xl:max-h-[560px]";

/** Баннеры между блоками — классы запасные; при использовании useBreakpoint берутся из BANNER_BETWEEN_CONFIG. */
export const BANNER_BETWEEN_SIZE_CLASS =
  "aspect-[16/9] bg-slate-100/50";

/**
 * Один рекомендуемый размер картинки для карусели и баннеров между блоками.
 */
export const BANNER_IMAGE_SIZE = { width: 1920, height: 1080 };

/**
 * Размеры карусели в px по брейкпоинтам (дублируют BANNER_SLIDER_CONFIG для справки).
 */
export const BANNER_SLIDER_SIZES_PX = {
  /** viewport 340–430 px */
  default: { minHeight: 190, maxHeight: 250 },
  sm: { minHeight: 220, maxHeight: 300 },
  md: { minHeight: 280, maxHeight: 360 },
  lg: { minHeight: 340, maxHeight: 440 },
  xl: { minHeight: 400, maxHeight: 500 },
  "2xl": { minHeight: 440, maxHeight: 560 },
} as const;

/**
 * Отступ текста от краёв контейнера (слева и справа), чтобы текст не уходил за границы.
 * Рекомендуется 4–5% с каждой стороны (итого 8–10% по горизонтали).
 */
export const CONTENT_PADDING_X_PERCENT = 5;

/** Класс для контента (заголовки, текст): отступ по горизонтали = CONTENT_PADDING_X_PERCENT % */
export const CONTENT_PADDING_X_CLASS = "px-[5%]";
