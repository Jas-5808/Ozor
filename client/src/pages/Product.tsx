import React, { useEffect, useMemo, useState, useRef, FormEvent, useCallback } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { formatPrice, getProductImageUrl, storage } from "../utils/helpers";
import { Product as ProductType, ProductDetail } from "../types";
import { shopAPI } from "../services/api";
import { uzbekistanLocations, getCitiesByRegion } from "../data/uzbekistanLocations";
import { useApp } from "../context/AppContext";
import ProductCard from "../components/ui/ProductCard";
import PhoneInput from "../components/forms/PhoneInput";
import useSEO from "../hooks/useSEO";
import ProductPageSkeleton from "../components/ProductPageSkeleton";
import { logger } from "../utils/logger";
import { handleApiError, getUserFriendlyMessage } from "../utils/errorHandler";
import { ERROR_MESSAGES } from "../constants";
import { resolveProductDescription, resolveProductName, splitProductsIntoPrimaryAndVariants } from "../utils/productUtils";
import { PRODUCT_RELATED_LIMIT } from "../config/pagination";

type LocationState = { product?: ProductType };

// Функция для загрузки всех вариантов товара (использует новый API /api/v1/shop/product/{product_id})
async function fetchAllProductVariants(productId: string): Promise<ProductDetail | null> {
  try {
    logger.debug("Loading product", { productId });

    const response = await shopAPI.getProductById(productId);
    const payload: any = (response as any)?.data ?? response;
    const productData: any = payload?.data ?? payload;
    logger.debug("Product API response", { productId, hasData: !!productData });

    if (!productData) return null;

    // FIX (п.1): сравнение ID строго через String(...)
    const requestedId = String(productId);
    const receivedId = String(productData.id ?? productData.product_id ?? "");
    if (receivedId && receivedId !== requestedId) {
      logger.errorWithContext(new Error("Product ID mismatch"), {
        context: "fetchAllProductVariants",
        requested: requestedId,
        received: receivedId,
      });
      return null;
    }

    const allAttributes = (productData.attributes || []).map((attr: any) => ({
      id: String(attr.id),
      name: attr.name,
      unit: attr.unit || "",
    }));

    const allVariants = (productData.variants || []).map((variant: any) => {
      const attributeValues = (variant.attribute_values || []).map((av: any) => {
        let attributeId = av.attribute_id ? String(av.attribute_id) : "";
        if (!attributeId && av.attribute_name) {
          const matchingAttr = (productData.attributes || []).find(
            (attr: any) => String(attr.name) === String(av.attribute_name) || String(attr.id) === String(av.attribute_name)
          );
          attributeId = matchingAttr?.id ? String(matchingAttr.id) : String(av.attribute_name || "");
        }

        return {
          id: String(av.id),
          variant_id: String(variant.id),
          attribute_id: attributeId,
          attribute_name: av.attribute_name || "",
          value: av.value || "",
        };
      });

      return {
        id: String(variant.id),
        product_id: String(variant.product_id || productData.id || productId),
        sku: variant.sku,
        price: variant.price,
        base_price: variant.base_price ?? variant.price ?? null,
        stock: variant.stock ?? 0,
        attribute_values: attributeValues,
        variant_media: variant.media || [],
      };
    });

    const firstVariant = productData.variants?.[0];

    const productDetail: ProductDetail = {
      product_id: String(productData.id || productData.product_id || productId),
      product_name: resolveProductName(productData),
      product_description: resolveProductDescription(productData),
      name_uz: productData.name || productData.name_uz || productData.product_name,
      name_ru: productData.name_ru || productData.product_name_ru,
      description_uz: productData.description_uz || productData.product_description_uz || productData.description || productData.product_description,
      description_ru: productData.description_ru || productData.product_description_ru || productData.description || productData.product_description,
      category: productData.category,
      refferal_price: productData.refferal_price ?? 0,
      main_image: productData.main_image || "",
      variant_id: firstVariant?.id ? String(firstVariant.id) : "",
      variant_sku: firstVariant?.sku || "",
      price: firstVariant?.price ?? 0,
      stock: firstVariant?.stock ?? 0,
      variant_attributes: firstVariant?.attribute_values || [],
      attributes: allAttributes,
      variants: allVariants,
    };

    logger.debug("ProductDetail assembled", {
      product_id: productDetail.product_id,
      product_name: productDetail.product_name,
      variants_count: productDetail.variants.length,
    });

    return productDetail;
  } catch (error) {
    logger.errorWithContext(error, { context: "fetchAllProductVariants" });
    throw error;
  }
}

type QuickOrderSheetProps = {
  open: boolean;
  onClose: () => void;
  product: ProductDetail;
  variant: ProductDetail["variants"][0] | null;
  name: string;
  phone: string;
  onNameChange: (value: string) => void;
  onPhoneChange: (value: string) => void;
  agreeTerms: boolean;
  onAgreeChange: (value: boolean) => void;
  loading: boolean;
  error: string | null;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  locationLabel: string;
  locationHint?: string;
};

const QuickOrderSheet: React.FC<QuickOrderSheetProps> = ({
  open,
  onClose,
  product,
  variant,
  name,
  phone,
  onNameChange,
  onPhoneChange,
  agreeTerms,
  onAgreeChange,
  loading,
  error,
  onSubmit,
  locationLabel,
  locationHint,
}) => {
  if (!open) return null;
  const { t } = useTranslation();

  // В media могут быть видео — в summary нужна именно картинка
  const summaryImage = getProductImageUrl(
    (variant?.variant_media || [])
      .filter(
        (m: any) =>
          String(m?.type || "").toLowerCase() !== "video" &&
          !String(m?.file || "").toLowerCase().endsWith(".mp4")
      )
      .find((m: any) => m?.is_main)?.file ||
      (variant?.variant_media || [])
        .filter(
          (m: any) =>
            String(m?.type || "").toLowerCase() !== "video" &&
            !String(m?.file || "").toLowerCase().endsWith(".mp4")
        )?.[0]?.file ||
      product.main_image
  );

  const price = variant?.price ?? product.price ?? 0;
  const sku = variant?.sku || product.variant_sku || product.product_id;
  const inStock = (variant?.stock ?? product.stock ?? 0) > 0;

  return (
    <div className="fixed inset-0 z-[80] flex justify-end bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="h-full w-full max-w-md rounded-l-3xl bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <div>
            <p className="text-xs uppercase tracking-wide text-gray-400">{t("product.quickOrder.badge")}</p>
            <h3 className="text-lg font-semibold text-gray-900">{t("product.quickOrder.subtitle")}</h3>
          </div>
          <button
            type="button"
            aria-label={t("common.actions.close")}
            onClick={onClose}
            className="rounded-full border border-gray-200 p-2 text-gray-500 transition hover:text-gray-900"
          >
            ×
          </button>
        </div>

        <div className="h-[calc(100%-72px)] overflow-y-auto px-6 py-5">
          <div className="rounded-2xl border border-gray-100 bg-gray-50/70 p-4">
            <div className="flex gap-3">
              <div className="h-16 w-16 flex-shrink-0 overflow-hidden rounded-xl bg-white shadow-inner">
                <img src={summaryImage} alt={product.product_name} className="h-full w-full object-cover" />
              </div>
              <div className="flex flex-1 flex-col">
                <p className="line-clamp-2 text-sm font-semibold text-gray-900">{product.product_name}</p>
                <span className="mt-1 text-xs text-gray-400">
                  {t("product.quickOrder.skuLabel")}: {sku}
                </span>
                <div className="mt-2 flex items-center gap-2">
                  <span className="text-base font-bold text-gray-900">{formatPrice(price)}</span>
                  <span className={`text-sm font-medium ${inStock ? "text-emerald-600" : "text-rose-500"}`}>
                    {inStock ? t("common.status.inStock") : t("common.status.outOfStock")}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4 flex items-center gap-3 rounded-2xl border border-gray-100 bg-white px-4 py-3">
            <div className="rounded-2xl bg-emerald-50 p-2">
              <img src="/icons/location.svg" alt="" className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-gray-400">{t("product.deliveryLabel")}</p>
              <p className="text-sm font-medium text-gray-900">{locationLabel}</p>
              {locationHint && <p className="text-xs text-gray-500">{locationHint}</p>}
            </div>
          </div>

          <form className="mt-5 flex flex-col gap-4" onSubmit={onSubmit}>
            <div>
              <label className="text-sm font-medium text-gray-700" htmlFor="quick-order-name">
                {t("product.quickOrder.nameLabel")}
              </label>
              <input
                id="quick-order-name"
                type="text"
                value={name}
                onChange={(e) => onNameChange(e.target.value)}
                className="mt-1 h-12 w-full rounded-2xl border border-gray-200 px-4 text-base outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                placeholder={t("product.quickOrder.namePlaceholder")}
                autoComplete="name"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700" htmlFor="quick-order-phone">
                {t("product.quickOrder.phoneLabel")}
              </label>
              <PhoneInput
                className="mt-1 h-12 w-full rounded-2xl border border-gray-200 px-4 text-base outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                value={phone}
                onChange={onPhoneChange}
                placeholder="+998 (__) ___ __ __"
                required
              />
            </div>

            <label className="flex items-start gap-3 text-sm text-gray-600">
              <input
                type="checkbox"
                checked={agreeTerms}
                onChange={(e) => onAgreeChange(e.target.checked)}
                className="mt-1 h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
              />
              <span>
                {t("product.quickOrder.consent")}{" "}
                <a href="/terms" className="text-emerald-600 hover:underline">
                  {t("product.quickOrder.terms")}
                </a>
              </span>
            </label>

            {error && <div className="rounded-2xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm text-rose-600">{error}</div>}

            <button
              type="submit"
              disabled={loading}
              className="h-12 rounded-2xl text-base font-semibold text-white shadow-[0_12px_24px_rgba(0,63,50,0.25)] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
              style={{ background: "linear-gradient(92.41deg, #003d32, #04734b)" }}
            >
              {loading ? t("product.quickOrder.submitting") : t("product.quickOrder.submit")}
            </button>

            <p className="text-center text-xs text-gray-500">{t("product.quickOrder.note")}</p>
          </form>
        </div>
      </div>
    </div>
  );
};

