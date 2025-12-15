import React, { useEffect, useMemo, useState, useRef, FormEvent } from "react";
import { useLocation, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
// @ts-ignore – модуль стилей объявлен через d.ts
import cn from "./style.module.scss";
import { formatPrice, getProductImageUrl, storage } from "../utils/helpers";
import { Product as ProductType, ProductDetail } from "../types";
import { shopAPI } from "../services/api";
import { uzbekistanLocations, getRegions, getCitiesByRegion } from "../data/uzbekistanLocations";
import { useApp } from "../context/AppContext";
import ProductCard from "../components/ui/ProductCard";
import PhoneInput from "../components/forms/PhoneInput";
import useSEO from "../hooks/useSEO";
import ProductPageSkeleton from "../components/ProductPageSkeleton";
import { logger } from "../utils/logger";
import { handleApiError, getUserFriendlyMessage } from "../utils/errorHandler";
import { ERROR_MESSAGES } from "../constants";

type LocationState = { product?: ProductType };

// Функция для загрузки всех вариантов товара (использует новый API /api/v1/shop/product/{product_id})
async function fetchAllProductVariants(productId: string): Promise<ProductDetail | null> {
  try {
    logger.debug("Loading product", { productId });
    
    // Используем новый API /api/v1/shop/product/{product_id}
    const response = await shopAPI.getProductById(productId);
    const productData: any = (response as any)?.data ?? response;
    logger.debug("Product API response", { productId, hasData: !!productData });
    
    if (!productData) {
      return null;
    }

    // Проверяем, что загруженный продукт соответствует запрошенному ID
    if (productData.id !== productId && productData.product_id !== productId) {
      logger.errorWithContext(
        new Error("Product ID mismatch"),
        {
          context: 'fetchAllProductVariants',
          requested: productId,
          received: productData.id || productData.product_id,
        }
      );
      return null;
    }

    // Преобразуем атрибуты из формата API в нужный формат
    const allAttributes = (productData.attributes || []).map((attr: any) => ({
      id: attr.id,
      name: attr.name,
      unit: attr.unit || ''
    }));

    // Преобразуем варианты из формата API в нужный формат
    // В новом API: variants[].attribute_values может иметь attribute_name, нужно найти соответствующий attribute по имени
    const allVariants = (productData.variants || []).map((variant: any) => {
      // Преобразуем attribute_values: если есть attribute_name, находим соответствующий attribute по имени
      const attributeValues = (variant.attribute_values || []).map((av: any) => {
        // Если есть attribute_name, ищем соответствующий attribute
        let attributeId = av.attribute_id || '';
        if (!attributeId && av.attribute_name) {
          const matchingAttr = (productData.attributes || []).find((attr: any) => 
            attr.name === av.attribute_name || attr.id === av.attribute_name
          );
          attributeId = matchingAttr?.id || av.attribute_name || '';
        }
        
        return {
          id: av.id,
          variant_id: variant.id,
          attribute_id: attributeId,
          attribute_name: av.attribute_name || '',
          value: av.value || ''
        };
      });
      
      return {
        id: variant.id,
        product_id: variant.product_id || productData.id || productId,
        sku: variant.sku,
        price: variant.price,
        base_price: variant.base_price ?? variant.price ?? null,
        stock: variant.stock ?? 0,
        attribute_values: attributeValues,
        variant_media: variant.media || [],
      };
    });

    // Используем первый вариант как базовый для получения общей информации
    const firstVariant = productData.variants?.[0];

    const productDetail: ProductDetail = {
      product_id: productData.id || productData.product_id || productId,
      product_name: productData.name || productData.product_name,
      product_description: productData.description || productData.product_description,
      category: productData.category,
      refferal_price: productData.refferal_price ?? 0,
      main_image: productData.main_image || '',
      variant_id: firstVariant?.id || '',
      variant_sku: firstVariant?.sku || '',
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
    logger.errorWithContext(error, { context: 'fetchAllProductVariants' });
    throw error;
  }
}

type QuickOrderSheetProps = {
  open: boolean;
  onClose: () => void;
  product: ProductDetail;
  variant: ProductDetail['variants'][0] | null;
  name: string;
  phone: string;
  onNameChange: (value: string) => void;
  onPhoneChange: (value: string) => void;
  agreeTerms: boolean;
  onAgreeChange: (value: boolean) => void;
  loading: boolean;
  error: string | null;
  feedback: string | null;
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
  feedback,
  onSubmit,
  locationLabel,
  locationHint,
}) => {
  if (!open) return null;
  const { t } = useTranslation();

  const summaryImage =
    getProductImageUrl(
      (variant?.variant_media || []).find((m: any) => m?.is_main)?.file ||
        variant?.variant_media?.[0]?.file ||
        product.main_image
    );
  const price = variant?.price ?? product.price ?? 0;
  const sku = variant?.sku || product.variant_sku || product.product_id;
  const inStock = (variant?.stock ?? product.stock ?? 0) > 0;

  return (
    <div className="fixed inset-0 z-[80] flex justify-end bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div
        className="h-full w-full max-w-md rounded-l-3xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
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
                <img src={summaryImage} alt="" className="h-full w-full object-cover" />
              </div>
              <div className="flex flex-1 flex-col">
                <p className="line-clamp-2 text-sm font-semibold text-gray-900">{product.product_name}</p>
                <span className="mt-1 text-xs text-gray-400">
                  {t("product.quickOrder.skuLabel")}: {sku}
                </span>
                <div className="mt-2 flex items-center gap-2">
                  <span className="text-base font-bold text-gray-900">{formatPrice(price)}</span>
                  <span className={`text-sm font-medium ${inStock ? 'text-emerald-600' : 'text-rose-500'}`}>
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

            {error && (
              <div className="rounded-2xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm text-rose-600">
                {error}
              </div>
            )}
            {feedback && (
              <div className="rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                {feedback}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="h-12 rounded-2xl text-base font-semibold text-white shadow-[0_12px_24px_rgba(0,63,50,0.25)] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
              style={{ background: "linear-gradient(92.41deg, #003d32, #04734b)" }}
            >
              {loading ? t("product.quickOrder.submitting") : t("product.quickOrder.submit")}
            </button>
            <p className="text-center text-xs text-gray-500">
              {t("product.quickOrder.note")}
            </p>
          </form>
        </div>
      </div>
    </div>
  );
};
export function Product() {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const { t } = useTranslation();
  const referralCode = useMemo(()=> new URLSearchParams(location.search).get('ref') || '', [location.search]);
  const routeState = (location.state ?? {}) as LocationState;
  const [fetchedProduct, setFetchedProduct] = useState<ProductDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedVariant, setSelectedVariant] = useState<ProductDetail['variants'][0] | null>(null);
  const [selectedInstallment, setSelectedInstallment] = useState<number>(12);
  const [selectedVendor, setSelectedVendor] = useState<number>(0);
  const [showComingSoonModal, setShowComingSoonModal] = useState(false);
  const [recentlyViewed, setRecentlyViewed] = useState<ProductType[]>([]);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [lightboxZoom, setLightboxZoom] = useState(1);
  const [activeTab, setActiveTab] = useState<'description' | 'characteristics' | 'comments'>('description');
  const [comments] = useState<Array<{ id: string; author: string; text: string; createdAt: string }>>([]);
  const [phone, setPhone] = useState<string>("");
  const [name, setName] = useState<string>("");
  const [isQuickOrderOpen, setIsQuickOrderOpen] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(true);
  const [quickOrderLoading, setQuickOrderLoading] = useState(false);
  const [quickOrderError, setQuickOrderError] = useState<string | null>(null);
  const [quickOrderFeedback, setQuickOrderFeedback] = useState<string | null>(null);
  const [quickOrderRegion, setQuickOrderRegion] = useState<string>("");
  const [quickOrderCity, setQuickOrderCity] = useState<string>("");
  const productRef = useRef<HTMLDivElement>(null);
  const installmentSteps = [3, 6, 9, 12, 15, 18, 24, 33];
  const INSTALLMENT_TRACK_PADDING = 28;
  const INSTALLMENT_DOT_SIZE = 16;
  const rawInstallmentIndex = installmentSteps.indexOf(selectedInstallment);
  const activeInstallmentIndex = rawInstallmentIndex >= 0 ? rawInstallmentIndex : 0;
  const installmentProgress =
    installmentSteps.length > 1
      ? activeInstallmentIndex / (installmentSteps.length - 1)
      : 0;
  const installmentProgressScale =
    activeInstallmentIndex === 0 ? 0 : Math.min(1, Math.max(0, installmentProgress));
  const installmentVendors = [
    { name: "Payme nasiya", price: 178000 },
    { name: "Iman", price: 187450 },
  ];
  const renderInstallmentSlider = () => (
    <div className="px-1 pt-3 pb-1">
      <div className="relative h-16">
        <div
          className="absolute top-7 h-[3px] rounded-full bg-slate-200"
          style={{ left: INSTALLMENT_TRACK_PADDING, right: INSTALLMENT_TRACK_PADDING }}
        />
        <div
          className="absolute top-7 h-[3px] rounded-full bg-[#ef3124] origin-left transition-transform"
          style={{
            left: INSTALLMENT_TRACK_PADDING,
            right: INSTALLMENT_TRACK_PADDING,
            transform: `scaleX(${installmentProgressScale})`,
          }}
        />
        <div className="relative flex justify-between px-4 text-xs font-semibold text-slate-500">
          {installmentSteps.map((months, index) => {
            const isActive = selectedInstallment === months;
            const isCompleted = index <= activeInstallmentIndex;
            return (
              <button
                key={months}
                onClick={() => setSelectedInstallment(months)}
                className="relative flex w-8 flex-col items-center gap-2 focus:outline-none"
              >
                <span className={isActive ? "text-[#ef3124]" : ""}>{months}</span>
                <span
                  className={`grid place-items-center rounded-full transition ${
                    isCompleted
                      ? "bg-[#ef3124] text-white shadow-[0_4px_12px_rgba(239,49,36,0.35)]"
                      : "bg-white text-slate-400 border border-slate-200"
                  }`}
                  style={{
                    width: INSTALLMENT_DOT_SIZE,
                    height: INSTALLMENT_DOT_SIZE,
                  }}
                >
                <span className="sr-only">{t("product.months", { count: months })}</span>
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
  
  const productFromState = routeState?.product;
  const product = useMemo<ProductDetail | null>(() => {
    if (fetchedProduct) return fetchedProduct;
    if (productFromState) {
      // Преобразуем базовый Product в ProductDetail
      return {
        ...productFromState,
        attributes: [],
        variants: []
      };
    }
    return null;
  }, [productFromState, fetchedProduct]);
  const { addToCart, updateCartItem, removeFromCart, state: appState } = useApp();
  const locationLabel =
    appState.location.data?.address ||
    appState.location.data?.city ||
    t("product.locationMissing");
  const locationHint = appState.location.data?.city
    ? t("product.locationCity", { city: appState.location.data.city })
    : t("product.locationHint");

  // Прокрутка вверх при открытии товара (особенно важно для мобильных)
  useEffect(() => {
    // Прокручиваем сразу при изменении id - мгновенно
    window.scrollTo(0, 0);
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
    
    // Также прокручиваем после небольшой задержки для надежности
    const timer1 = setTimeout(() => {
      window.scrollTo(0, 0);
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
    }, 50);
    
    return () => clearTimeout(timer1);
  }, [id]);
  
  // Дополнительная прокрутка после загрузки продукта
  useEffect(() => {
    if (product && !loading) {
      // Задержка для рендеринга контента, затем прокрутка к началу страницы
      const timer = setTimeout(() => {
        // Прокручиваем строго к началу страницы
        window.scrollTo(0, 0);
        document.documentElement.scrollTop = 0;
        document.body.scrollTop = 0;
        
        // Дополнительная проверка через небольшую задержку
        setTimeout(() => {
          window.scrollTo(0, 0);
          document.documentElement.scrollTop = 0;
          document.body.scrollTop = 0;
        }, 100);
      }, 100);
      
      return () => clearTimeout(timer);
    }
  }, [product, loading]);

  // SEO
  const primaryImage = useMemo(() => {
    if (!product) return undefined;
    
    // Используем ту же логику что и для галереи
    const variantMedia = selectedVariant?.variant_media || [];
    const hasVariantMedia = variantMedia && variantMedia.length > 0;
    
    if (hasVariantMedia) {
      // Если есть variant_media, используем главное из них
      const mainMedia = variantMedia.find((m: any) => m.is_main) || variantMedia[0];
      return mainMedia?.file ? getProductImageUrl(mainMedia.file) : undefined;
    } else {
      // Если нет variant_media, используем main_image
      return product.main_image ? getProductImageUrl(product.main_image) : undefined;
    }
  }, [selectedVariant, product]);

  useSEO(useMemo(()=>{
    const title = product ? `${product.product_name} — OZAR` : 'Tovar — OZAR';
    const desc = product?.product_description ? product.product_description.slice(0, 200) : 'Tovar tavsifi.';
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const url = origin + (typeof window !== 'undefined' ? window.location.pathname + window.location.search : '');
    const price = (selectedVariant?.price ?? product?.price ?? 0) || 0;
    const inStock = selectedVariant ? (selectedVariant.stock > 0) : (product ? product.stock > 0 : false);
    const jsonLd: any = product ? {
      '@context': 'https://schema.org',
      '@type': 'Product',
      name: product.product_name,
      description: product.product_description || '',
      image: primaryImage ? [primaryImage] : undefined,
      sku: selectedVariant?.sku || product.variant_sku,
      offers: {
        '@type': 'Offer',
        priceCurrency: 'UZS',
        price: String(price || 0),
        availability: inStock ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
        url
      }
    } : undefined;
    return {
      title,
      description: desc,
      canonical: url,
      openGraph: {
        'og:type': 'product',
        'og:title': title,
        'og:description': desc,
        'og:url': url,
        ...(primaryImage ? { 'og:image': primaryImage } : {}),
      },
      twitter: {
        'twitter:card': primaryImage ? 'summary_large_image' : 'summary',
        'twitter:title': title,
        'twitter:description': desc,
        ...(primaryImage ? { 'twitter:image': primaryImage } : {}),
      },
      jsonLd
    };
  }, [product, selectedVariant, primaryImage]));

  const toCityCode = (value?: string): string => {
    if (!value) return "";
    const v = value.trim().toLowerCase();
    const byId = uzbekistanLocations.find(l => l.id === v);
    if (byId) return byId.id;
    const byName = uzbekistanLocations.find(l => l.name.toLowerCase() === v);
    return byName?.id || "";
  };

  const getRegionForCityOrRegion = (code?: string): string => {
    if (!code) return "";
    const loc = uzbekistanLocations.find(l => l.id === code);
    if (!loc) return "";
    if (loc.type === 'city') return loc.parentId || "";
    if (loc.type === 'region') return loc.id;
    return "";
  };
  useEffect(() => {
    let ignore = false;
    logger.debug("Product page useEffect", { id, hasProductFromState: !!productFromState });
    if (id) {
      logger.debug("Loading product variants", { productId: id });
      setLoading(true);
      setError(null);
      // Очищаем предыдущий продукт перед загрузкой нового
      setFetchedProduct(null);
      setSelectedVariant(null);
      fetchAllProductVariants(id)
        .then((p) => { 
          logger.debug("Product loaded", { productId: p?.product_id });
          if (!ignore && p) {
            // Критическая проверка: убеждаемся что загруженный продукт соответствует запрошенному ID
            if (p.product_id !== id) {
              const error = new Error("Product ID mismatch");
              logger.errorWithContext(error, {
                context: 'Product useEffect',
                requested: id,
                received: p.product_id,
              });
            setError(t("product.errors.loadTitle"));
              setLoading(false);
              return;
            }
            
            setFetchedProduct(p);
            // Автоматически выбираем первый доступный вариант
            if (p?.variants && p.variants.length > 0) {
              // Сначала ищем вариант с ценой и в наличии
              const availableVariant = p.variants.find(v => v.stock > 0 && v.price !== null && v.price !== undefined) || 
                                     p.variants.find(v => v.price !== null && v.price !== undefined) || 
                                     p.variants[0];
              logger.debug("Variant selected", { variantId: availableVariant?.id });
              setSelectedVariant(availableVariant);
              // Сбрасываем индекс лайтбокса
              setLightboxIndex(0);
            }
          } else if (!ignore && !p) {
            setError(t("product.errors.notFoundTitle"));
          }
        })
        .catch((e) => {
          const appError = handleApiError(e);
          logger.errorWithContext(appError, { context: 'Product useEffect' });
          if (!ignore) {
            const errorMessage = getUserFriendlyMessage(appError) || ERROR_MESSAGES.UNKNOWN;
            setError(errorMessage);
          }
        })
        .finally(() => { if (!ignore) setLoading(false); });
    }
    return () => { ignore = true; };
  // depend only on id to avoid re-fetches
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // Сбор изображений для галереи/лайтбокса
  const galleryImages: string[] = useMemo(() => {
    if (!product) return [];
    
    // Проверяем наличие variant_media у выбранного варианта
    const variantMedia = selectedVariant?.variant_media || [];
    const hasVariantMedia = variantMedia && variantMedia.length > 0;
    
    if (hasVariantMedia) {
      // Если есть variant_media, используем только их, main_image не показываем
      const mediaImages = variantMedia
        .map((m: any) => m?.file)
        .filter(Boolean)
        .map((f: string) => getProductImageUrl(f));
      
      const images = Array.from(new Set(mediaImages.filter(Boolean)));
      
      logger.debug("Gallery images from variant_media", {
        product_id: product.product_id,
        variant_id: selectedVariant?.id,
        images_count: images.length
      });
      
      return images as string[];
    } else {
      // Если нет variant_media, показываем main_image
      const main = product.main_image ? getProductImageUrl(product.main_image) : null;
      
      const images = main ? [main] : [];
      
      logger.debug("Gallery images from main_image", {
        product_id: product.product_id,
        variant_id: selectedVariant?.id,
        images_count: images.length
      });
      
      return images as string[];
    }
  }, [selectedVariant, product]);

  // Сбрасываем индекс лайтбокса при изменении варианта или списка изображений
  useEffect(() => {
    if (selectedVariant && galleryImages.length > 0) {
      if (lightboxIndex >= galleryImages.length) {
        setLightboxIndex(0);
      }
    }
  }, [galleryImages.length, selectedVariant?.id]);

  const selectedAttributesList = useMemo(() => {
    if (!product || !selectedVariant) return [];
    return (selectedVariant.attribute_values || [])
      .map((attrValue) => {
        const attrId = attrValue.attribute_id || (attrValue as any).attribute_name;
        const attribute = product.attributes.find(
          (attr) =>
            attr.id === attrId ||
            attr.name === attrId ||
            attr.name === (attrValue as any).attribute_name
        );
        const label = attribute?.name || attrValue.attribute_name || "";
        const value = attrValue.value;
        if (!label || !value) return null;
        return { name: label, value };
      })
      .filter((entry): entry is { name: string; value: string } => Boolean(entry));
  }, [product, selectedVariant]);

  // Недавно просмотренные: сохраняем текущий товар
  useEffect(() => {
    // Предзагрузка ранее просмотренных, чтобы показать сразу
    try {
      const key = 'recently_viewed';
      const list: ProductType[] = storage.get(key) || [];
      setRecentlyViewed(list.filter((p) => p.product_id !== (product?.product_id || '')) .slice(0, 8));
    } catch {}
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!product) return;
    try {
      const key = 'recently_viewed';
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
      // Показываем и текущий товар, чтобы не оставлять секцию пустой при первом просмотре
      setRecentlyViewed(deduped.slice(0, 8));
    } catch {}
  }, [product, selectedVariant]);

  useEffect(() => {
    if (!isQuickOrderOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isQuickOrderOpen]);

  // Лайтбокс
  const openLightbox = (index: number) => {
    setLightboxIndex(index);
    setLightboxZoom(1);
    setLightboxOpen(true);
    document.body.style.overflow = 'hidden';
  };
  const closeLightbox = () => {
    setLightboxOpen(false);
    setLightboxZoom(1);
    document.body.style.overflow = '';
  };
  const nextImage = () => {
    setLightboxIndex((prev) => (prev + 1) % Math.max(galleryImages.length, 1));
  };
  const prevImage = () => {
    setLightboxIndex((prev) => (prev - 1 + Math.max(galleryImages.length, 1)) % Math.max(galleryImages.length, 1));
  };
  const zoomIn = () => setLightboxZoom((z) => Math.min(z + 0.25, 3));
  const zoomOut = () => setLightboxZoom((z) => Math.max(z - 0.25, 0.5));
  const onLightboxWheel: React.WheelEventHandler<HTMLDivElement> = (e) => {
    if (e.deltaY < 0) zoomIn();
    else zoomOut();
  };
  useEffect(() => {
    if (!lightboxOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeLightbox();
      if (e.key === 'ArrowRight') nextImage();
      if (e.key === 'ArrowLeft') prevImage();
      if (e.key === '+') zoomIn();
      if (e.key === '-') zoomOut();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [lightboxOpen, galleryImages.length]);

  // Добавление в корзину
  const handleAddToCart = () => {
    if (!product || !canBuy) return;
    const cartImage =
      primaryImage ||
      galleryImages[0] ||
      (product.main_image ? getProductImageUrl(product.main_image) : undefined);
    const cartPrice = currentPrice ?? product.price ?? 0;
    const stockAmount = selectedVariant?.stock ?? product.stock ?? 0;
    const item = {
      id: (selectedVariant?.id || product.variant_id),
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

  const canBuy =
    selectedVariant
      ? selectedVariant.stock > 0 && selectedVariant.price !== null
      : product?.price !== null && (product?.stock ?? 0) > 0;

  // Получаем ID текущего товара/варианта для корзины
  const currentCartItemId = selectedVariant?.id || product?.variant_id || '';
  
  // Находим товар в корзине
  const cartItem = React.useMemo(() => {
    return appState.cart.find(item => item.productId === currentCartItemId);
  }, [appState.cart, currentCartItemId]);
  
  // Количество товара в корзине
  const cartQuantity = cartItem?.quantity || 0;
  
  // Максимальное количество (stock)
  const maxStock = selectedVariant?.stock ?? product?.stock ?? 0;
  
  // Увеличить количество в корзине
  const handleIncreaseQuantity = () => {
    if (!currentCartItemId || cartQuantity >= maxStock) return;
    updateCartItem(currentCartItemId, cartQuantity + 1);
  };
  
  // Уменьшить количество в корзине
  const handleDecreaseQuantity = () => {
    if (!currentCartItemId) return;
    if (cartQuantity <= 1) {
      removeFromCart(currentCartItemId);
    } else {
      updateCartItem(currentCartItemId, cartQuantity - 1);
    }
  };

  const openQuickOrder = () => {
    if (!canBuy) return;
    setQuickOrderError(null);
    setQuickOrderFeedback(null);
    setIsQuickOrderOpen(true);
  };

  const closeQuickOrder = () => {
    setIsQuickOrderOpen(false);
  };

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
        items: [
          {
            variant_id: variantId,
            quantity: 1,
            referral_code: referralCode || undefined,
          },
        ],
        guest_user_number: phone,
        full_name: name.trim(),
        city: cityCode,
        order_region: getRegionForCityOrRegion(cityCode),
        order_comment: "",
      } as any;
      await shopAPI.guestOrder(payload);
      setQuickOrderFeedback(t("product.quickOrder.success"));
      setName("");
      setPhone("");
      setTimeout(() => {
        setIsQuickOrderOpen(false);
        setQuickOrderFeedback(null);
      }, 1800);
    } catch (err) {
      logger.errorWithContext(err, { context: "quickOrder" });
      setQuickOrderError(t("product.quickOrder.errors.generic"));
    } finally {
      setQuickOrderLoading(false);
    }
  };

  // Функция для получения значения атрибута по ID
  const getAttributeValue = (variant: ProductDetail['variants'][0], attributeId: string) => {
    const attributeValue = variant.attribute_values.find(av => {
      // Сравниваем как по attribute_id, так и по attribute_name
      const attrId = av.attribute_id || (av as any).attribute_name;
      const attrName = (av as any).attribute_name || av.attribute_id;
      return attrId === attributeId || attrName === attributeId;
    });
    return attributeValue?.value || '';
  };

  // Функция для обработки выбора атрибута
  const handleAttributeSelect = (attributeId: string, value: string) => {
    if (!product || !selectedVariant) return;

    // Создаем новую комбинацию атрибутов на основе текущих значений
    const currentAttributes = getCurrentAttributeValues();
    const newAttributes = { ...currentAttributes };
    newAttributes[attributeId] = value;

    // Ищем подходящий вариант
    const matchingVariant = product.variants.find(variant => {
      return Object.entries(newAttributes).every(([attrId, attrValue]) => {
        const variantValue = getAttributeValue(variant, attrId);
        return variantValue === attrValue;
      });
    });

    if (matchingVariant) {
      setSelectedVariant(matchingVariant);
      // Сбрасываем индекс лайтбокса на 0 при изменении варианта
      setLightboxIndex(0);
    } else {
      // Если точного совпадения нет, пытаемся найти вариант с таким же значением этого атрибута
      const variantWithSameAttr = product.variants.find(variant => {
        const variantValue = getAttributeValue(variant, attributeId);
        return variantValue === value && variant.stock > 0 && variant.price !== null;
      }) || product.variants.find(variant => {
        const variantValue = getAttributeValue(variant, attributeId);
        return variantValue === value;
      });
      
      if (variantWithSameAttr) {
        setSelectedVariant(variantWithSameAttr);
        setLightboxIndex(0);
      }
    }
  };

  // Функция для получения текущих значений атрибутов
  const getCurrentAttributeValues = (): Record<string, string> => {
    if (!selectedVariant) return {};
    
    const values: Record<string, string> = {};
    product?.attributes.forEach(attribute => {
      const value = getAttributeValue(selectedVariant, attribute.id);
      if (value) {
        values[attribute.id] = value;
      }
    });
    return values;
  };
  // Скелетон загрузки
  if (loading) {
    return <ProductPageSkeleton />;
  }

  // Ошибка загрузки
  if (error) {
    return (
      <div className={cn.error_screen}>
        <div className={cn.error_container}>
          <div className={cn.error_icon}>⚠️</div>
          <h2 className={cn.error_title}>{t("product.errors.loadTitle")}</h2>
          <p className={cn.error_message}>{error}</p>
          <button 
            className={cn.retry_button}
            onClick={() => window.location.reload()}
          >
            {t("product.errors.loadAction")}
          </button>
        </div>
      </div>
    );
  }

  // Товар не найден
  if (!product) {
    return (
      <div className={cn.not_found_screen}>
        <div className={cn.not_found_container}>
          <div className={cn.not_found_icon}>🔍</div>
          <h2 className={cn.not_found_title}>{t("product.errors.notFoundTitle")}</h2>
          <p className={cn.not_found_message}>
            {t("product.errors.notFoundMessage", { id: id ? `#${id}` : "" })}
          </p>
          <button 
            className={cn.back_button}
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
    currentPrice !== null &&
    basePrice !== null &&
    typeof currentPrice === "number" &&
    typeof basePrice === "number" &&
    basePrice > currentPrice;
  const discountPercent =
    hasDiscount && basePrice
      ? Math.round(((basePrice - currentPrice) / basePrice) * 100)
      : null;
  const sku = selectedVariant?.sku || product.variant_sku || product.product_id;
  const availableUnits = selectedVariant ? selectedVariant.stock : product.stock;
  const isAvailable = (availableUnits ?? 0) > 0;

    return (
      <div ref={productRef} className={cn.product}>
      <div className="mx-auto w-full max-w-[1240px] px-3 sm:px-4 md:px-6 lg:px-8 py-4 md:py-6 lg:py-8">
        {product && (
          <div className={cn.product_content}>
            <section className={`${cn.product_gallery} ${galleryImages.length <= 1 ? cn.gallery_no_thumbs : ''}`}>
              {/* Показываем миниатюры только если есть больше одного изображения */}
              {galleryImages.length > 1 && (
                <div className={cn.gallery_thumbs}>
                  {galleryImages.map((img, i) => (
                    <button
                      key={i}
                      className={`${cn.thumb} ${i === lightboxIndex ? 'active' : ''}`}
                      type="button"
                      aria-label={t("product.lightbox.preview", { index: i + 1 })}
                      onClick={() => {
                        setLightboxIndex(i);
                      }}
                    >
                      <img src={img} alt="" />
                    </button>
                  ))}
                </div>
              )}
              <div className={cn.gallery_main}>
                <img 
                  src={galleryImages[Math.min(lightboxIndex, galleryImages.length - 1)] || getProductImageUrl(product.main_image)} 
                  alt={product.product_name} 
                  className={cn.main_image}
                  onClick={() => openLightbox(Math.min(lightboxIndex, galleryImages.length - 1))}
                />
              </div>
            </section>
            <section className={cn.product_info}>
              <div className="-mx-3 rounded-t-[28px] bg-white px-3 py-4 shadow-sm sm:-mx-4 md:m-0 md:rounded-none md:bg-transparent md:p-0 md:shadow-none">
                <div className="flex flex-col gap-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-2">
                      <h1 className={`${cn.product_title} text-slate-900`}>{product.product_name}</h1>
                      <div className="flex flex-wrap items-center gap-3 text-sm">
                        <span
                          className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${
                            isAvailable ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-600'
                          }`}
                        >
                          {isAvailable ? t("common.status.inStock") : t("common.status.outOfStock")}
                        </span>
                        {sku && (
                          <span className="text-xs font-medium text-gray-500">
                            {t("product.quickOrder.skuLabel")}: {sku}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
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
                      {hasDiscount && basePrice ? (
                        <p className="text-sm font-medium text-gray-400 line-through">
                          {formatPrice(basePrice)}
                        </p>
                      ) : null}
                      {currentPrice ? (
                        <>
                          <p className="text-xs font-medium text-gray-500">
                            {t("product.deliveryUzbekistan")}:{" "}
                            <span className="text-[#04734b] font-semibold">
                              {t("product.deliveryFlatRate", {
                                price: formatPrice(30000),
                                currency: t("common.currency"),
                              })}
                            </span>
                          </p>
                        </>
                      ) : null}
                    </div>
                    {/* <div className={`${cn.rating_row} mt-1 sm:mt-0`}>
                      <img src="/icons/star.png" alt="" aria-hidden="true" />
                      <strong>4.9</strong>
                      <span className={cn.muted}>{t("product.ratingCount", { count: "18 503" })}</span>
                    </div> */}
                  </div>
                </div>
                
                {/* Отображение вариантов продукта - показываем только если есть варианты и атрибуты */}
                {(() => {
                  const hasVariants = product.variants && product.variants.length > 0;
                  const hasAttributes = product.attributes && product.attributes.length > 0;
                  const hasValidAttributes = hasAttributes && product.attributes.some(attr => {
                    return product.variants.some(variant => {
                      const value = getAttributeValue(variant, attr.id);
                      return value && value.trim() !== '';
                    });
                  });

                  if (!hasVariants || !hasValidAttributes) {
                    return null;
                  }

                  return (
                    <div className="mt-4 space-y-4">
                      {product.attributes.map((attribute) => {
                        // Проверяем, есть ли у этого атрибута хотя бы одно значение в вариантах
                        const hasValues = product.variants.some(variant => {
                          const value = getAttributeValue(variant, attribute.id);
                          return value && value.trim() !== '';
                        });

                        if (!hasValues) return null;

                        return (
                          <div key={attribute.id} className={cn.attribute_group}>
                            <h4 className={cn.attribute_title}>
                              {attribute.name} {attribute.unit && `(${attribute.unit})`}
                            </h4>
                            <div className={cn.attribute_values}>
                              {(() => {
                                // Получаем все уникальные значения для этого атрибута
                                const uniqueValues = new Map();
                                product.variants.forEach(variant => {
                                  const value = getAttributeValue(variant, attribute.id);
                                  if (value && value.trim() !== '' && !uniqueValues.has(value)) {
                                    // Находим первый доступный вариант с этим значением
                                    const availableVariant = product.variants.find(v => 
                                      getAttributeValue(v, attribute.id) === value && 
                                      v.stock > 0 && v.price !== null
                                    ) || product.variants.find(v => 
                                      getAttributeValue(v, attribute.id) === value
                                    );
                                    uniqueValues.set(value, availableVariant);
                                  }
                                });

                                return Array.from(uniqueValues.entries()).map(([value, variant]) => {
                                  const isSelected = selectedVariant && getAttributeValue(selectedVariant, attribute.id) === value;
                                  const isDisabled = !variant || variant.stock === 0 || variant.price === null;
                                  
                                  return (
                                    <button
                                      key={`${attribute.id}-${value}`}
                                      className={`${cn.attribute_value} ${isSelected ? cn.selected : ''} ${isDisabled ? cn.disabled : ''}`}
                                      onClick={() => !isDisabled && handleAttributeSelect(attribute.id, value)}
                                      disabled={isDisabled}
                                      type="button"
                                    >
                                      {value}
                                    </button>
                                  );
                                });
                              })()}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
                <div className="md:hidden mt-6 space-y-3 rounded-[26px] border border-white/40 bg-white/95 p-4 shadow-[0_16px_30px_rgba(15,23,42,0.12)]">
                  <div className="flex items-center justify-between text-sm font-semibold text-slate-900">
                    <span>{t("product.installment.forMonths", { count: selectedInstallment })}</span>
                    <span className="text-base text-[#04734b]">
                      {t("product.installment.perMonth", {
                        price: formatPrice(Math.round((currentPrice ?? 0) / Math.max(1, selectedInstallment))),
                      })}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">{t("product.installment.selectTerm")}</p>
                  {renderInstallmentSlider()}
                  <div className="grid gap-2">
                    {installmentVendors.map((item, idx) => {
                      const monthly = Math.round(item.price / Math.max(1, selectedInstallment)).toLocaleString("ru-RU");
                      const isActive = selectedVendor === idx;
                      return (
                        <button
                          key={item.name}
                          type="button"
                          onClick={() => setSelectedVendor(idx)}
                          className={`relative flex items-center justify-between rounded-[18px] border-2 px-3 py-2 text-xs font-semibold transition-all duration-200 ${
                            isActive 
                              ? "border-[#04734b] bg-gradient-to-r from-[#e6f4ef] to-[#f0faf6] shadow-[0_0_0_3px_rgba(4,115,75,0.15)]" 
                              : "border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm"
                          }`}
                        >
                          {isActive && (
                            <span className="absolute -top-2 -right-2 h-5 w-5 rounded-full bg-[#04734b] flex items-center justify-center">
                              <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                            </span>
                          )}
                          <div className="flex items-center gap-2">
                            <span className={`h-7 w-7 rounded-xl text-[11px] grid place-items-center transition-colors ${
                              isActive ? "bg-[#04734b] text-white" : "bg-slate-100 text-slate-500"
                            }`}>
                              {item.name.slice(0, 1)}
                            </span>
                            <span className={isActive ? "text-[#04734b]" : ""}>{item.name}</span>
                          </div>
                          <div className={`font-bold ${isActive ? "text-[#04734b]" : "text-slate-600"}`}>
                            {t("product.installment.perMonth", { price: monthly })}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                  <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
                    <span>{t("product.installment.total", { count: selectedInstallment })}</span>
                    <strong className="text-slate-900">{formatPrice(currentPrice ?? 0)}</strong>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowComingSoonModal(true)}
                    className="w-full h-11 rounded-[18px] text-white text-sm font-semibold shadow-[0_10px_20px_rgba(4,115,75,0.3)] transition hover:brightness-110 active:scale-[0.98]"
                    style={{ background: "linear-gradient(92.41deg, #003d32, #04734b)" }}
                  >
                    {t("product.buttons.checkout")}
                  </button>
                </div>
              </div>
            </section>
            <aside className={cn.aside}>
              <div className="hidden md:block">
                <div className="rounded-[26px] border border-white/40 bg-white/70 shadow-[0_20px_50px_rgba(15,23,42,0.12)] backdrop-blur-md px-6 py-5 space-y-4">
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={openQuickOrder}
                      disabled={!canBuy}
                      className="flex-1 h-12 rounded-[18px] bg-gradient-to-r from-[#00a779] via-[#00b78a] to-[#00c08c] text-xs md:text-sm font-semibold text-white shadow-[0_12px_24px_rgba(0,160,120,0.35)] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
                      style={{ background: "linear-gradient(92.41deg, #003d32, #04734b)" }}
                    >
                      {t("product.buttons.buyOneClick")}
                    </button>
                    {cartQuantity > 0 ? (
                      <div className="flex-1 h-12 rounded-[18px] border border-[#d5ebe3] bg-white flex items-center justify-between px-2">
                        <button
                          type="button"
                          onClick={handleDecreaseQuantity}
                          className="h-9 w-9 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-lg font-semibold text-[#04734b] transition"
                        >
                          −
                        </button>
                        <span className="text-base font-bold text-[#04734b] min-w-[40px] text-center">
                          {cartQuantity}
                        </span>
                        <button
                          type="button"
                          onClick={handleIncreaseQuantity}
                          disabled={cartQuantity >= maxStock}
                          className={`h-9 w-9 rounded-xl border border-gray-200 bg-white text-lg font-semibold text-[#04734b] transition ${
                            cartQuantity >= maxStock ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-50'
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
                  </div>
                  <p className="text-center text-xs font-medium text-slate-500">
                    {t("product.paymentInfo")}
                  </p>
                </div>
                {/* Блок рассрочки - закомментирован
                <div className="mt-4 rounded-[22px] border border-slate-200 bg-white shadow-[0_16px_30px_rgba(15,23,42,0.08)] px-5 py-4 space-y-4">
                  <div className="flex items-center justify-between text-sm font-semibold text-slate-900">
                    <span>{t("product.installment.forMonths", { count: selectedInstallment })}</span>
                  </div>
                  {renderInstallmentSlider()}
                  <div className="grid gap-2">
                    {installmentVendors.map((item, idx) => {
                      const monthly = Math.round(item.price / Math.max(1, selectedInstallment)).toLocaleString("ru-RU");
                      const isActive = selectedVendor === idx;
                      return (
                        <button
                          key={item.name}
                          type="button"
                          onClick={() => setSelectedVendor(idx)}
                          className={`relative flex items-center justify-between rounded-[18px] border-2 px-4 py-3 text-sm font-semibold transition-all duration-200 ${
                            isActive 
                              ? "border-[#04734b] bg-gradient-to-r from-[#e6f4ef] to-[#f0faf6] shadow-[0_0_0_4px_rgba(4,115,75,0.12)]" 
                              : "border-slate-200 bg-white hover:border-slate-300 hover:shadow-md"
                          }`}
                        >
                          {isActive && (
                            <span className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-[#04734b] flex items-center justify-center shadow-lg">
                              <svg className="w-3.5 h-3.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                            </span>
                          )}
                          <div className="flex items-center gap-3">
                            <span className={`h-8 w-8 rounded-xl text-xs grid place-items-center transition-colors ${
                              isActive ? "bg-[#04734b] text-white" : "bg-slate-100 text-slate-500"
                            }`}>
                              {item.name.slice(0, 1)}
                            </span>
                            <span className={isActive ? "text-[#04734b]" : ""}>{item.name}</span>
                          </div>
                          <div className={`font-bold ${isActive ? "text-[#04734b]" : "text-slate-600"}`}>
                            {t("product.installment.perMonth", { price: monthly })}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                  <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
                    <span>{t("product.installment.total", { count: selectedInstallment })}</span>
                    <strong className="text-slate-900">{formatPrice(currentPrice ?? 0)}</strong>
                  </div>
                  <button 
                    type="button"
                    onClick={() => setShowComingSoonModal(true)}
                    className="w-full h-11 rounded-[18px] text-white font-semibold transition hover:brightness-110 active:scale-[0.98]" 
                    style={{ background: "linear-gradient(92.41deg, #003d32, #04734b)" }}
                  >
                    {t("product.buttons.checkout")}
                  </button>
                </div>
                */}
                
                {/* Форма "Купить в 1 клик" */}
                <div className="mt-4 rounded-[22px] border border-slate-200 bg-white shadow-[0_16px_30px_rgba(15,23,42,0.08)] px-5 py-4 space-y-4">
                  <div className="flex items-center justify-between text-sm font-semibold text-slate-900 mb-2">
                    <span>Купить в 1 клик</span>
                  </div>
                  
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1.5">
                        {t("product.quickOrder.nameLabel")}
                      </label>
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder={t("product.quickOrder.namePlaceholder")}
                        className="w-full h-11 px-4 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#04734b] focus:border-transparent transition"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1.5">
                        {t("product.quickOrder.phoneLabel")}
                      </label>
                      <PhoneInput
                        value={phone}
                        onChange={setPhone}
                        className="w-full h-11 px-4 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#04734b] focus:border-transparent transition"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1.5">
                        Город / Область
                      </label>
                      <select
                        value={quickOrderRegion}
                        onChange={(e) => {
                          const selectedValue = e.target.value;
                          setQuickOrderRegion(selectedValue);
                          setQuickOrderCity(""); // Сбрасываем город при смене
                        }}
                        className="w-full h-11 px-4 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#04734b] focus:border-transparent transition"
                      >
                        <option value="">Выберите город или область</option>
                        {/* Все области и города-центры областей */}
                        <option value="tashkent">Toshkent</option>
                        <option value="tashkent_region">Toshkent viloyati</option>
                        <option value="samarkand">Samarqand viloyati</option>
                        <option value="samarkand_city">Samarqand</option>
                        <option value="bukhara">Buxoro viloyati</option>
                        <option value="bukhara_city">Buxoro</option>
                        <option value="andijan">Andijon viloyati</option>
                        <option value="andijan_city">Andijon</option>
                        <option value="fergana">Farg'ona viloyati</option>
                        <option value="fergana_city">Farg'ona</option>
                        <option value="namangan">Namangan viloyati</option>
                        <option value="namangan_city">Namangan</option>
                        <option value="navoiy">Navoiy viloyati</option>
                        <option value="navoiy_city">Navoiy</option>
                        <option value="kashkadarya">Qashqadaryo viloyati</option>
                        <option value="karshi">Qarshi</option>
                        <option value="surkhandarya">Surxondaryo viloyati</option>
                        <option value="termez">Termiz</option>
                        <option value="sirdarya">Sirdaryo viloyati</option>
                        <option value="gulistan">Guliston</option>
                        <option value="jizzakh">Jizzax viloyati</option>
                        <option value="jizzakh_city">Jizzax</option>
                        <option value="khorezm">Xorazm viloyati</option>
                        <option value="urgench">Urganch</option>
                        <option value="karakalpakstan">Qoraqalpog'iston Respublikasi</option>
                        <option value="nukus">Nukus</option>
                      </select>
                    </div>
                    
                    {quickOrderRegion && (() => {
                      const selectedLocation = uzbekistanLocations.find(loc => loc.id === quickOrderRegion);
                      const isRegion = selectedLocation?.type === 'region';
                      const isCityWithoutRegion = selectedLocation?.type === 'city' && !selectedLocation?.parentId;
                      
                      // Показываем второй селект только если выбрана область (не город)
                      if (!isRegion || isCityWithoutRegion) {
                        return null;
                      }
                      
                      const cities = getCitiesByRegion(quickOrderRegion);
                      
                      // Маппинг русских названий на узбекские
                      const cityNameMap: Record<string, string> = {
                        'Андижан': 'Andijon',
                        'Бухара': 'Buxoro',
                        'Джизак': 'Jizzax',
                        'Фергана': 'Farg\'ona',
                        'Наманган': 'Namangan',
                        'Навои': 'Navoiy',
                        'Самарканд': 'Samarqand',
                        'Ангрен': 'Angren',
                        'Бекабад': 'Bekobod',
                        'Чирчик': 'Chirchiq',
                        'Газалкент': 'Gazalkent',
                        'Паркент': 'Parkent',
                        'Каттакурган': 'Kattaqo\'rg\'on',
                        'Ургут': 'Urgut',
                        'Каган': 'Kagan',
                        'Гиждуван': 'G\'ijduvon',
                        'Асака': 'Asaka',
                        'Ханабад': 'Xonobod',
                        'Коканд': 'Qo\'qon',
                        'Маргилан': 'Marg\'ilon',
                        'Кува': 'Quva',
                        'Риштан': 'Rishton',
                        'Чуст': 'Chust',
                        'Пап': 'Pop',
                        'Зарафшан': 'Zarafshon',
                        'Нурата': 'Nurota',
                        'Шахрисабз': 'Shahrisabz',
                        'Китаб': 'Kitob',
                        'Денау': 'Denov',
                        'Шурчи': 'Shurchi',
                        'Янгиер': 'Yangiyer',
                        'Ширин': 'Shirin',
                        'Дустлик': 'Do\'stlik',
                        'Ургенч': 'Urganch',
                        'Хива': 'Xiva',
                        'Питнак': 'Pitnak',
                        'Нукус': 'Nukus',
                        'Муйнак': 'Mo\'ynoq',
                      };
                      
                      return (
                        <div>
                          <label className="block text-xs font-medium text-slate-700 mb-1.5">
                            Город
                          </label>
                          <select
                            value={quickOrderCity}
                            onChange={(e) => setQuickOrderCity(e.target.value)}
                            className="w-full h-11 px-4 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#04734b] focus:border-transparent transition"
                          >
                            <option value="">Выберите город</option>
                            {cities.map((city) => (
                              <option key={city.id} value={city.id}>
                                {cityNameMap[city.name] || city.name}
                              </option>
                            ))}
                          </select>
                        </div>
                      );
                    })()}
                  </div>
                  
                  <button 
                    type="button"
                    onClick={() => setShowComingSoonModal(true)}
                    disabled={(() => {
                      if (!name || !phone || !quickOrderRegion) return true;
                      const selectedLocation = uzbekistanLocations.find(loc => loc.id === quickOrderRegion);
                      const isRegion = selectedLocation?.type === 'region';
                      // Если выбрана область, нужен город. Если выбран город, город не нужен
                      return isRegion ? !quickOrderCity : false;
                    })()}
                    className="w-full h-11 rounded-[18px] text-white font-semibold transition hover:brightness-110 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed" 
                    style={{ background: "linear-gradient(92.41deg, #003d32, #04734b)" }}
                  >
                    {t("product.quickOrder.submit")}
                  </button>
                </div>
              </div>

              {/* <div className={cn.seller_card}>
                <div className={cn.seller_top}>
                  <div className={cn.seller_logo} />
                  <div className={cn.seller_meta}>
                    <div className={cn.seller_name}>Mediapark</div>
                    <div className={cn.seller_rating}>
                      <img src="/icons/star.png" alt="" aria-hidden="true" />
                      <strong>4.5</strong>
                      <span className={cn.muted}>1320 baho</span>
                    </div>
                  </div>
                </div>
                <button type="button" className={cn.seller_btn}>Do`konga o`tish</button>
              </div> */}
            </aside>
          </div>
        )}

        {/* Дополнительные блоки */}
        {product && (
          <div className={cn.additional_sections}>
            {/* Табы: Описание / Характеристики / Комментарии */}
            <div>
              <div className={cn.tabs}>
                <button
                  className={`${cn.tab} ${activeTab === 'description' ? cn.tab_active : ''}`}
                  onClick={() => setActiveTab('description')}
                  type="button"
                >
                  {t("product.tabs.description")}
                </button>
                <button
                  className={`${cn.tab} ${activeTab === 'characteristics' ? cn.tab_active : ''}`}
                  onClick={() => setActiveTab('characteristics')}
                  type="button"
                >
                  {t("product.tabs.specs")}
                </button>
                <button
                  className={`${cn.tab} ${activeTab === 'comments' ? cn.tab_active : ''}`}
                  onClick={() => setActiveTab('comments')}
                  type="button"
                >
                  {t("product.tabs.comments")}
                </button>
              </div>
              <div className={cn.tabs_panel}>
                {activeTab === 'description' ? (
                  <div className={cn.product_desc}>
                    {product.product_description ? (
                      product.product_description.split('\r\n\r\n').map((paragraph, index) => (
                        <p key={index} className={cn.description_paragraph}>
                          {paragraph}
                        </p>
                      ))
                    ) : (
                      <p>{t("product.empty.description")}</p>
                    )}
                  </div>
                ) : activeTab === 'characteristics' ? (
                  <div className={cn.specifications_section}>
                    {(() => {
                      // Проверяем наличие характеристик у выбранного варианта
                      const hasSpecs = selectedVariant && selectedVariant.attribute_values && selectedVariant.attribute_values.length > 0;
                      
                      if (!hasSpecs || !selectedVariant) {
                        return <p>{t("product.empty.specs")}</p>;
                      }

                      // Отображаем список характеристик
                      const validSpecs = selectedVariant.attribute_values
                        .map((attrValue) => {
                          // Ищем атрибут по attribute_id или attribute_name
                          const attrId = attrValue.attribute_id || (attrValue as any).attribute_name;
                          const attribute = product.attributes.find(attr => 
                            attr.id === attrId || attr.name === attrId || attr.name === (attrValue as any).attribute_name
                          );
                          if (!attribute) return null;
                          
                          return {
                            id: attrValue.id,
                            name: attribute.name,
                            value: attrValue.value,
                            unit: attribute.unit
                          };
                        })
                        .filter((spec): spec is { id: string; name: string; value: string; unit: string } => spec !== null);

                      if (validSpecs.length === 0) {
                        return <p>{t("product.empty.specs")}</p>;
                      }

                      return (
                        <div className={cn.specifications_list}>
                          {validSpecs.map((spec) => (
                            <div key={spec.id} className={cn.specification_item}>
                              <span className={cn.spec_name}>{spec.name}:</span>
                              <span className={cn.spec_value}>
                                {spec.value} {spec.unit && spec.unit.trim()}
                              </span>
                            </div>
                          ))}
                        </div>
                      );
                    })()}
                  </div>
                ) : (
                  <div className={cn.comments_section}>
                    {comments.length === 0 ? (
                      <p className={cn.comments_empty}>{t("product.empty.comments")}</p>
                    ) : (
                      <div className={cn.specifications_list}>
                        {comments.map((c) => (
                          <div key={c.id} className={cn.specification_item}>
                            <div>
                              <strong>{c.author}</strong>
                              <div className={cn.muted} style={{ fontSize: 12 }}>{new Date(c.createdAt).toLocaleString('ru-RU')}</div>
                            </div>
                            <div style={{ maxWidth: 640 }}>{c.text}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Недавно просмотренные */}
            <section className={cn.recently_viewed_section}>
              <h3 className={cn.section_title}>{t("product.sections.recentlyViewed")}</h3>
              <div className={cn.products_grid}>
                {recentlyViewed && recentlyViewed.length > 0 ? (
                  recentlyViewed.map((p) => {
                    // Создаем уникальный ключ на основе product_id и variant_id
                    const uniqueKey = p.variant_id 
                      ? `${p.product_id}_${p.variant_id}` 
                      : p.product_id;
                    return (
                      <ProductCard key={uniqueKey} product={p} />
                    );
                  })
                ) : (
                  <div className={cn.placeholder_card}>
                    <div className={cn.placeholder_image}></div>
                    <div className={cn.placeholder_content}>
                      <div className={cn.placeholder_title}></div>
                      <div className={cn.placeholder_price}></div>
                    </div>
                  </div>
                )}
              </div>
            </section>

            {/* Рекомендации */}
            <section className={cn.recommendations_section}>
              <h3 className={cn.section_title}>{t("product.sections.recommendations")}</h3>
              <div className={cn.products_grid}>
                {/* Здесь будут карточки рекомендуемых товаров */}
                <div className={cn.placeholder_card}>
                  <div className={cn.placeholder_image}></div>
                  <div className={cn.placeholder_content}>
                    <div className={cn.placeholder_title}></div>
                    <div className={cn.placeholder_price}></div>
                  </div>
                </div>
                <div className={cn.placeholder_card}>
                  <div className={cn.placeholder_image}></div>
                  <div className={cn.placeholder_content}>
                    <div className={cn.placeholder_title}></div>
                    <div className={cn.placeholder_price}></div>
                  </div>
                </div>
                <div className={cn.placeholder_card}>
                  <div className={cn.placeholder_image}></div>
                  <div className={cn.placeholder_content}>
                    <div className={cn.placeholder_title}></div>
                    <div className={cn.placeholder_price}></div>
                  </div>
                </div>
                <div className={cn.placeholder_card}>
                  <div className={cn.placeholder_image}></div>
                  <div className={cn.placeholder_content}>
                    <div className={cn.placeholder_title}></div>
                    <div className={cn.placeholder_price}></div>
                  </div>
                </div>
              </div>
            </section>
          </div>
        )}
      </div>

      {product && (
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
          feedback={quickOrderFeedback}
          onSubmit={handleQuickOrderSubmit}
          locationLabel={locationLabel}
          locationHint={locationHint}
        />
      )}

      {canBuy && (
        <div
          className="md:hidden fixed inset-x-0 z-40 flex gap-2 px-4"
          style={{ bottom: "73px" }}
        >
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
              <span className="text-sm font-bold text-[#04734b] min-w-[30px] text-center">
                {cartQuantity}
              </span>
              <button
                type="button"
                onClick={handleIncreaseQuantity}
                disabled={cartQuantity >= maxStock}
                className={`h-9 w-9 rounded-xl bg-white/80 text-lg font-semibold text-[#04734b] transition ${
                  cartQuantity >= maxStock ? 'opacity-50' : 'active:scale-95'
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

      {/* Модалка "Скоро заработает" */}
      {showComingSoonModal && (
        <div 
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
          onClick={() => setShowComingSoonModal(false)}
        >
          <div 
            className="relative w-full max-w-sm bg-white rounded-3xl shadow-2xl p-6 text-center animate-[fadeInScale_0.2s_ease-out]"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setShowComingSoonModal(false)}
              className="absolute top-4 right-4 h-8 w-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 transition"
            >
              ×
            </button>
            <div className="mb-4">
              <div className="mx-auto h-20 w-20 rounded-full bg-gradient-to-br from-[#e6f4ef] to-[#d0ebe0] flex items-center justify-center">
                <span className="text-4xl">🚀</span>
              </div>
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-2">Скоро заработает!</h3>
            <p className="text-slate-500 text-sm mb-6">
              Оформление рассрочки находится в разработке. Мы работаем над этим и скоро всё будет готово!
            </p>
            <button
              type="button"
              onClick={() => setShowComingSoonModal(false)}
              className="w-full h-12 rounded-2xl text-white font-semibold transition hover:brightness-110"
              style={{ background: "linear-gradient(92.41deg, #003d32, #04734b)" }}
            >
              Понятно
            </button>
          </div>
        </div>
      )}

      {/* Лайтбокс */}
      {lightboxOpen && (
        <div className={cn.lightbox_overlay} onWheel={onLightboxWheel} onClick={(e) => {
          if (e.target === e.currentTarget) closeLightbox();
        }}>
          <div className={cn.lightbox_container}>
            <button className={`${cn.lightbox_btn} ${cn.lightbox_close}`} onClick={closeLightbox} aria-label={t("product.lightbox.close")}>×</button>
            <button className={`${cn.lightbox_btn} ${cn.lightbox_prev}`} onClick={(e)=>{ e.stopPropagation(); prevImage(); }} aria-label={t("product.lightbox.prev")}>‹</button>
            <button className={`${cn.lightbox_btn} ${cn.lightbox_next}`} onClick={(e)=>{ e.stopPropagation(); nextImage(); }} aria-label={t("product.lightbox.next")}>›</button>
            <div className={cn.lightbox_image_wrapper}>
              <img
                src={galleryImages[lightboxIndex] || getProductImageUrl(product?.main_image || '')}
                alt={t("product.lightbox.view")}
                className={cn.lightbox_image}
                style={{ transform: `scale(${lightboxZoom})` }}
                onClick={(e)=> e.stopPropagation()}
              />
            </div>
            <div className={cn.lightbox_zoom}>
              <button className={cn.zoom_btn} onClick={(e)=>{ e.stopPropagation(); zoomOut(); }} aria-label={t("product.lightbox.zoomOut")}>−</button>
              <button className={cn.zoom_btn} onClick={(e)=>{ e.stopPropagation(); zoomIn(); }} aria-label={t("product.lightbox.zoomIn")}>+</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
export default Product;
