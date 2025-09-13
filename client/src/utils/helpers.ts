
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
export const truncateText = (text: string, maxLength: number): string => {
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
  const baseUrl = 'https://lab.ozar.uz/media';
  return `${baseUrl}/${imagePath}`;
};