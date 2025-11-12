import React, { useEffect, useMemo, useState, useRef } from "react";
import { useLocation, useParams } from "react-router-dom";
// @ts-ignore – модуль стилей объявлен через d.ts
import cn from "./style.module.scss";
import { formatPrice, getProductImageUrl, storage, getVariantMainImage } from "../utils/helpers";
import { Product as ProductType, ProductDetail } from "../types";
import { shopAPI } from "../services/api";
import { uzbekistanLocations } from "../data/uzbekistanLocations";
import { useApp } from "../context/AppContext";
import ProductCard from "../components/ui/ProductCard";
import PhoneInput from "../components/forms/PhoneInput";
import OrderDialog from "../components/OrderDialog";
import useSEO from "../hooks/useSEO";
import ProductPageSkeleton from "../components/ProductPageSkeleton";

type LocationState = { product?: ProductType };

// Функция для загрузки всех вариантов товара (использует новый API /api/v1/shop/product/{product_id})
async function fetchAllProductVariants(productId: string): Promise<ProductDetail | null> {
  try {
    logger.debug("Loading product", { productId });
    
    // Используем новый API /api/v1/shop/product/{product_id}
    const response = await shopAPI.getProductById(productId);
    logger.debug("Product API response", { productId, hasData: !!response.data });
    
    const productData = response.data;
    
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
  const [comments, setComments] = useState<Array<{ id: string; author: string; text: string; createdAt: string }>>([]);
  const [phone, setPhone] = useState<string>("");
  const [name, setName] = useState<string>("");
  const [orderOpen, setOrderOpen] = useState<boolean>(false);
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
    if (!product) return;
    const canBuy = selectedVariant ? (selectedVariant.stock > 0 && selectedVariant.price !== null) : (product.price !== null && product.stock > 0);
    if (!canBuy) return;
    const item = {
      id: (selectedVariant?.id || product.variant_id),
      name: product.product_name,
      refferal_price: product.refferal_price || 0,
      base_price: (selectedVariant?.base_price ?? selectedVariant?.price ?? product.price ?? 0),
      referral_code: referralCode || undefined,
    };
    addToCart(item, 1);
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

  // Функция для получения названия атрибута по ID
  const getAttributeName = (attributeId: string) => {
    const attribute = product?.attributes.find(a => a.id === attributeId || a.name === attributeId);
    return attribute?.name || '';
  };

  // Функция для выбора варианта по комбинации атрибутов
  const selectVariantByAttributes = (selectedAttributes: Record<string, string>) => {
    if (!product) return;

    // Находим вариант, который соответствует всем выбранным атрибутам
    const matchingVariant = product.variants.find(variant => {
      return Object.entries(selectedAttributes).every(([attributeId, value]) => {
        const variantValue = getAttributeValue(variant, attributeId);
        return variantValue === value;
      });
    });

    if (matchingVariant) {
      setSelectedVariant(matchingVariant);
      // Сбрасываем индекс лайтбокса на 0 при изменении варианта
      setLightboxIndex(0);
    }
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

    return (
      <div ref={productRef} className={cn.product}>
      <div className="container">
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
                <h1 className={cn.product_title}>{product.product_name}</h1>
              <div className={cn.rating_row}>
                <img src="/icons/star.png" alt="" aria-hidden="true" />
                <strong>4.9</strong>
                <span className={cn.muted}>18 503 оценки</span>
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
                  <div className={cn.variants_section}>
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

            </section>
            <aside className={cn.aside}>
              <div className={cn.buy_card}>
                <div className={cn.price_row}>
                  <span className={cn.price_icon} aria-hidden="true" />
                  <div className={cn.price_value}>
                    {selectedVariant?.price ? 
                      formatPrice(selectedVariant.price) : 
                      product.price ? 
                        formatPrice(product.price) : 
                        'Цена не указана'
                    } 
                  </div>
                  {selectedVariant && selectedVariant.price && selectedVariant.base_price && selectedVariant.price !== selectedVariant.base_price && (
                    <div className={cn.original_price}>
                      {formatPrice(selectedVariant.base_price)}
                    </div>
                  )}
                </div>
                <div className={cn.delivery_hint}>
                  Yetkazib berish narxi: 30 000
                </div>
                <div className={cn.stock_info}>
                  {selectedVariant ? (
                    selectedVariant.stock > 0 ? (
                      <span className={cn.in_stock}>В наличии: {selectedVariant.stock} шт.</span>
                    ) : (
                      <span className={cn.out_of_stock}>Нет в наличии</span>
                    )
                  ) : (
                    product.stock > 0 ? (
                      <span className={cn.in_stock}>В наличии: {product.stock} шт.</span>
                    ) : (
                      <span className={cn.out_of_stock}>Нет в наличии</span>
                    )
                  )}
                </div>
                <form className={cn.buy_form} onSubmit={(e)=>{e.preventDefault(); setOrderOpen(true);}}>
                  <input className={cn.input} placeholder="Ismingiz" value={name} onChange={(e)=>setName(e.target.value)} />
                  <PhoneInput 
                    className={cn.input}
                    placeholder="Telefon raqamingiz"
                    value={phone}
                    onChange={setPhone}
                    required
                  />
                  <button 
                    type="submit" 
                    className={cn.primary_btn}
                    disabled={selectedVariant?.stock === 0 || selectedVariant?.price === null}
                  >
                    {selectedVariant?.stock === 0 ? 'Нет в наличии' : 
                     selectedVariant?.price === null ? 'Цена не указана' : 
                     'Buyurtma berish'}
                  </button>
                </form>
                {product && (
                  <OrderDialog
                    open={orderOpen}
                    onClose={() => setOrderOpen(false)}
                    product={product}
                    variant={selectedVariant}
                    deliveryPrice={product.refferal_price}
                    onBuyNow={async (qty, extra)=>{
                      const variantId = selectedVariant?.id || product.variant_id;
                      const cityCode = toCityCode(extra?.city || appState.location.data?.city);
                      const payload = {
                        items: [
                          {
                            variant_id: variantId,
                            quantity: qty,
                            referral_code: referralCode || undefined,
                          }
                        ],
                        guest_user_number: phone || "",
                        full_name: name || "",
                        city: cityCode,
                        order_region: getRegionForCityOrRegion(cityCode),
                        order_comment: extra?.comment || "",
                      } as any;
                      try {
                        await shopAPI.guestOrder(payload);
                      } catch (e) {
                        logger.errorWithContext(e, { context: 'createGuestOrder' });
                      }
                    }}
                    onAddToCart={(qty)=>{
                      const price = selectedVariant?.price ?? product.price ?? 0;
                      addToCart({
                        id: selectedVariant?.id || product.variant_id,
                        name: product.product_name,
                        refferal_price: product.refferal_price || 0,
                        base_price: price,
                        referral_code: referralCode || undefined,
                      }, qty);
                    }}
                  />
                )}
              </div>
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