export function Product() {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();

  const referralCode = useMemo(() => new URLSearchParams(location.search).get("ref") || "", [location.search]);

  const routeState = (location.state ?? {}) as LocationState;
  const variantIdFromQuery = useMemo(() => new URLSearchParams(location.search).get("variant") || "", [location.search]);
  const variantIdFromState = useMemo(
    () => (routeState?.product?.variant_id ? String(routeState.product.variant_id) : ""),
    [routeState]
  );
  const preferredVariantId = useMemo(() => variantIdFromQuery || variantIdFromState, [variantIdFromQuery, variantIdFromState]);

  const [fetchedProduct, setFetchedProduct] = useState<ProductDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [selectedVariant, setSelectedVariant] = useState<ProductDetail["variants"][0] | null>(null);

  const [recentlyViewed, setRecentlyViewed] = useState<ProductType[]>([]);

  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [lightboxZoom, setLightboxZoom] = useState(1);
  const [recommended, setRecommended] = useState<ProductType[]>([]);
  const [recommendedLoading, setRecommendedLoading] = useState(false);
  const [recommendedError, setRecommendedError] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<"description" | "characteristics" | "comments">("description");
  const [comments] = useState<Array<{ id: string; author: string; text: string; createdAt: string }>>([]);

  const [phone, setPhone] = useState<string>("");
  const [name, setName] = useState<string>("");

  const [isQuickOrderOpen, setIsQuickOrderOpen] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(true);

  const [quickOrderLoading, setQuickOrderLoading] = useState(false);
  const [quickOrderError, setQuickOrderError] = useState<string | null>(null);

  const [quickOrderRegion, setQuickOrderRegion] = useState<string>("");

  const productRef = useRef<HTMLDivElement>(null);

  const thumbsScrollRef = useRef<HTMLDivElement | null>(null);

  const productFromState = routeState?.product;

  const product = useMemo<ProductDetail | null>(() => {
    const base = fetchedProduct
      ? fetchedProduct
      : productFromState
      ? {
          ...(productFromState as any),
          attributes: [],
          variants: [],
        }
      : null;
    if (!base) return null;

    const localizedName = resolveProductName(base) || base.product_name;
    const localizedDescription = resolveProductDescription(base) || base.product_description;
    if (localizedName === base.product_name && localizedDescription === base.product_description) {
      return base;
    }
    return {
      ...base,
      product_name: localizedName,
      product_description: localizedDescription,
    };
  }, [productFromState, fetchedProduct, i18n.language]);

  const categoryId = useMemo(() => {
    if (!product?.category) return "";
    return typeof product.category === "string" ? product.category : String((product.category as any)?.id || "");
  }, [product?.category]);

  const { addToCart, updateCartItem, removeFromCart, state: appState } = useApp();

  const locationLabel = appState.location.data?.address || appState.location.data?.city || t("product.locationMissing");
  const locationHint = appState.location.data?.city ? t("product.locationCity", { city: appState.location.data.city }) : t("product.locationHint");

  // Прокрутка вверх при открытии товара
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [id]);

  // SEO image
  const primaryImage = useMemo(() => {
    if (!product) return undefined;
    const variantMedia = selectedVariant?.variant_media || [];
    if (variantMedia.length > 0) {
      const imageMedia = variantMedia.filter(
        (m: any) =>
          String(m?.type || "").toLowerCase() !== "video" &&
          !String(m?.file || "").toLowerCase().endsWith(".mp4")
      );
      const mainMedia = imageMedia.find((m: any) => m.is_main) || imageMedia[0] || variantMedia[0];
      return mainMedia?.file ? getProductImageUrl(mainMedia.file) : undefined;
    }
    return product.main_image ? getProductImageUrl(product.main_image) : undefined;
  }, [selectedVariant, product]);

  useSEO(
    useMemo(() => {
      const siteName = t("common.appName") || "OZAR";
      const title = product ? `${product.product_name} - ${siteName}` : siteName;
      const rawDesc = product?.product_description?.trim() || product?.product_name || t("home.seoDescription");
      const desc = rawDesc ? rawDesc.slice(0, 200) : undefined;
      const origin = typeof window !== "undefined" ? window.location.origin : "";
      const pathname = typeof window !== "undefined" ? window.location.pathname : "";
      const canonicalUrl = origin && pathname ? `${origin}${pathname}` : origin;
      const url = canonicalUrl || "";
      const price = (selectedVariant?.price ?? product?.price ?? 0) || 0;
      const inStock = selectedVariant ? selectedVariant.stock > 0 : product ? product.stock > 0 : false;

      const jsonLd: any =
        product
          ? {
              "@context": "https://schema.org",
              "@type": "Product",
              name: product.product_name,
              description: product.product_description || "",
              image: primaryImage ? [primaryImage] : undefined,
              sku: selectedVariant?.sku || product.variant_sku,
              offers: {
                "@type": "Offer",
                priceCurrency: "UZS",
                price: String(price || 0),
                availability: inStock ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
                url,
              },
            }
          : undefined;

      return {
        title,
        description: desc,
        canonical: canonicalUrl || undefined,
        openGraph: {
          "og:type": "product",
          "og:title": title,
          "og:description": desc,
          "og:url": canonicalUrl || undefined,
          ...(primaryImage ? { "og:image": primaryImage } : {}),
        },
        twitter: {
          "twitter:card": primaryImage ? "summary_large_image" : "summary",
          "twitter:title": title,
          "twitter:description": desc,
          ...(primaryImage ? { "twitter:image": primaryImage } : {}),
        },
        jsonLd,
      };
    }, [product, selectedVariant, primaryImage])
  );

  // FIX (п.3): безопасный toCityCode без ломания case у id
  const toCityCode = (value?: string): string => {
    if (!value) return "";
    const v = value.trim();
    const byIdExact = uzbekistanLocations.find((l) => l.id === v);
    if (byIdExact) return byIdExact.id;

    const vLower = v.toLowerCase();
    const byIdLower = uzbekistanLocations.find((l) => String(l.id).toLowerCase() === vLower);
    if (byIdLower) return byIdLower.id;

    const byName = uzbekistanLocations.find((l) => l.name.toLowerCase() === vLower);
    return byName?.id || "";
  };

  const getRegionForCityOrRegion = (code?: string): string => {
    if (!code) return "";
    const loc = uzbekistanLocations.find((l) => l.id === code) || uzbekistanLocations.find((l) => String(l.id).toLowerCase() === String(code).toLowerCase());
    if (!loc) return "";
    if (loc.type === "city") return loc.parentId || "";
    if (loc.type === "region") return loc.id;
    return "";
  };

  useEffect(() => {
    let ignore = false;
    logger.debug("Product page useEffect", { id, hasProductFromState: !!productFromState });

    if (id) {
      setLoading(true);
      setError(null);
      setFetchedProduct(null);
      setSelectedVariant(null);

      fetchAllProductVariants(id)
        .then((p) => {
          logger.debug("Product loaded", { productId: p?.product_id });

          if (!ignore && p) {
            // FIX (п.1): сравнение ID строго через String(...)
            if (String(p.product_id) !== String(id)) {
              const err = new Error("Product ID mismatch");
              logger.errorWithContext(err, {
                context: "Product useEffect",
                requested: String(id),
                received: String(p.product_id),
              });
              setError(t("product.errors.loadTitle"));
              setLoading(false);
              return;
            }

            setFetchedProduct(p);

            if (p.variants && p.variants.length > 0) {
              const preferredId = preferredVariantId?.trim();
              const preferredVariant = preferredId
                ? p.variants.find((v) => String(v.id) === preferredId || String((v as any).variant_id) === preferredId || String(v.sku) === preferredId)
                : null;

              const availableVariant =
                p.variants.find((v) => v.stock > 0 && v.price !== null && v.price !== undefined) ||
                p.variants.find((v) => v.price !== null && v.price !== undefined) ||
                p.variants[0];

              const variantToSelect = preferredVariant || availableVariant;
              setSelectedVariant(variantToSelect);
              setLightboxIndex(0);
            }
          } else if (!ignore && !p) {
            setError(t("product.errors.notFoundTitle"));
          }
        })
        .catch((e) => {
          const appError = handleApiError(e);
          logger.errorWithContext(appError, { context: "Product useEffect" });
          if (!ignore) {
            const errorMessage = getUserFriendlyMessage(appError) || ERROR_MESSAGES.UNKNOWN;
            setError(errorMessage);
          }
        })
        .finally(() => {
          if (!ignore) setLoading(false);
        });
    }

    return () => {
      ignore = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // Рекомендации по категории
  useEffect(() => {
    if (!categoryId) return;
    let ignore = false;
    setRecommendedLoading(true);
    setRecommendedError(null);
    shopAPI
      // Берём больше кандидатов, чтобы выбрать лучшие и убрать дубли
      .getProductsByCategory(categoryId, { offset: 0, limit: PRODUCT_RELATED_LIMIT })
      .then((res) => {
        if (ignore) return;
        const results = (res as any)?.data?.results ?? (res as any)?.data ?? [];
        const raw: any[] = Array.isArray(results) ? results : [];

        // Убираем текущий товар из кандидатов (по product_id или id)
        const filteredRaw = raw.filter((p: any) => {
          const pid = String(p?.product_id || p?.id || "");
          return pid && pid !== String(product?.product_id || "");
        });

        // Берём по одному "лучшему" варианту на product_id (в наличии/дешевле)
        const { primaryProducts } = splitProductsIntoPrimaryAndVariants(filteredRaw);

        // Лёгкая "рандомизация" внутри группы, чтобы блок не был одинаковым всегда
        const shuffled = primaryProducts
          .slice()
          .sort((a, b) => {
            const aIn = (a.stock ?? 0) > 0;
            const bIn = (b.stock ?? 0) > 0;
            if (aIn && !bIn) return -1;
            if (!aIn && bIn) return 1;
            return Math.random() - 0.5;
          })
          .slice(0, 12);

        setRecommended(shuffled);
      })
      .catch((err: any) => {
        if (ignore) return;
        setRecommendedError(err?.message || "Failed to load recommendations");
      })
      .finally(() => {
        if (!ignore) setRecommendedLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, [categoryId, product?.product_id]);

  // Галерея: поддержка изображений + видео (mp4) из variant_media
  const galleryMedia = useMemo(() => {
    if (!product) return [] as Array<{ url: string; kind: "image" | "video" }>;

    const isVideo = (m: any) => {
      const t = String(m?.type || "").toLowerCase();
      const f = String(m?.file || "").toLowerCase();
      return t === "video" || f.endsWith(".mp4") || f.endsWith(".webm") || f.endsWith(".mov");
    };

    const variantMedia = selectedVariant?.variant_media || [];
    if (variantMedia.length > 0) {
      const mapped = (variantMedia || [])
        .map((m: any) => {
          const file = m?.file;
          if (!file) return null;
          const kind: "image" | "video" = isVideo(m) ? "video" : "image";
          return { url: getProductImageUrl(String(file)), kind };
        })
        .filter(Boolean) as Array<{ url: string; kind: "image" | "video" }>;

      const seen = new Set<string>();
      return mapped.filter((it) => {
        const key = `${it.kind}:${it.url}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
    }

    const main = product.main_image ? getProductImageUrl(product.main_image) : null;
    return main ? [{ url: main, kind: "image" as const }] : [];
  }, [product, selectedVariant?.variant_media]);

  // thumb scroll helpers removed (no indicators/arrows)

  useEffect(() => {
    const target = document.getElementById(`thumb-${lightboxIndex}`);
    if (target && thumbsScrollRef.current) {
      target.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }
  }, [lightboxIndex, galleryMedia.length]);

  useEffect(() => {
    if (selectedVariant && galleryMedia.length > 0) {
      if (lightboxIndex >= galleryMedia.length) setLightboxIndex(0);
    }
  }, [galleryMedia.length, selectedVariant?.id, lightboxIndex]);

  const selectedAttributesList = useMemo(() => {
    if (!product || !selectedVariant) return [];
    return (selectedVariant.attribute_values || [])
      .map((attrValue) => {
        const attrId = attrValue.attribute_id || (attrValue as any).attribute_name;
        const attribute = product.attributes.find(
          (attr) => attr.id === attrId || attr.name === attrId || attr.name === (attrValue as any).attribute_name
        );
        const label = attribute?.name || attrValue.attribute_name || "";
        const value = attrValue.value;
        if (!label || !value) return null;
        return { name: label, value };
      })
      .filter((entry): entry is { name: string; value: string } => Boolean(entry));
  }, [product, selectedVariant]);

  // Недавно просмотренные
  useEffect(() => {
    try {
      const key = "recently_viewed";
      const list: ProductType[] = storage.get(key) || [];
      setRecentlyViewed(list.filter((p) => p.product_id !== (product?.product_id || "")).slice(0, 8));
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!product) return;
    try {
      const key = "recently_viewed";
      const list: ProductType[] = storage.get(key) || [];
      const item: ProductType = {
        product_id: product.product_id,
        product_name: product.product_name,
        product_description: product.product_description,
        category: product.category,
        refferal_price: product.refferal_price,
        main_image: product.main_image,
        variant_id: selectedVariant?.id || product.variant_id,
        variant_sku: selectedVariant?.sku || product.variant_sku,
        price: selectedVariant?.price ?? product.price,
        stock: selectedVariant?.stock ?? product.stock,
        variant_attributes: selectedVariant?.attribute_values || product.variant_attributes || [],
      };
      const deduped = [item, ...list.filter((p) => p.product_id !== item.product_id)].slice(0, 12);
      storage.set(key, deduped);
      setRecentlyViewed(deduped.slice(0, 8));
    } catch {}
  }, [product, selectedVariant]);

  useEffect(() => {
    if (!isQuickOrderOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isQuickOrderOpen]);

  // Лайтбокс
  const lightboxHistoryStateRef = useRef<boolean>(false);
  const isClosingFromPopStateRef = useRef<boolean>(false);
  
  const openLightbox = (index: number) => {
    setLightboxIndex(index);
    setLightboxZoom(1);
    setLightboxOpen(true);
    document.body.style.overflow = "hidden";
    
    // Добавляем запись в историю для обработки кнопки "назад"
    if (!lightboxHistoryStateRef.current) {
      window.history.pushState({ lightbox: true }, "");
      lightboxHistoryStateRef.current = true;
    }
  };
  
  const closeLightbox = () => {
    // Если закрываем через popstate, не трогаем историю
    if (isClosingFromPopStateRef.current) {
      isClosingFromPopStateRef.current = false;
    } else if (lightboxHistoryStateRef.current) {
      // Если закрываем через клик/Escape, удаляем запись из истории
      window.history.replaceState(null, "", window.location.href);
      lightboxHistoryStateRef.current = false;
    }
    
    setLightboxOpen(false);
    setLightboxZoom(1);
    setLightboxPan({ x: 0, y: 0 });
    document.body.style.overflow = "";
  };
  const nextImage = () => setLightboxIndex((prev) => (prev + 1) % Math.max(galleryMedia.length, 1));
  const prevImage = () => setLightboxIndex((prev) => (prev - 1 + Math.max(galleryMedia.length, 1)) % Math.max(galleryMedia.length, 1));
  const zoomIn = () => setLightboxZoom((z) => Math.min(z + 0.25, 3));
  const zoomOut = () => setLightboxZoom((z) => Math.max(z - 0.25, 0.5));
  const onLightboxWheel: React.WheelEventHandler<HTMLDivElement> = (e) => {
    if (e.deltaY < 0) zoomIn();
    else zoomOut();
  };

  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);
  const pinchStartDist = useRef<number | null>(null);
  const pinchStartZoom = useRef<number>(1);
  const panStart = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const [lightboxPan, setLightboxPan] = useState({ x: 0, y: 0 });
  const lastTapRef = useRef<number>(0);

  const distance = (touches: TouchList | React.TouchList) => {
    if (!touches || touches.length < 2) return null;
    const getTouch = (idx: number): Touch | null => {
      const anyTouches = touches as any;
      if (typeof anyTouches.item === "function") return anyTouches.item(idx) || null;
      return (anyTouches[idx] as Touch) || null;
    };
    const t0 = getTouch(0);
    const t1 = getTouch(1);
    if (!t0 || !t1) return null;
    const dx = t0.clientX - t1.clientX;
    const dy = t0.clientY - t1.clientY;
    return Math.hypot(dx, dy);
  };

  const handleTouchStart: React.TouchEventHandler<HTMLDivElement> = (e) => {
    if (e.touches.length === 1) {
      touchStartX.current = e.touches[0]?.clientX ?? null;
      touchStartY.current = e.touches[0]?.clientY ?? null;
      pinchStartDist.current = null;
      panStart.current = { x: lightboxPan.x, y: lightboxPan.y };
    } else if (e.touches.length === 2) {
      pinchStartDist.current = distance(e.touches);
      pinchStartZoom.current = lightboxZoom;
      touchStartX.current = null;
      touchStartY.current = null;
    }
  };

  const handleTouchMove: React.TouchEventHandler<HTMLDivElement> = (e) => {
    if (e.touches.length === 2) {
      const dist = distance(e.touches);
      if (dist && pinchStartDist.current) {
        const ratio = dist / pinchStartDist.current;
        const nextZoom = Math.min(3, Math.max(0.6, pinchStartZoom.current * ratio));
        setLightboxZoom(nextZoom);
        if (nextZoom <= 1) {
          setLightboxPan({ x: 0, y: 0 });
        }
      }
    } else if (e.touches.length === 1 && lightboxZoom > 1 && touchStartX.current !== null && touchStartY.current !== null) {
      const cx = e.touches[0]?.clientX ?? 0;
      const cy = e.touches[0]?.clientY ?? 0;
      const dx = cx - touchStartX.current;
      const dy = cy - touchStartY.current;
      setLightboxPan({ x: panStart.current.x + dx, y: panStart.current.y + dy });
    }
  };

  const handleTouchEnd: React.TouchEventHandler<HTMLDivElement> = (e) => {
    if (touchStartX.current !== null && lightboxZoom <= 1) {
      const dx = (e.changedTouches[0]?.clientX ?? 0) - touchStartX.current;
      touchStartX.current = null;
      touchStartY.current = null;
      if (Math.abs(dx) > 40) {
        if (dx > 0) prevImage();
        else nextImage();
      }
    } else {
      touchStartX.current = null;
      touchStartY.current = null;
    }
  };

  // Обработка кнопки "назад" браузера для закрытия lightbox
  useEffect(() => {
    const handlePopState = () => {
      // Если lightbox открыт и это наша запись в истории, закрываем lightbox
      if (lightboxOpen && lightboxHistoryStateRef.current) {
        isClosingFromPopStateRef.current = true;
        lightboxHistoryStateRef.current = false;
        setLightboxOpen(false);
        setLightboxZoom(1);
        setLightboxPan({ x: 0, y: 0 });
        document.body.style.overflow = "";
      }
    };

    window.addEventListener("popstate", handlePopState);
    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, [lightboxOpen]);

  // Очистка истории при размонтировании компонента
  useEffect(() => {
    return () => {
      // Если компонент размонтируется с открытым lightbox, очищаем историю
      if (lightboxHistoryStateRef.current) {
        try {
          window.history.replaceState(null, "", window.location.href);
        } catch (e) {
          // Игнорируем ошибки при очистке
        }
        lightboxHistoryStateRef.current = false;
        document.body.style.overflow = "";
      }
    };
  }, []);

  useEffect(() => {
    if (!lightboxOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeLightbox();
      if (e.key === "ArrowRight") nextImage();
      if (e.key === "ArrowLeft") prevImage();
      if (e.key === "+") zoomIn();
      if (e.key === "-") zoomOut();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [lightboxOpen, galleryMedia.length]);

  const canBuy =
    selectedVariant ? selectedVariant.stock > 0 && selectedVariant.price !== null : product?.price !== null && (product?.stock ?? 0) > 0;

  // FIX (п.4): поиск товара в корзине — учитываем разные ключи (productId/id)
  const currentCartItemId = String(selectedVariant?.id || product?.variant_id || "");
  const cartItem = useMemo(() => {
    return appState.cart.find((item: any) => String(item.productId ?? item.id ?? "") === currentCartItemId);
  }, [appState.cart, currentCartItemId]);
  const cartQuantity = cartItem?.quantity || 0;
  const maxStock = selectedVariant?.stock ?? product?.stock ?? 0;

  const handleIncreaseQuantity = () => {
    if (!currentCartItemId || cartQuantity >= maxStock) return;
    updateCartItem(currentCartItemId, cartQuantity + 1);
  };

  const handleDecreaseQuantity = () => {
    if (!currentCartItemId) return;
    if (cartQuantity <= 1) removeFromCart(currentCartItemId);
    else updateCartItem(currentCartItemId, cartQuantity - 1);
  };

  // Добавление в корзину
  const handleAddToCart = () => {
    if (!product || !canBuy) return;
    const cartImage =
      primaryImage ||
      galleryMedia.find((m) => m.kind === "image")?.url ||
      (product.main_image ? getProductImageUrl(product.main_image) : undefined);
    const cartPrice = currentPrice ?? product.price ?? 0;
    const stockAmount = selectedVariant?.stock ?? product.stock ?? 0;

    const item = {
      id: selectedVariant?.id || product.variant_id,
      name: product.product_name,
      refferal_price: product.refferal_price || 0,
      base_price: cartPrice,
      original_price: hasDiscount ? basePrice : null,
      referral_code: referralCode || undefined,
      image: cartImage,
      attributes: selectedAttributesList.length ? selectedAttributesList : undefined,
      stock: stockAmount,
    };
    addToCart(item, 1);
  };

  const openQuickOrder = () => {
    if (!canBuy) return;
    setQuickOrderError(null);
    setIsQuickOrderOpen(true);
  };

  const closeQuickOrder = () => setIsQuickOrderOpen(false);

  // FIX (п.5): корректный order_region в QuickOrderSheet submit (не меняя архитектуру)
  const handleQuickOrderSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!product) return;

    if (!canBuy) {
      setQuickOrderError(t("product.quickOrder.errors.unavailable"));
      return;
    }
    if (!name.trim()) {
      setQuickOrderError(t("product.quickOrder.errors.nameRequired"));
      return;
    }
    if (!phone || phone.trim().length < 8) {
      setQuickOrderError(t("product.quickOrder.errors.phoneInvalid"));
      return;
    }
    if (!agreeTerms) {
      setQuickOrderError(t("product.quickOrder.errors.consentRequired"));
      return;
    }

    try {
      setQuickOrderLoading(true);
      setQuickOrderError(null);

      const variantId = selectedVariant?.id || product.variant_id;
      const citySource = appState.location.data?.city || "tashkent";
      const cityCode = toCityCode(citySource) || citySource;

      const payload = {
        items: [{ variant_id: variantId, quantity: 1, referral_code: referralCode || undefined }],
        guest_user_number: phone,
        full_name: name.trim(),
        city: cityCode,
        order_region: getRegionForCityOrRegion(cityCode), // FIX
        order_comment: "",
      } as any;

      await shopAPI.guestOrder(payload);

      const variantTitle =
        selectedVariant?.attribute_values
          ?.map((av: any) => av?.value || av?.attribute_value)
          ?.filter(Boolean)
          ?.join(", ") || "";

      // Сразу переводим на страницу подтверждения, чтобы пользователь не оставался на форме
      navigate("/order/requested", {
        state: {
          productName: product.product_name,
          variantTitle,
          phone,
          fullName: name.trim(),
        },
        replace: true,
      });

      setName("");
      setPhone("");
      setIsQuickOrderOpen(false);
    } catch (err) {
      logger.errorWithContext(err, { context: "quickOrder" });
      setQuickOrderError(t("product.quickOrder.errors.generic"));
    } finally {
      setQuickOrderLoading(false);
    }
  };

  const getAttributeValue = (variant: ProductDetail["variants"][0], attributeId: string) => {
    const attributeValue = variant.attribute_values.find((av) => {
      const attrId = av.attribute_id || (av as any).attribute_name;
      const attrName = (av as any).attribute_name || av.attribute_id;
      return String(attrId) === String(attributeId) || String(attrName) === String(attributeId);
    });
    return attributeValue?.value || "";
  };

  const getCurrentAttributeValues = (): Record<string, string> => {
    if (!selectedVariant) return {};
    const values: Record<string, string> = {};
    product?.attributes.forEach((attribute) => {
      const value = getAttributeValue(selectedVariant, attribute.id);
      if (value) values[attribute.id] = value;
    });
    return values;
  };

  const handleAttributeSelect = (attributeId: string, value: string) => {
    if (!product || !selectedVariant) return;

    const currentAttributes = getCurrentAttributeValues();
    const newAttributes = { ...currentAttributes, [attributeId]: value };

    const matchingVariant = product.variants.find((variant) =>
      Object.entries(newAttributes).every(([attrId, attrValue]) => getAttributeValue(variant, attrId) === attrValue)
    );

    if (matchingVariant) {
      setSelectedVariant(matchingVariant);
      setLightboxIndex(0);
      return;
    }

    const variantWithSameAttr =
      product.variants.find((variant) => getAttributeValue(variant, attributeId) === value && variant.stock > 0 && variant.price !== null) ||
      product.variants.find((variant) => getAttributeValue(variant, attributeId) === value);

    if (variantWithSameAttr) {
      setSelectedVariant(variantWithSameAttr);
      setLightboxIndex(0);
    }
  };

  // IMPORTANT: hooks must be above early returns
  const getVariantThumbUrl = useCallback((variant: ProductDetail["variants"][0] | undefined | null): string | null => {
    if (!variant) return null;
    const media = (variant as any)?.variant_media || [];
    if (!Array.isArray(media) || media.length === 0) return null;
    const images = media.filter(
      (m: any) =>
        String(m?.type || "").toLowerCase() !== "video" &&
        !String(m?.file || "").toLowerCase().endsWith(".mp4")
    );
    const pick = images.find((m: any) => m?.is_main) || images[0];
    return pick?.file ? getProductImageUrl(String(pick.file)) : null;
  }, []);

  const safeDescriptionHtml = useMemo(() => {
    if (!product) return "";
    const lang = String(i18n.language || "ru").split("-")[0].toLowerCase();
    const rawCandidate =
      (lang === "uz" ? (product as any)?.description_uz : (product as any)?.description_ru) ||
      (product as any)?.description_ru ||
      (product as any)?.description_uz ||
      "";
    const raw = String(rawCandidate || "");

    const looksLikeHtml = /<\/?[a-z][\s\S]*>/i.test(raw);
    if (!looksLikeHtml) {
      const escaped = raw.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
      return escaped.replace(/\r?\n/g, "<br/>");
    }

    return raw
      .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "")
      .replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, "")
      .replace(/<iframe[\s\S]*?>[\s\S]*?<\/iframe>/gi, "")
      .replace(/\son\w+="[^"]*"/gi, "")
      .replace(/\son\w+='[^']*'/gi, "")
      .replace(/(href|src)\s*=\s*(['"])\s*javascript:[\s\S]*?\2/gi, "$1=$2#$2");
  }, [i18n.language, product]);

  // loading
  if (loading) return <ProductPageSkeleton />;

  // error
  if (error) {
    return (
      <div className="min-h-[70vh] bg-slate-50 flex items-center justify-center px-4">
        <div className="w-full max-w-md rounded-3xl bg-white border border-slate-200 shadow-sm p-6 text-center">
          <div className="text-3xl mb-2">⚠️</div>
          <h2 className="text-lg font-semibold text-slate-900">{t("product.errors.loadTitle")}</h2>
          <p className="mt-2 text-sm text-slate-600">{error}</p>
          <button
            className="mt-4 h-11 w-full rounded-2xl text-white font-semibold transition hover:brightness-110"
            style={{ background: "linear-gradient(92.41deg, #003d32, #04734b)" }}
            onClick={() => window.location.reload()}
          >
            {t("product.errors.loadAction")}
          </button>
        </div>
      </div>
    );
  }

  // not found
  if (!product) {
    return (
      <div className="min-h-[70vh] bg-slate-50 flex items-center justify-center px-4">
        <div className="w-full max-w-md rounded-3xl bg-white border border-slate-200 shadow-sm p-6 text-center">
          <div className="text-3xl mb-2">🔍</div>
          <h2 className="text-lg font-semibold text-slate-900">{t("product.errors.notFoundTitle")}</h2>
          <p className="mt-2 text-sm text-slate-600">{t("product.errors.notFoundMessage", { id: id ? `#${id}` : "" })}</p>
          <button
            className="mt-4 h-11 w-full rounded-2xl border border-slate-200 bg-white text-slate-900 font-semibold transition hover:bg-slate-50"
            onClick={() => window.history.back()}
          >
            {t("product.errors.back")}
          </button>
        </div>
      </div>
    );
  }

  const currentPrice = selectedVariant?.price ?? product.price ?? null;
  const basePrice = selectedVariant?.base_price ?? product.price ?? null;

  const hasDiscount =
    currentPrice !== null && basePrice !== null && typeof currentPrice === "number" && typeof basePrice === "number" && basePrice > currentPrice;

  const discountPercent = hasDiscount && basePrice ? Math.round(((basePrice - currentPrice) / basePrice) * 100) : null;

  const sku = selectedVariant?.sku || product.variant_sku || product.product_id;
  const availableUnits = selectedVariant ? selectedVariant.stock : product.stock;
  const isAvailable = (availableUnits ?? 0) > 0;

  const attributeButtonBase =
    "px-3 py-2 rounded-xl border text-sm font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed";
  const attributeButtonSelected = "border-emerald-600 bg-emerald-50 text-emerald-800";
  const attributeButtonDefault = "border-slate-200 bg-white text-slate-800 hover:bg-slate-50";

  return (
    <div ref={productRef} className="min-h-screen bg-slate-50">
      <div className="mx-auto w-full max-w-[1240px] px-3 sm:px-4 md:px-6 lg:px-8 py-4 md:py-6 lg:py-8">
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_360px] gap-4 md:gap-6">
          {/* Gallery */}
          <div className="flex flex-col gap-3 md:gap-4 md:p-4">
            <div className="w-full">
              {(() => {
                const idx = Math.min(lightboxIndex, Math.max(galleryMedia.length - 1, 0));
                const current = galleryMedia[idx];
                const fallback = getProductImageUrl(product.main_image);
                if (current?.kind === "video") {
                  return (
                    <div className="w-full h-[490px] sm:h-[530px] md:h-[590px] lg:h-[690px] xl:h-[790px] rounded-3xl overflow-hidden bg-black flex items-center justify-center">
                      <video
                        key={current.url}
                        src={current.url}
                        controls
                        muted
                        autoPlay
                        loop
                        playsInline
                        preload="metadata"
                        className="w-full h-full object-contain bg-black"
                        onClick={() => openLightbox(idx)}
                      />
                    </div>
                  );
                }
                return (
                  <div className="w-full h-[490px] sm:h-[530px] md:h-[590px] lg:h-[690px] xl:h-[790px] rounded-3xl overflow-hidden bg-white flex items-center justify-center">
                    <img
                      src={current?.url || fallback}
                      alt={product.product_name}
                      className="w-full h-full object-contain cursor-zoom-in"
                      onClick={() => openLightbox(idx)}
                    />
                  </div>
                );
              })()}
            </div>

            {galleryMedia.length > 1 && (
              <div className="w-full">
                <div
                  className="flex w-full overflow-x-auto overflow-y-hidden scroll-smooth pb-1 pr-1 touch-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                  ref={thumbsScrollRef}
                >
                  {galleryMedia.map((m, i) => (
                    <button
                      id={`thumb-${i}`}
                      key={i}
                      className={`shrink-0 w-[96px] sm:w-[104px] md:w-[116px] lg:w-[128px] xl:w-[140px] rounded-[16px] border-2 bg-white shadow-sm grid place-items-center transition relative ${
                        i === lightboxIndex ? "border-emerald-600 shadow-md" : "border-slate-200 hover:-translate-y-0.5 hover:shadow-md"
                      }`}
                      type="button"
                      aria-label={t("product.lightbox.preview", { index: i + 1 })}
                      onClick={() => setLightboxIndex(i)}
                    >
                      {m.kind === "video" ? (
                        <div className="relative w-full">
                          <video
                            src={m.url}
                            muted
                            playsInline
                            preload="metadata"
                            className="w-full h-auto object-contain rounded-[12px] bg-black"
                          />
                          <div className="absolute inset-0 grid place-items-center">
                            <div className="h-7 w-7 rounded-full bg-black/55 text-white grid place-items-center text-sm">
                              ▶
                            </div>
                          </div>
                        </div>
                      ) : (
                        <img
                          src={m.url}
                          alt={`${product.product_name} - ${t("product.lightbox.preview", { index: i + 1 })}`}
                          className="w-full h-auto object-contain rounded-[12px]"
                        />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Info + Aside */}
          <section className="space-y-4">
            <div className="rounded-3xl bg-white border border-slate-200 shadow-sm p-4 md:p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-2">
                  <h1 className="text-xl md:text-2xl font-bold text-slate-900">{product.product_name}</h1>
                  <div className="flex flex-wrap items-center gap-3 text-sm">
                    <span
                      className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${
                        isAvailable ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-600"
                      }`}
                    >
                      {isAvailable ? t("common.status.inStock") : t("common.status.outOfStock")}
                    </span>
                    {sku && <span className="text-xs font-medium text-slate-500">{t("product.quickOrder.skuLabel")}: {sku}</span>}
                  </div>
                </div>
              </div>

              <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <div className="flex items-center gap-3">
                    <p className="text-[28px] font-semibold leading-tight text-[#04734b] sm:text-[32px]">
                      {currentPrice ? formatPrice(currentPrice) : t("product.priceMissing")}
                    </p>
                    {hasDiscount && discountPercent && (
                      <span className="inline-flex items-center rounded-full bg-[#e6f4ef] px-3 py-1 text-xs font-semibold text-[#04734b]">
                        -{discountPercent}%
                      </span>
                    )}
                  </div>
                  {hasDiscount && basePrice ? <p className="text-sm font-medium text-slate-400 line-through">{formatPrice(basePrice)}</p> : null}
                  {currentPrice ? (
                    <p className="text-xs font-medium text-slate-500">
                      {t("product.deliveryUzbekistan")}:{" "}
                      <span className="text-[#04734b] font-semibold">
                        {t("product.deliveryFlatRate", { price: formatPrice(30000), currency: t("common.currency") })}
                      </span>
                    </p>
                  ) : null}
                </div>
              </div>

              {/* Variants */}
              {(() => {
                const hasVariants = product.variants && product.variants.length > 0;
                const hasAttributes = product.attributes && product.attributes.length > 0;
                const hasValidAttributes =
                  hasAttributes &&
                  product.attributes.some((attr) =>
                    product.variants.some((variant) => {
                      const value = getAttributeValue(variant, attr.id);
                      return value && value.trim() !== "";
                    })
                  );

                if (!hasVariants || !hasValidAttributes) return null;

                return (
                  <div className="mt-5 space-y-4">
                    {product.attributes.map((attribute) => {
                      const hasValues = product.variants.some((variant) => {
                        const value = getAttributeValue(variant, attribute.id);
                        return value && value.trim() !== "";
                      });
                      if (!hasValues) return null;

                      const uniqueValues = new Map<string, ProductDetail["variants"][0] | undefined>();
                      product.variants.forEach((variant) => {
                        const value = getAttributeValue(variant, attribute.id);
                        if (value && value.trim() !== "" && !uniqueValues.has(value)) {
                          const availableVariant =
                            product.variants.find((v) => getAttributeValue(v, attribute.id) === value && v.stock > 0 && v.price !== null) ||
                            product.variants.find((v) => getAttributeValue(v, attribute.id) === value);
                          uniqueValues.set(value, availableVariant);
                        }
                      });

                      return (
                        <div key={attribute.id} className="space-y-2">
                          <div className="flex items-center justify-between gap-3">
                            <h4 className="text-sm font-bold text-slate-900">
                              {attribute.name} {attribute.unit && `(${attribute.unit})`}
                              {selectedVariant && getAttributeValue(selectedVariant, attribute.id) ? (
                                <span className="ml-1 inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700">
                                  {getAttributeValue(selectedVariant, attribute.id)}
                                </span>
                              ) : null}
                            </h4>
                          </div>
                          <div className="flex flex-wrap gap-2 mb-5">
                            {Array.from(uniqueValues.entries()).map(([value, v]) => {
                              const isSelected = selectedVariant && getAttributeValue(selectedVariant, attribute.id) === value;
                              const isDisabled = !v || v.stock === 0 || v.price === null;
                              const thumb = getVariantThumbUrl(v);
                              return (
                                <button
                                  key={`${attribute.id}-${value}`}
                                  type="button"
                                  disabled={isDisabled}
                                  onClick={() => !isDisabled && handleAttributeSelect(attribute.id, value)}
                                  title={value}
                                  aria-label={value}
                                  className={[
                                    thumb ? "h-20 w-20 p-1.5" : attributeButtonBase,
                                    isSelected ? attributeButtonSelected : attributeButtonDefault,
                                    isDisabled ? "opacity-50" : "",
                                    thumb ? "grid place-items-center" : "flex items-center gap-2",
                                  ].join(" ")}
                                >
                                  {thumb ? (
                                    <img
                                      src={thumb}
                                      alt=""
                                      className="h-full w-full rounded-lg border border-slate-200 bg-white object-contain p-0.5"
                                      loading="lazy"
                                    />
                                  ) : (
                                    <span className="truncate max-w-[160px]">{value}</span>
                                  )}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>

            {/* Aside actions + Quick order (desktop) */}
            <aside className="rounded-3xl bg-white border border-slate-200 shadow-sm p-4 md:p-5 space-y-4">
              {/* <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={openQuickOrder}
                  disabled={!canBuy}
                  className="flex-1 h-12 rounded-[18px] text-sm font-semibold text-white shadow-[0_12px_24px_rgba(0,160,120,0.35)] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
                  style={{ background: "linear-gradient(92.41deg, #003d32, #04734b)" }}
                >
                  {t("product.buttons.buyOneClick")}
                </button>

                {cartQuantity > 0 ? (
                  <div className="flex-1 h-12 rounded-[18px] border border-[#d5ebe3] bg-white flex items-center justify-between px-2">
                    <button
                      type="button"
                      onClick={handleDecreaseQuantity}
                      className="h-9 w-9 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-lg font-semibold text-[#04734b] transition"
                    >
                      −
                    </button>
                    <span className="text-base font-bold text-[#04734b] min-w-[40px] text-center">{cartQuantity}</span>
                    <button
                      type="button"
                      onClick={handleIncreaseQuantity}
                      disabled={cartQuantity >= maxStock}
                      className={`h-9 w-9 rounded-xl border border-slate-200 bg-white text-lg font-semibold text-[#04734b] transition ${
                        cartQuantity >= maxStock ? "opacity-50 cursor-not-allowed" : "hover:bg-slate-50"
                      }`}
                    >
                      +
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={handleAddToCart}
                    disabled={!canBuy}
                    className="flex-1 h-12 rounded-[18px] border border-[#d5ebe3] bg-white text-base font-semibold text-[#04734b] shadow-[inset_0_2px_6px_rgba(4,115,75,0.08)] transition hover:border-[#04734b] hover:text-[#003d32] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {t("product.buttons.addToCart")}
                  </button>
                )}
              </div> */}

              <p className="text-center text-xs font-medium text-slate-500">{t("product.paymentInfo")}</p>

              {/* Quick order form (desktop) */}
              <div className="rounded-[22px] border border-slate-200 bg-white shadow-[0_16px_30px_rgba(15,23,42,0.08)] px-5 py-4 space-y-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">{t("product.quickOrder.nameLabel")}</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={t("product.quickOrder.namePlaceholder")}
                    className="w-full h-11 px-4 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#04734b] focus:border-transparent transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">{t("product.quickOrder.phoneLabel")}</label>
                  <PhoneInput
                    value={phone}
                    onChange={setPhone}
                    className="w-full h-11 px-4 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#04734b] focus:border-transparent transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">Область</label>
                  <select
                    value={quickOrderRegion}
                    onChange={(e) => {
                      const selectedValue = e.target.value;
                      setQuickOrderRegion(selectedValue);
                    }}
                    className="w-full h-11 px-4 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#04734b] focus:border-transparent transition"
                  >
                    <option value="">Выберите область</option>
                    <option value="tashkent">Toshkent</option>
                    <option value="tashkent_region">Toshkent viloyati</option>
                    <option value="samarkand">Samarqand</option>
                    <option value="bukhara">Buxoro</option>
                    <option value="andijan">Andijon</option>
                    <option value="fergana">Farg'ona</option>
                    <option value="namangan">Namangan</option>
                    <option value="navoiy">Navoiy</option>
                    <option value="kashkadarya">Qashqadaryo</option>
                    <option value="surkhandarya">Surxondaryo</option>
                    <option value="sirdarya">Sirdaryo</option>
                    <option value="jizzakh">Jizzax</option>
                    <option value="kokand">Qo'qon</option>
                    <option value="khorezm">Xorazm</option>
                    <option value="karakalpakstan">Qoraqalpog'iston Respublikasi</option>
                  </select>
                </div>

                {/* FIX (п.7): agreeTerms тут тоже */}
                <label className="flex items-start gap-3 text-sm text-slate-600">
                  <input
                    type="checkbox"
                    checked={agreeTerms}
                    onChange={(e) => setAgreeTerms(e.target.checked)}
                    className="mt-1 h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                  />
                  <span>
                    {t("product.quickOrder.consent")}{" "}
                    <a href="/terms" className="text-emerald-700 hover:underline">
                      {t("product.quickOrder.terms")}
                    </a>
                  </span>
                </label>

                <button
                  type="button"
                  onClick={async () => {
                    if (!fetchedProduct) return;

                    if (!canBuy) {
                      setQuickOrderError(t("product.quickOrder.errors.unavailable"));
                      setTimeout(() => setQuickOrderError(null), 3000);
                      return;
                    }
                    if (!name.trim()) {
                      setQuickOrderError(t("product.quickOrder.errors.nameRequired"));
                      setTimeout(() => setQuickOrderError(null), 3000);
                      return;
                    }
                    if (!phone || phone.trim().length < 8) {
                      setQuickOrderError(t("product.quickOrder.errors.phoneInvalid"));
                      setTimeout(() => setQuickOrderError(null), 3000);
                      return;
                    }
                    if (!agreeTerms) {
                      setQuickOrderError(t("product.quickOrder.errors.consentRequired"));
                      setTimeout(() => setQuickOrderError(null), 3000);
                      return;
                    }

                    if (!quickOrderRegion) {
                      setQuickOrderError("Выберите область");
                      setTimeout(() => setQuickOrderError(null), 3000);
                      return;
                    }

                    try {
                      setQuickOrderLoading(true);
                      setQuickOrderError(null);

                      const variantId = selectedVariant?.id || fetchedProduct.variant_id;
                      const cityCode = toCityCode(quickOrderRegion) || quickOrderRegion;
                      const regionId = quickOrderRegion;

                      const payload = {
                        items: [{ variant_id: variantId, quantity: 1, referral_code: referralCode || undefined }],
                        guest_user_number: phone,
                        full_name: name.trim(),
                        city: cityCode,
                        order_region: regionId,
                        order_comment: "",
                      } as any;

                      await shopAPI.guestOrder(payload);

                    const variantTitle =
                      selectedVariant?.attribute_values
                        ?.map((av: any) => av?.value || av?.attribute_value)
                        ?.filter(Boolean)
                        ?.join(", ") || "";

                    navigate("/order/requested", {
                      state: {
                        productName: fetchedProduct.product_name,
                        variantTitle,
                        phone,
                        fullName: name.trim(),
                      },
                      replace: true,
                    });

                      setName("");
                      setPhone("");
                      setQuickOrderRegion("");
                    setIsQuickOrderOpen(false);
                    } catch (err: any) {
                      logger.errorWithContext(err, { context: "quickOrder" });
                      const errorMsg = err?.response?.data?.detail || err?.message || t("product.quickOrder.errors.generic");
                      setQuickOrderError(errorMsg);
                      setTimeout(() => setQuickOrderError(null), 3000);
                    } finally {
                      setQuickOrderLoading(false);
                    }
                  }}
                  disabled={(() => {
                    if (!name || !phone || !quickOrderRegion) return true;
                    return false;
                  })() || quickOrderLoading}
                  className="w-full h-11 rounded-[18px] text-white font-semibold transition hover:brightness-110 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ background: "linear-gradient(92.41deg, #003d32, #04734b)" }}
                >
                  {quickOrderLoading ? t("product.quickOrder.submitting") : t("product.quickOrder.submit")}
                </button>

                {quickOrderError && (
                  <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-600">
                    {quickOrderError}
                  </div>
                )}
              </div>
            </aside>
          </section>
        </div>

        {/* Tabs + additional */}
        <div className="mt-6 space-y-6">
          <div className="rounded-3xl bg-white border border-slate-200 shadow-sm p-4 md:p-5">
            <div className="flex gap-2 rounded-2xl bg-slate-50 p-1">
              <button
                type="button"
                onClick={() => setActiveTab("description")}
                className={`flex-1 h-10 rounded-xl text-sm font-semibold transition ${
                  activeTab === "description" ? "bg-white shadow-sm text-slate-900" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                {t("product.tabs.description")}
              </button>
              {/* <button
                type="button"
                onClick={() => setActiveTab("characteristics")}
                className={`flex-1 h-10 rounded-xl text-sm font-semibold transition ${
                  activeTab === "characteristics" ? "bg-white shadow-sm text-slate-900" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                {t("product.tabs.specs")}
              </button> */}
              <button
                type="button"
                onClick={() => setActiveTab("comments")}
                className={`flex-1 h-10 rounded-xl text-sm font-semibold transition ${
                  activeTab === "comments" ? "bg-white shadow-sm text-slate-900" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                {t("product.tabs.comments")}
              </button>
            </div>

            <div className="mt-4 text-sm sm:text-base leading-relaxed text-slate-700">
              {activeTab === "description" ? (
                <div
                  className="product-richtext"
                  dangerouslySetInnerHTML={{
                    __html: safeDescriptionHtml || `<p>${t("product.empty.description")}</p>`,
                  }}
                />
              ) : activeTab === "characteristics" ? (
                <div>
                  {(() => {
                    const hasSpecs = selectedVariant && selectedVariant.attribute_values && selectedVariant.attribute_values.length > 0;
                    if (!hasSpecs || !selectedVariant) return <p>{t("product.empty.specs")}</p>;

                    const validSpecs = selectedVariant.attribute_values
                      .map((attrValue) => {
                        const attrId = attrValue.attribute_id || (attrValue as any).attribute_name;
                        const attribute = product.attributes.find(
                          (attr) => attr.id === attrId || attr.name === attrId || attr.name === (attrValue as any).attribute_name
                        );
                        if (!attribute) return null;
                        return { id: attrValue.id, name: attribute.name, value: attrValue.value, unit: attribute.unit };
                      })
                      .filter((spec): spec is { id: string; name: string; value: string; unit: string } => spec !== null);

                    if (validSpecs.length === 0) return <p>{t("product.empty.specs")}</p>;

                    return (
                      <div className="divide-y divide-slate-100 rounded-2xl border border-slate-200 overflow-hidden">
                        {validSpecs.map((spec) => (
                          <div key={spec.id} className="flex items-start justify-between gap-4 p-4">
                            <span className="font-semibold text-slate-900">{spec.name}:</span>
                            <span className="text-slate-700">
                              {spec.value} {spec.unit && spec.unit.trim()}
                            </span>
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                </div>
              ) : (
                <div>
                  {comments.length === 0 ? (
                    <p className="text-slate-600">{t("product.empty.comments")}</p>
                  ) : (
                    <div className="divide-y divide-slate-100 rounded-2xl border border-slate-200 overflow-hidden">
                      {comments.map((c) => (
                        <div key={c.id} className="p-4">
                          <div className="flex items-center justify-between gap-3">
                            <strong className="text-slate-900">{c.author}</strong>
                            <span className="text-xs text-slate-500">{new Date(c.createdAt).toLocaleString("ru-RU")}</span>
                          </div>
                          <div className="mt-2 text-slate-700">{c.text}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Recently viewed */}
          <section className="rounded-3xl bg-white border border-slate-200 shadow-sm p-3 sm:p-4 md:p-5">
            <h3 className="text-base sm:text-lg font-bold text-slate-900">{t("product.sections.recentlyViewed")}</h3>
            <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4">
              {recentlyViewed && recentlyViewed.length > 0 ? (
                recentlyViewed.map((p) => {
                  const uniqueKey = p.variant_id ? `${p.product_id}_${p.variant_id}` : p.product_id;
                  return (
                    <div key={uniqueKey} className="min-w-0">
                      <ProductCard product={p} size="compact" />
                    </div>
                  );
                })
              ) : (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="h-32 rounded-xl bg-slate-200/60" />
                  <div className="mt-3 h-4 w-2/3 rounded bg-slate-200/70" />
                  <div className="mt-2 h-4 w-1/3 rounded bg-slate-200/70" />
                </div>
              )}
            </div>
          </section>

          {/* Recommendations */}
          <section className="rounded-3xl bg-white border border-slate-200 shadow-sm p-4 md:p-5">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-base sm:text-lg font-bold text-slate-900">{t("product.sections.recommendations")}</h3>
              {categoryId ? (
                <button
                  type="button"
                  onClick={() => navigate(`/category/${categoryId}`)}
                  className="text-sm font-semibold text-emerald-700 hover:text-emerald-900"
                >
                  {t("common.actions.viewAll") || "Смотреть все"}
                </button>
              ) : null}
            </div>
            {recommendedLoading && <p className="mt-2 text-sm text-slate-500">Загрузка рекомендаций...</p>}
            {recommendedError && <p className="mt-2 text-sm text-rose-500">{recommendedError}</p>}
            {!recommendedLoading && !recommendedError && recommended.length === 0 && (
              <p className="mt-2 text-sm text-slate-500">Нет рекомендаций.</p>
            )}
            {recommendedLoading && (
              <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                    <div className="h-32 rounded-xl bg-slate-200/60" />
                    <div className="mt-3 h-4 w-2/3 rounded bg-slate-200/70" />
                    <div className="mt-2 h-4 w-1/3 rounded bg-slate-200/70" />
                  </div>
                ))}
              </div>
            )}
            {!recommendedLoading && !recommendedError && recommended.length > 0 && (
              <>
                {/* Mobile: горизонтальная лента */}
                <div className="mt-3 -mx-4 px-4 overflow-x-auto md:hidden">
                  <div className="flex gap-3">
                    {recommended.map((p) => {
                      const uniqueKey = p.variant_id ? `${p.product_id}_${p.variant_id}` : p.product_id;
                      return (
                        <div key={uniqueKey} className="w-[160px] flex-shrink-0">
                          <ProductCard product={p} size="compact" />
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Desktop: grid */}
                <div className="mt-3 hidden md:grid grid-cols-4 gap-4">
                  {recommended.map((p) => {
                    const uniqueKey = p.variant_id ? `${p.product_id}_${p.variant_id}` : p.product_id;
                    return (
                      <div key={uniqueKey} className="min-w-0">
                        <ProductCard product={p} size="compact" />
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </section>
        </div>
      </div>

      {/* QuickOrderSheet (disabled on mobile) */}
      {product && (
        <div className="hidden md:block">
          <QuickOrderSheet
            open={isQuickOrderOpen}
            onClose={closeQuickOrder}
            product={product}
            variant={selectedVariant}
            name={name}
            phone={phone}
            onNameChange={setName}
            onPhoneChange={setPhone}
            agreeTerms={agreeTerms}
            onAgreeChange={setAgreeTerms}
            loading={quickOrderLoading}
            error={quickOrderError}
            onSubmit={handleQuickOrderSubmit}
            locationLabel={locationLabel}
            locationHint={locationHint}
          />
        </div>
      )}

      {/* Mobile bottom bar (disabled per request) */}
      {false && canBuy && (
        <div className="md:hidden fixed inset-x-0 z-40 flex gap-2 px-4" style={{ bottom: "73px" }}>
          <button
            type="button"
            onClick={openQuickOrder}
            className="flex-1 rounded-2xl py-3 text-sm font-semibold text-white shadow-lg transition active:scale-[0.99]"
            style={{ background: "linear-gradient(92.41deg, #003d32, #04734b)" }}
          >
            {t("product.buttons.buyOneClick")}
          </button>

          {cartQuantity > 0 ? (
            <div className="flex-1 rounded-2xl border border-white/40 bg-white/90 shadow-md backdrop-blur-lg flex items-center justify-between px-3">
              <button
                type="button"
                onClick={handleDecreaseQuantity}
                className="h-9 w-9 rounded-xl bg-white/80 text-lg font-semibold text-[#04734b] transition active:scale-95"
              >
                −
              </button>
              <span className="text-sm font-bold text-[#04734b] min-w-[30px] text-center">{cartQuantity}</span>
              <button
                type="button"
                onClick={handleIncreaseQuantity}
                disabled={cartQuantity >= maxStock}
                className={`h-9 w-9 rounded-xl bg-white/80 text-lg font-semibold text-[#04734b] transition ${
                  cartQuantity >= maxStock ? "opacity-50" : "active:scale-95"
                }`}
              >
                +
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={handleAddToCart}
              className="flex-1 rounded-2xl border border-white/40 bg-white/90 py-3 text-sm font-semibold text-[#04734b] shadow-md backdrop-blur-lg transition active:scale-[0.99]"
            >
              {t("product.buttons.addToCart")}
            </button>
          )}
        </div>
      )}

      {/* Lightbox */}
      {lightboxOpen && (
        <div
          className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center px-4"
          onWheel={onLightboxWheel}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onClick={(e) => {
            if (e.target === e.currentTarget) closeLightbox();
          }}
        >
          <div className="relative w-full max-w-5xl">
            <button
              className="hidden md:grid absolute -top-3 -right-3 h-10 w-10 rounded-full bg-white/90 text-slate-900 shadow-md place-items-center"
              onClick={closeLightbox}
              aria-label={t("product.lightbox.close")}
            >
              ×
            </button>

            <button
              className="hidden md:grid absolute left-2 top-1/2 -translate-y-1/2 h-12 w-12 rounded-2xl bg-white/90 text-slate-900 shadow-md place-items-center"
              onClick={(e) => {
                e.stopPropagation();
                prevImage();
              }}
              aria-label={t("product.lightbox.prev")}
            >
              ‹
            </button>

            <button
              className="hidden md:grid absolute right-2 top-1/2 -translate-y-1/2 h-12 w-12 rounded-2xl bg-white/90 text-slate-900 shadow-md place-items-center"
              onClick={(e) => {
                e.stopPropagation();
                nextImage();
              }}
              aria-label={t("product.lightbox.next")}
            >
              ›
            </button>

            <div className="rounded-3xl overflow-hidden bg-black">
              {(() => {
                const item = galleryMedia[lightboxIndex];
                const fallback = getProductImageUrl(product?.main_image || "");
                if (item?.kind === "video") {
                  return (
                    <video
                      key={item.url}
                      src={item.url}
                      controls
                      playsInline
                      autoPlay
                      muted
                      loop
                      className="w-full max-h-[80vh] object-contain bg-black"
                      onClick={(e) => e.stopPropagation()}
                    />
                  );
                }
                return (
                  <img
                    src={item?.url || fallback}
                    alt={t("product.lightbox.view")}
                    className="w-full max-h-[80vh] object-contain"
                    style={{ transform: `translate(${lightboxPan.x}px, ${lightboxPan.y}px) scale(${lightboxZoom})` }}
                    onClick={(e) => {
                      e.stopPropagation();
                      const now = Date.now();
                      if (now - lastTapRef.current < 300) {
                        setLightboxZoom(1);
                        setLightboxPan({ x: 0, y: 0 });
                      } else {
                        setLightboxZoom((z) => (z >= 2 ? 1 : 2));
                        if (lightboxZoom <= 1) setLightboxPan({ x: 0, y: 0 });
                      }
                      lastTapRef.current = now;
                    }}
                  />
                );
              })()}
            </div>

            {galleryMedia[lightboxIndex]?.kind !== "video" && (
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 hidden md:flex gap-2">
                <button
                  className="h-11 w-11 rounded-2xl bg-white/90 text-slate-900 shadow-md text-xl font-bold"
                  onClick={(e) => {
                    e.stopPropagation();
                    zoomOut();
                  }}
                  aria-label={t("product.lightbox.zoomOut")}
                >
                  −
                </button>
                <button
                  className="h-11 w-11 rounded-2xl bg-white/90 text-slate-900 shadow-md text-xl font-bold"
                  onClick={(e) => {
                    e.stopPropagation();
                    zoomIn();
                  }}
                  aria-label={t("product.lightbox.zoomIn")}
                >
                  +
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default Product;
