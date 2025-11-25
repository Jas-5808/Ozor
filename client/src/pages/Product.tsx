import React, { useEffect, useMemo, useState, useRef, FormEvent } from "react";
import { useLocation, useParams } from "react-router-dom";
// @ts-ignore – модуль стилей объявлен через d.ts
import cn from "./style.module.scss";
import { formatPrice, getProductImageUrl, storage } from "../utils/helpers";
import { Product as ProductType, ProductDetail } from "../types";
import { shopAPI } from "../services/api";
import { uzbekistanLocations } from "../data/uzbekistanLocations";
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
            <p className="text-xs uppercase tracking-wide text-gray-400">Быстрый заказ</p>
            <h3 className="text-lg font-semibold text-gray-900">Оформление товара</h3>
          </div>
          <button
            type="button"
            aria-label="Закрыть"
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
                <span className="mt-1 text-xs text-gray-400">Код: {sku}</span>
                <div className="mt-2 flex items-center gap-2">
                  <span className="text-base font-bold text-gray-900">{formatPrice(price)}</span>
                  <span className={`text-sm font-medium ${inStock ? 'text-emerald-600' : 'text-rose-500'}`}>
                    {inStock ? 'В наличии' : 'Нет в наличии'}
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
              <p className="text-xs uppercase tracking-wide text-gray-400">Доставка</p>
              <p className="text-sm font-medium text-gray-900">{locationLabel}</p>
              {locationHint && <p className="text-xs text-gray-500">{locationHint}</p>}
            </div>
          </div>

          <form className="mt-5 flex flex-col gap-4" onSubmit={onSubmit}>
            <div>
              <label className="text-sm font-medium text-gray-700" htmlFor="quick-order-name">
                Имя
              </label>
              <input
                id="quick-order-name"
                type="text"
                value={name}
                onChange={(e) => onNameChange(e.target.value)}
                className="mt-1 h-12 w-full rounded-2xl border border-gray-200 px-4 text-base outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                placeholder="Как к вам обращаться"
                autoComplete="name"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700" htmlFor="quick-order-phone">
                Телефон
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
                Я согласен с условиями{" "}
                <a href="/terms" className="text-emerald-600 hover:underline">
                  пользовательского соглашения
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
              className="h-12 rounded-2xl bg-[#ff3b30] text-base font-semibold text-white shadow-lg transition hover:bg-[#ff2417] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Отправляем..." : "Заказать"}
            </button>
            <p className="text-center text-xs text-gray-500">
              Мы свяжемся с вами в течение 10 минут для подтверждения заказа
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
  const referralCode = useMemo(()=> new URLSearchParams(location.search).get('ref') || '', [location.search]);
  const routeState = (location.state ?? {}) as LocationState;
  const [fetchedProduct, setFetchedProduct] = useState<ProductDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedVariant, setSelectedVariant] = useState<ProductDetail['variants'][0] | null>(null);
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
  const productRef = useRef<HTMLDivElement>(null);
  
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
  const { addToCart, state: appState } = useApp();
  const locationLabel =
    appState.location.data?.address ||
    appState.location.data?.city ||
    "Местоположение не выбрано";
  const locationHint = appState.location.data?.city
    ? `Город доставки: ${appState.location.data.city}`
    : "Укажите город, чтобы увидеть точные условия доставки";

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
              setError(`Ошибка: загружен продукт с другим ID (запрошено: ${id}, получено: ${p.product_id})`);
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
            setError("Продукт не найден");
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
    const item = {
      id: (selectedVariant?.id || product.variant_id),
      name: product.product_name,
      refferal_price: product.refferal_price || 0,
      base_price: cartPrice,
      original_price: hasDiscount ? basePrice : null,
      referral_code: referralCode || undefined,
      image: cartImage,
      attributes: selectedAttributesList.length ? selectedAttributesList : undefined,
    };
    addToCart(item, 1);
  };

  const canBuy =
    selectedVariant
      ? selectedVariant.stock > 0 && selectedVariant.price !== null
      : product?.price !== null && (product?.stock ?? 0) > 0;

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
      setQuickOrderError("Товар сейчас недоступен для заказа");
      return;
    }
    if (!name.trim()) {
      setQuickOrderError("Введите ваше имя");
      return;
    }
    if (!phone || phone.trim().length < 8) {
      setQuickOrderError("Введите корректный номер телефона");
      return;
    }
    if (!agreeTerms) {
      setQuickOrderError("Необходимо согласиться с условиями");
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
      setQuickOrderFeedback("Заявка отправлена! Мы свяжемся с вами в ближайшее время.");
      setName("");
      setPhone("");
      setTimeout(() => {
        setIsQuickOrderOpen(false);
        setQuickOrderFeedback(null);
      }, 1800);
    } catch (err) {
      logger.errorWithContext(err, { context: "quickOrder" });
      setQuickOrderError("Не удалось отправить заказ. Попробуйте позже.");
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
          <h2 className={cn.error_title}>Ошибка загрузки</h2>
          <p className={cn.error_message}>{error}</p>
          <button 
            className={cn.retry_button}
            onClick={() => window.location.reload()}
          >
            Попробовать снова
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
          <h2 className={cn.not_found_title}>Товар не найден</h2>
          <p className={cn.not_found_message}>
            Товар {id ? `#${id}` : ""} не существует или был удален
          </p>
          <button 
            className={cn.back_button}
            onClick={() => window.history.back()}
          >
            Вернуться назад
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
                      aria-label={`Превью ${i + 1}`}
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
                          {isAvailable ? 'В наличии' : 'Нет в наличии'}
                        </span>
                        {sku && (
                          <span className="text-xs font-medium text-gray-500">
                            Код: {sku}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                      <div className="flex items-center gap-3">
                        <p className="text-[28px] font-semibold leading-tight text-[#04734b] sm:text-[32px]">
                          {currentPrice ? formatPrice(currentPrice) : 'Цена не указана'}
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
                          <p className="text-sm font-medium text-[#04734b]/80">сум / шт.</p>
                          <p className="text-xs font-medium text-gray-500">
                            Доставка по Узбекистану: <span className="text-[#04734b] font-semibold">30 000 сум</span>
                          </p>
                        </>
                      ) : null}
                    </div>
                    <div className={`${cn.rating_row} mt-1 sm:mt-0`}>
                      <img src="/icons/star.png" alt="" aria-hidden="true" />
                      <strong>4.9</strong>
                      <span className={cn.muted}>18 503 оценки</span>
                    </div>
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
              </div>
            </section>
            <aside className={cn.aside}>

              <div className={cn.seller_card}>
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
              </div>
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
                  Описание
                </button>
                <button
                  className={`${cn.tab} ${activeTab === 'characteristics' ? cn.tab_active : ''}`}
                  onClick={() => setActiveTab('characteristics')}
                  type="button"
                >
                  Характеристики
                </button>
                <button
                  className={`${cn.tab} ${activeTab === 'comments' ? cn.tab_active : ''}`}
                  onClick={() => setActiveTab('comments')}
                  type="button"
                >
                  Комментарии
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
                      <p>Описание недоступно.</p>
                    )}
                  </div>
                ) : activeTab === 'characteristics' ? (
                  <div className={cn.specifications_section}>
                    {(() => {
                      // Проверяем наличие характеристик у выбранного варианта
                      const hasSpecs = selectedVariant && selectedVariant.attribute_values && selectedVariant.attribute_values.length > 0;
                      
                      if (!hasSpecs || !selectedVariant) {
                        return <p>Характеристики недоступны.</p>;
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
                        return <p>Характеристики недоступны.</p>;
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
                      <p className={cn.comments_empty}>Пока нет комментариев. Оставить комментарий можно после покупки товара.</p>
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
              <h3 className={cn.section_title}>Недавно просмотренные</h3>
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
              <h3 className={cn.section_title}>Рекомендуем также</h3>
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
          style={{ bottom: "88px" }}
        >
          <button
            type="button"
            onClick={openQuickOrder}
            className="flex-1 rounded-2xl py-3 text-sm font-semibold text-white shadow-lg transition active:scale-[0.99]"
            style={{ background: "linear-gradient(92.41deg, #003d32, #04734b)" }}
          >
            Купить в 1 клик
          </button>
          <button
            type="button"
            onClick={handleAddToCart}
            className="flex-1 rounded-2xl border border-white/40 bg-white/90 py-3 text-sm font-semibold text-[#04734b] shadow-md backdrop-blur-lg transition active:scale-[0.99]"
          >
            В корзину
          </button>
        </div>
      )}

      {/* Лайтбокс */}
      {lightboxOpen && (
        <div className={cn.lightbox_overlay} onWheel={onLightboxWheel} onClick={(e) => {
          if (e.target === e.currentTarget) closeLightbox();
        }}>
          <div className={cn.lightbox_container}>
            <button className={`${cn.lightbox_btn} ${cn.lightbox_close}`} onClick={closeLightbox} aria-label="Закрыть">×</button>
            <button className={`${cn.lightbox_btn} ${cn.lightbox_prev}`} onClick={(e)=>{ e.stopPropagation(); prevImage(); }} aria-label="Предыдущее">‹</button>
            <button className={`${cn.lightbox_btn} ${cn.lightbox_next}`} onClick={(e)=>{ e.stopPropagation(); nextImage(); }} aria-label="Следующее">›</button>
            <div className={cn.lightbox_image_wrapper}>
              <img
                src={galleryImages[lightboxIndex] || getProductImageUrl(product?.main_image || '')}
                alt="Просмотр"
                className={cn.lightbox_image}
                style={{ transform: `scale(${lightboxZoom})` }}
                onClick={(e)=> e.stopPropagation()}
              />
            </div>
            <div className={cn.lightbox_zoom}>
              <button className={cn.zoom_btn} onClick={(e)=>{ e.stopPropagation(); zoomOut(); }} aria-label="Уменьшить">−</button>
              <button className={cn.zoom_btn} onClick={(e)=>{ e.stopPropagation(); zoomIn(); }} aria-label="Увеличить">+</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
export default Product;
