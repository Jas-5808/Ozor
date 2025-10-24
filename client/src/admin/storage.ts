type Key = 'admin_products'|'admin_categories'|'admin_banners'|'admin_orders'|'admin_users';

export const adminStore = {
  load<T>(key: Key, fallback: T): T {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return fallback;
      return JSON.parse(raw) as T;
    } catch {
      return fallback;
    }
  },
  save<T>(key: Key, value: T) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
  }
};

