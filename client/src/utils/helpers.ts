
import { config } from "./config";

export const formatPrice = (price: number, currency: string = 'UZS'): string => {
  return new Intl.NumberFormat('ru-RU').format(price) + ' ' + currency;
};
export const calculateDiscount = (basePrice: number, salePrice: number): number => {
  if (basePrice <= salePrice) return 0;
  return Math.round(((basePrice - salePrice) / basePrice) * 100);
};
export const formatDate = (date: string | Date): string => {
  return new Intl.DateTimeFormat('ru-RU', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(new Date(date));
};
export const truncateText = (text: string | undefined | null, maxLength: number): string => {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + '...';
};
export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};
export const validatePhone = (phone: string): boolean => {
  const phoneRegex = /^\+?[\d\s\-\(\)]{10,}$/;
  return phoneRegex.test(phone);
};
export const generateId = (): string => {
  return Math.random().toString(36).substr(2, 9);
};
export const storage = {
  get: (key: string) => {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : null;
    } catch (error) {
      console.error('Error reading from localStorage:', error);
      return null;
    }
  },
  set: (key: string, value: any) => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.error('Error writing to localStorage:', error);
    }
  },
  remove: (key: string) => {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.error('Error removing from localStorage:', error);
    }
  },
  clear: () => {
    try {
      localStorage.clear();
    } catch (error) {
      console.error('Error clearing localStorage:', error);
    }
  }
};
export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeout: number;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};
export const throttle = <T extends (...args: any[]) => any>(
  func: T,
  limit: number
): ((...args: Parameters<T>) => void) => {
  let inThrottle: boolean;
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
};
export const isMobile = (): boolean => {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
};
export const isDesktop = (): boolean => {
  return !isMobile();
};
export const getScreenSize = () => {
  return {
    width: window.innerWidth,
    height: window.innerHeight,
  };
};
export const getProductImageUrl = (imagePath: string): string => {
  if (!imagePath) return '/img/NaturalTitanium.jpg';
  if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
    return imagePath;
  }
  if (imagePath.startsWith('/')) {
    return imagePath;
  }
  // API возвращает относительные пути вида products/... или variants/...
  const baseUrl = config.media.baseUrl;
  return `${baseUrl.replace(/\/+$/, "")}/${imagePath}`;
};

export const getCategoryImageUrl = (imagePath: string | undefined): string => {
  if (!imagePath) return '';
  if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
    return imagePath;
  }
  if (imagePath.startsWith('/')) {
    return imagePath;
  }
  // API возвращает относительные пути вида categories/...
  const baseUrl = config.media.baseUrl;
  return `${baseUrl.replace(/\/+$/, "")}/${imagePath}`;
};

// Безопасное извлечение изображения варианта (если приходит variant_media).
// Важно: media может содержать видео (mp4) — его нельзя подставлять в <img>.
export const getVariantMainImage = (
  variant_media?: { file: string; is_main?: boolean; type?: string }[]
): string | null => {
  if (!variant_media || variant_media.length === 0) return null;

  const isVideo = (m?: { file?: string; type?: string }) => {
    const t = String(m?.type || "").toLowerCase();
    const f = String(m?.file || "").toLowerCase();
    return t === "video" || f.endsWith(".mp4") || f.endsWith(".webm") || f.endsWith(".mov");
  };

  const images = variant_media.filter((m) => m?.file && !isVideo(m));
  const preferred = images.length
    ? (images.find((m) => m.is_main) || images[0])
    : (variant_media.find((m) => m?.file) || null);

  return preferred?.file ? getProductImageUrl(preferred.file) : null;
};

// Сокращение URL для отображения
export const shortenUrl = (url: string, maxLength: number = 50): string => {
  if (!url || url.length <= maxLength) return url;
  try {
    const urlObj = new URL(url);
    const domain = urlObj.hostname;
    const path = urlObj.pathname + urlObj.search;
    if (domain.length + path.length <= maxLength) return url;
    const shortPath = path.length > maxLength - domain.length - 10
      ? path.substring(0, maxLength - domain.length - 10) + '...'
      : path;
    return `${domain}${shortPath}`;
  } catch {
    // Если не валидный URL, просто обрезаем
    return url.substring(0, maxLength) + '...';
  }
};
