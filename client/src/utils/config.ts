
export const config = {
  api: {
    baseUrl: import.meta.env.DEV
      ? '/api/v1'
      : (import.meta.env.VITE_API_BASE_URL || 'https://api.ozar.uz/api/v1'),
    timeout: parseInt(import.meta.env.VITE_API_TIMEOUT || '10000'),
  },
  app: {
    name: import.meta.env.VITE_APP_NAME || 'Uzbmarket',
    version: import.meta.env.VITE_APP_VERSION || '1.0.0',
    description: import.meta.env.VITE_APP_DESCRIPTION || 'Интернет магазин Uzbmarket',
  },
  features: {
    analytics: import.meta.env.VITE_ENABLE_ANALYTICS === 'true',
    debugMode: import.meta.env.VITE_ENABLE_DEBUG_MODE === 'true',
    mockData: import.meta.env.VITE_ENABLE_MOCK_DATA === 'true',
  },
  services: {
    googleAnalytics: import.meta.env.VITE_GOOGLE_ANALYTICS_ID || '',
    sentry: import.meta.env.VITE_SENTRY_DSN || '',
  },
  dev: {
    mode: import.meta.env.VITE_DEV_MODE === 'true',
    hotReload: import.meta.env.VITE_ENABLE_HOT_RELOAD === 'true',
  },
  production: {
    compression: import.meta.env.VITE_ENABLE_COMPRESSION === 'true',
    cache: import.meta.env.VITE_ENABLE_CACHE === 'true',
  },
};
export const validateConfig = () => {
  const required = [
    'VITE_API_BASE_URL',
  ];
  const missing = import.meta.env.DEV
    ? []
    : required.filter(key => !import.meta.env[key]);
  if (missing.length > 0) {
    console.warn('Missing environment variables:', missing);
  }
  return missing.length === 0;
};
export const getEnvVar = <T = string>(key: string, defaultValue?: T): T => {
  const value = import.meta.env[key];
  if (value === undefined) {
    if (defaultValue !== undefined) {
      return defaultValue;
    }
    throw new Error(`Environment variable ${key} is required but not set`);
  }
  if (typeof value === 'string' && (value.startsWith('{') || value.startsWith('['))) {
    try {
      return JSON.parse(value);
    } catch {
    }
  }
  if (typeof value === 'string' && !isNaN(Number(value))) {
    return Number(value) as T;
  }
  if (value === 'true' || value === 'false') {
    return (value === 'true') as T;
  }
  return value as T;
};
export default config;
