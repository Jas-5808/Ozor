import { useEffect, useState } from "react";
import apiClient from "../services/api";
import type { Slide } from "../components/SimpleSliderHeavy";

type RefreshMode = "idle" | "always" | "never";

const BANNERS_CACHE_KEY = "ozar:banners:v1";
const BANNERS_CACHE_TTL = 10 * 60 * 1000;

const getBannerBase = () => "https://lab.ozar.uz/media/banners/";

const normalizeBannerUrl = (url: string): string => {
  if (!url) return "";
  const base = getBannerBase();
  const match = url.match(/\/media\/banners\/(.+)$/);
  const path = match ? match[1] : url;
  if (url.startsWith(base)) return url;
  if (/https?:\/\/(ozar\.uz|lab\.ozar\.uz)\/media\/banners\//.test(url)) {
    return `${base}${path}`;
  }
  return `${base}${path}`;
};

type CacheEntry = { slides: Slide[]; time: number };

let memoryCache: CacheEntry | null = null;
let inFlight: Promise<Slide[]> | null = null;

const readCachedSlides = (): CacheEntry | null => {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(BANNERS_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    if (!Array.isArray(parsed.slides) || typeof parsed.time !== "number") return null;
    if (Date.now() - parsed.time > BANNERS_CACHE_TTL) return null;
    return { slides: parsed.slides as Slide[], time: parsed.time };
  } catch {
    return null;
  }
};

const writeCachedSlides = (slides: Slide[]) => {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(BANNERS_CACHE_KEY, JSON.stringify({ time: Date.now(), slides }));
  } catch {
    // ignore
  }
};

const mapSlides = (results: any[]): Slide[] => {
  return results
    .sort((a, b) => (a?.order ?? 0) - (b?.order ?? 0))
    .map((b: any) => ({
      id: b?.id || crypto.randomUUID(),
      title: b?.title || "",
      subtitle: "",
      image: normalizeBannerUrl(b?.image || ""),
      link: b?.link || "#",
    }))
    .filter((s: Slide) => s.image);
};

const scheduleIdle = (cb: () => void) => {
  const ric = (window as any)?.requestIdleCallback;
  if (typeof ric === "function") {
    return ric(cb, { timeout: 1500 });
  }
  return window.setTimeout(cb, 400);
};

const cancelIdle = (id: number | ReturnType<typeof scheduleIdle>) => {
  if (typeof id === "number") {
    clearTimeout(id);
    return;
  }
  const cancel = (window as any)?.cancelIdleCallback;
  if (typeof cancel === "function") cancel(id);
};

const fetchBanners = async (): Promise<Slide[]> => {
  const now = Date.now();
  if (memoryCache && now - memoryCache.time < BANNERS_CACHE_TTL) {
    return memoryCache.slides;
  }

  const cached = readCachedSlides();
  if (cached) {
    memoryCache = cached;
    return cached.slides;
  }

  if (inFlight) return inFlight;

  const run = async () => {
    try {
      const res = await apiClient.get("/marketing/banners");
      const results = (res as any)?.data?.results;
      if (!Array.isArray(results) || results.length === 0) return memoryCache?.slides || [];
      const mapped = mapSlides(results);
      if (mapped.length > 0) {
        memoryCache = { slides: mapped, time: Date.now() };
        writeCachedSlides(mapped);
      }
      return mapped;
    } catch {
      return memoryCache?.slides || [];
    }
  };

  inFlight = run().finally(() => {
    inFlight = null;
  });
  return inFlight;
};

export const useBanners = (options?: { refresh?: RefreshMode }) => {
  const refresh = options?.refresh ?? "idle";
  const initialCache = readCachedSlides();
  if (initialCache && (!memoryCache || memoryCache.time < initialCache.time)) {
    memoryCache = initialCache;
  }

  const [slides, setSlides] = useState<Slide[]>(() => {
    if (memoryCache && Date.now() - memoryCache.time < BANNERS_CACHE_TTL) {
      return memoryCache.slides;
    }
    return initialCache?.slides || [];
  });
  const [loading, setLoading] = useState(slides.length === 0);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      setLoading(slides.length === 0);
      const list = await fetchBanners();
      if (!cancelled && list.length > 0) setSlides(list);
      if (!cancelled) setLoading(false);
    };

    if (refresh === "never") {
      if (slides.length === 0) run();
      return () => {
        cancelled = true;
      };
    }

    if (refresh === "always") {
      run();
      return () => {
        cancelled = true;
      };
    }

    if (slides.length === 0) {
      run();
      return () => {
        cancelled = true;
      };
    }

    const idleId = scheduleIdle(run);
    return () => {
      cancelled = true;
      cancelIdle(idleId);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { slides, loading } as const;
};

export default useBanners;
