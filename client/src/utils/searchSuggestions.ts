import { shopAPI } from "../services/api";

const CACHE_TTL = 2 * 60 * 1000; // 2 minutes
const cache = new Map<string, { time: number; data: any[] }>();
const inflight = new Map<string, Promise<any[]>>();

export async function fetchSearchSuggestions(query: string, limit: number = 5): Promise<any[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];
  const key = `${trimmed.toLowerCase()}:${limit}`;
  const now = Date.now();
  const cached = cache.get(key);
  if (cached && now - cached.time < CACHE_TTL) {
    return cached.data;
  }
  const existing = inflight.get(key);
  if (existing) return existing;
  const promise = shopAPI
    .searchProducts(trimmed, { offset: 0, limit })
    .then((response) => response.data || [])
    .then((data) => {
      cache.set(key, { time: Date.now(), data });
      inflight.delete(key);
      return data;
    })
    .catch((error) => {
      inflight.delete(key);
      throw error;
    });
  inflight.set(key, promise);
  return promise;
}
