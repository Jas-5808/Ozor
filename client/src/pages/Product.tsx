import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useParams } from "react-router-dom";
// @ts-ignore – модуль стилей объявлен через d.ts
import cn from "./style.module.scss";
import { formatPrice, getProductImageUrl, storage, getVariantMainImage } from "../utils/helpers";
import { Product as ProductType, ProductDetail } from "../types";
import { shopAPI } from "../services/api";
import { uzbekistanLocations } from "../data/uzbekistanLocations";
import { useApp } from "../context/AppContext";
import ProductCard from "../components/ProductCard";
import PhoneInput from "../components/PhoneInput";
import OrderDialog from "../components/OrderDialog";

type LocationState = { product?: ProductType };

// Функция для загрузки всех вариантов товара (учитывает новую структуру API)
async function fetchAllProductVariants(productId: string): Promise<ProductDetail | null> {
  try {
    console.log("Загружаем все варианты товара с ID:", productId);
    
    // Загружаем все варианты товара
    const response = await shopAPI.getAllProductVariants(productId);
    console.log("Ответ API (все варианты):", response.data);
    
    if (!response.data || response.data.length === 0) {
      return null;
    }

    // Берем первый вариант как базовый для получения общей информации
    const firstVariant = response.data[0];

    // Собираем все уникальные атрибуты по attribute_name (новый формат)
    const allAttributes = new Map<string, { id: string; name: string; unit: string }>();
    const allVariants: any[] = [];

    response.data.forEach((variant: any) => {
      const attrs = (variant.variant_attributes || []) as any[];
      attrs.forEach((attr) => {
        const key = attr.attribute_name || attr.attribute_id || attr.id || 'unknown';
        if (!allAttributes.has(key)) {
          allAttributes.set(key, {
            id: key,
            name: key,
            unit: ''
          });
        }
      });

      allVariants.push({
        id: variant.variant_id,
        product_id: variant.product_id,
        sku: variant.variant_sku,
        price: variant.price,
        base_price: variant.price ?? null,
        stock: variant.stock,
        attribute_values: (variant.variant_attributes || []).map((av: any) => ({
          id: av.id,
          variant_id: av.variant_id,
          attribute_id: (av.attribute_name || av.attribute_id),
          attribute_name: av.attribute_name,
          value: av.value,
        })),
        variant_media: variant.variant_media || [],
      });
    });

    const productDetail: ProductDetail = {
      product_id: firstVariant.product_id,
      product_name: firstVariant.product_name,
      product_description: firstVariant.product_description,
      category: firstVariant.category,
      refferal_price: firstVariant.refferal_price,
      main_image: firstVariant.main_image,
      variant_id: firstVariant.variant_id,
      variant_sku: firstVariant.variant_sku,
      price: firstVariant.price,
      stock: firstVariant.stock,
      variant_attributes: firstVariant.variant_attributes,
      attributes: Array.from(allAttributes.values()),
      variants: allVariants,
    };

    return productDetail;
  } catch (error) {
    console.error("Ошибка при загрузке вариантов товара:", error);
    throw error;
  }
}
export function Product() {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const routeState = (location.state ?? {}) as LocationState;
  const [fetchedProduct, setFetchedProduct] = useState<ProductDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedVariant, setSelectedVariant] = useState<ProductDetail['variants'][0] | null>(null);
  const [recentlyViewed, setRecentlyViewed] = useState<ProductType[]>([]);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [lightboxZoom, setLightboxZoom] = useState(1);
  const [activeTab, setActiveTab] = useState<'description' | 'comments'>('description');
  const [comments, setComments] = useState<Array<{ id: string; author: string; text: string; createdAt: string }>>([]);
  const [phone, setPhone] = useState<string>("");
  const [name, setName] = useState<string>("");
  const [orderOpen, setOrderOpen] = useState<boolean>(false);
  
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
    console.log("useEffect вызван с:", { id, productFromState });
    if (id) {
      console.log("Начинаем загрузку всех вариантов продукта...");
      setLoading(true);
      setError(null);
      fetchAllProductVariants(id)
        .then((p) => { 
          console.log("Продукт загружен:", p);
          if (!ignore) {
            setFetchedProduct(p);
            // Автоматически выбираем первый доступный вариант
            if (p?.variants && p.variants.length > 0) {
              // Сначала ищем вариант с ценой и в наличии
              const availableVariant = p.variants.find(v => v.stock > 0 && v.price !== null) || 
                                     p.variants.find(v => v.price !== null) || 
                                     p.variants[0];
              console.log("Выбран вариант:", availableVariant);
              setSelectedVariant(availableVariant);
            }
          }
        })
        .catch((e) => { 
          console.error("Ошибка в useEffect:", e);
          if (!ignore) setError(e instanceof Error ? e.message : "Ошибка загрузки"); 
        })
        .finally(() => { if (!ignore) setLoading(false); });
    }
    return () => { ignore = true; };
  }, [id]);

  // Сбор изображений для галереи/лайтбокса
  const galleryImages: string[] = useMemo(() => {
    const fromMedia = getVariantMainImage((selectedVariant as any)?.variant_media ? (selectedVariant as any).variant_media : (product as any)?.variant_media) || null;
    const mediaImages = ((selectedVariant as any)?.variant_media || (product as any)?.variant_media || [])
      .map((m: any) => m?.file)
      .filter(Boolean)
      .map((f: string) => getProductImageUrl(f));
    const attrImages = selectedVariant?.attribute_values?.filter((av) => (av as any).image)?.map((av) => getProductImageUrl((av as any).image)) || [];
    const main = product ? getProductImageUrl(product.main_image) : null;
    const images = Array.from(new Set([fromMedia, ...mediaImages, ...attrImages, main].filter(Boolean)));
    return images as string[];
  }, [selectedVariant, product]);

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
      setRecentlyViewed(deduped.filter((p) => p.product_id !== product.product_id).slice(0, 8));
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
    };
    addToCart(item, 1);
  };

  // Функция для получения значения атрибута по ID
  const getAttributeValue = (variant: ProductDetail['variants'][0], attributeId: string) => {
    const attributeValue = variant.attribute_values.find(av => (av.attribute_id === attributeId) || (av as any).attribute_name === attributeId);
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
    }
  };

  // Функция для обработки выбора атрибута
  const handleAttributeSelect = (attributeId: string, value: string) => {
    if (!selectedVariant) return;

    // Создаем новую комбинацию атрибутов
    const newAttributes = { ...getCurrentAttributeValues() };
    newAttributes[attributeId] = value;

    // Ищем подходящий вариант
    selectVariantByAttributes(newAttributes);
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
  // Полноэкранная загрузка
  if (loading) {
    return (
      <div className={cn.fullscreen_loading}>
        <div className={cn.loading_container}>
          <div className={cn.loading_spinner}></div>
          <h2 className={cn.loading_title}>Загрузка товара</h2>
          <p className={cn.loading_subtitle}>Пожалуйста, подождите...</p>
        </div>
      </div>
    );
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
    <div className={cn.product}>
      <div className="container">
        {product && (
          <div className={cn.product_content}>
            <section className={cn.product_gallery}>
              <div className={cn.gallery_thumbs}>
                {galleryImages.map((img, i) => (
                  <button
                    key={i}
                    className={`${cn.thumb} ${i === lightboxIndex ? 'active' : ''}`}
                    type="button"
                    aria-label={`Превью ${i + 1}`}
                    onClick={() => openLightbox(i)}
                  >
                    <img src={img} alt="" />
                  </button>
                ))}
              </div>
              <div className={cn.gallery_main}>
                <img 
                  src={galleryImages[lightboxIndex] || getProductImageUrl(product.main_image)} 
                  alt={product.product_name} 
                  className={cn.main_image}
                  onClick={() => openLightbox(lightboxIndex)}
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
              
              {/* Отображение вариантов продукта */}
              {product.variants && product.variants.length > 0 && (
                <div className={cn.variants_section}>
                  {product.attributes.map((attribute) => (
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
                            if (value && !uniqueValues.has(value)) {
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

                          return Array.from(uniqueValues.entries()).map(([value, variant]) => (
                            <button
                              key={`${attribute.id}-${value}`}
                              className={`${cn.attribute_value} ${
                                selectedVariant && getAttributeValue(selectedVariant, attribute.id) === value 
                                  ? cn.selected 
                                  : ''
                              }`}
                              onClick={() => handleAttributeSelect(attribute.id, value)}
                              disabled={!variant || variant.stock === 0 || variant.price === null}
                            >
                              {value}
                              {variant && variant.stock === 0 && <span className={cn.out_of_stock}>Нет в наличии</span>}
                              {variant && variant.price === null && <span className={cn.out_of_stock}>Цена не указана</span>}
                            </button>
                          ));
                        })()}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Блок характеристик */}
              <div className={cn.specifications_section}>
                <h3 className={cn.block_title}>Характеристики</h3>
                <div className={cn.specifications_list}>
                  {selectedVariant && selectedVariant.attribute_values.map((attrValue) => {
                    const attribute = product.attributes.find(attr => attr.id === attrValue.attribute_id);
                    if (!attribute) return null;
                    
                    return (
                      <div key={attrValue.id} className={cn.specification_item}>
                        <span className={cn.spec_name}>{attribute.name}:</span>
                        <span className={cn.spec_value}>
                          {attrValue.value} {attribute.unit}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
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
                    } so`m
                  </div>
                  {selectedVariant && selectedVariant.price && selectedVariant.base_price && selectedVariant.price !== selectedVariant.base_price && (
                    <div className={cn.original_price}>
                      {formatPrice(selectedVariant.base_price)} so`m
                    </div>
                  )}
                </div>
                <div className={cn.delivery_hint}>
                  Yetkazib berish narxi: 30 000 so`m
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
                        console.error('Failed to create guest order', e);
                      }
                    }}
                    onAddToCart={(qty)=>{
                      const price = selectedVariant?.price ?? product.price ?? 0;
                      addToCart({
                        id: selectedVariant?.id || product.variant_id,
                        name: product.product_name,
                        refferal_price: product.refferal_price || 0,
                        base_price: price,
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
            {/* Табы: Описание / Комментарии */}
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
                  recentlyViewed.map((p) => (
                    <ProductCard key={p.product_id} product={p} />
                  ))
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
