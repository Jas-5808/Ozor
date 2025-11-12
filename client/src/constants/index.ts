/**
 * Константы приложения
 * Централизованное хранение всех магических значений
 */

// API конфигурация
export const API_CONFIG = {
  TIMEOUT: 10000,
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 1000,
} as const;

// Кэширование
export const CACHE_TTL = {
  CATEGORIES: 180_000, // 3 минуты
  PRODUCTS: 180_000, // 3 минуты
  PROFILE: 60_000, // 1 минута
} as const;

// Размеры и лимиты
export const LIMITS = {
  SEARCH_QUERY_MAX_LENGTH: 200,
  PRODUCT_NAME_MAX_LENGTH: 100,
  DESCRIPTION_MAX_LENGTH: 1000,
  PHONE_MIN_LENGTH: 9,
  PHONE_MAX_LENGTH: 15,
  PASSWORD_MIN_LENGTH: 6,
  PASSWORD_MAX_LENGTH: 50,
} as const;

// Дебаунс и троттлинг
export const TIMING = {
  DEBOUNCE_SEARCH: 500,
  DEBOUNCE_VALIDATION: 300,
  THROTTLE_SCROLL: 100,
  THROTTLE_RESIZE: 200,
  TOAST_DURATION: 3000,
  COPY_FEEDBACK_DURATION: 1500,
} as const;

// Пути маршрутов
export const ROUTES = {
  HOME: '/',
  CATALOG: '/catalog',
  PRODUCT: '/product',
  CART: '/cart',
  FAVORITES: '/favorites',
  PROFILE: '/profile',
  LOGIN: '/login',
  REGISTRATION: '/registration',
  ADMIN: '/admin',
  SALE: '/sale',
} as const;

// Роли пользователей
export const USER_ROLES = {
  ADMIN: 'admin',
  SALE_OPERATOR: 'sale_operator',
  SALE: 'sale',
  USER: 'user',
  GUEST: 'guest',
} as const;

// Статусы заказов
export const ORDER_STATUS = {
  PENDING: 'pending',
  CONFIRMED: 'confirmed',
  PROCESSING: 'processing',
  SHIPPED: 'shipped',
  DELIVERED: 'delivered',
  CANCELLED: 'cancelled',
} as const;

// Методы доставки
export const DELIVERY_METHODS = {
  PICKUP: 'pickup',
  COURIER: 'courier',
} as const;

// Breakpoints для responsive дизайна
export const BREAKPOINTS = {
  MOBILE: 768,
  TABLET: 1024,
  DESKTOP: 1280,
} as const;

// Цвета (для использования в коде, не в стилях)
export const COLORS = {
  PRIMARY: '#003d32',
  PRIMARY_HOVER: '#004d3a',
  SECONDARY: '#04734b',
  SECONDARY_HOVER: '#056a4f',
  ERROR: '#b91c1c',
  SUCCESS: '#059669',
  WARNING: '#d97706',
  INFO: '#1e68ff',
} as const;

// Локализация
export const LOCALES = {
  RU: 'ru',
  UZ: 'uz',
} as const;

// Локальное хранилище ключи
export const STORAGE_KEYS = {
  ACCESS_TOKEN: 'access_token',
  REFRESH_TOKEN: 'refresh_token',
  APP_STATE: 'app_state',
  USER_LOCATION: 'userLocation',
  HAS_SHOWN_LOCATION_MODAL: 'hasShownLocationModal',
} as const;

// Сообщения об ошибках
export const ERROR_MESSAGES = {
  NETWORK: 'Проблемы с подключением к интернету. Проверьте соединение.',
  UNAUTHORIZED: 'Ошибка авторизации. Пожалуйста, войдите снова.',
  NOT_FOUND: 'Запрашиваемый ресурс не найден.',
  SERVER_ERROR: 'Ошибка сервера. Пожалуйста, попробуйте позже.',
  VALIDATION: 'Проверьте правильность введенных данных.',
  UNKNOWN: 'Произошла неизвестная ошибка. Пожалуйста, попробуйте позже.',
} as const;

// Сообщения успеха
export const SUCCESS_MESSAGES = {
  LOGIN: 'Успешный вход в систему',
  LOGOUT: 'Вы успешно вышли из системы',
  PROFILE_UPDATE: 'Профиль успешно обновлен',
  CART_ADD: 'Товар добавлен в корзину',
  CART_REMOVE: 'Товар удален из корзины',
  ORDER_CREATED: 'Заказ успешно создан',
  LINK_COPIED: 'Ссылка скопирована в буфер обмена',
} as const;

// Валидация
export const VALIDATION = {
  EMAIL_REGEX: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  PHONE_REGEX: /^\+?[1-9]\d{1,14}$/,
  URL_REGEX: /^https?:\/\/.+/,
} as const;

