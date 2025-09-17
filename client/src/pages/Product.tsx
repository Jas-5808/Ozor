import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useParams } from "react-router-dom";
import cn from "./style.module.scss";
import { formatPrice, getProductImageUrl } from "../utils/helpers";
import { Product as ProductType, ProductDetail } from "../types";
import { shopAPI } from "../services/api";

type LocationState = { product?: ProductType };

// Функция для загрузки всех вариантов товара
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
    
    // Собираем все уникальные атрибуты
    const allAttributes = new Map();
    const allVariants: any[] = [];
    
    response.data.forEach((variant: any) => {
      // Собираем атрибуты
      variant.variant_attributes.forEach((attr: any) => {
        if (!allAttributes.has(attr.attribute_id)) {
          allAttributes.set(attr.attribute_id, {
            id: attr.attribute_id,
            name: attr.attribute_id === 'f73925aa-e38b-4ce9-949b-ce1815aafdfb' ? 'memory' :
                  attr.attribute_id === '617912e3-3888-40e9-a4f2-90289262e837' ? 'ram' :
                  attr.attribute_id === '4d85c888-6673-409c-8beb-c573b4dbe0a2' ? 'color' :
                  attr.attribute_id === '7754bc21-05b3-46f5-9fcc-d0835d88cfaf' ? 'color' : 'unknown',
            unit: attr.attribute_id === 'f73925aa-e38b-4ce9-949b-ce1815aafdfb' ? 'ГБ' :
                  attr.attribute_id === '617912e3-3888-40e9-a4f2-90289262e837' ? 'ГБ' : ''
          });
        }
      });
      
      // Создаем вариант в нужном формате
      allVariants.push({
        id: variant.variant_id,
        product_id: variant.product_id,
        sku: variant.variant_sku,
        price: variant.price,
        base_price: variant.price, // Используем price как base_price
        stock: variant.stock,
        attribute_values: variant.variant_attributes
      });
    });

    // Формируем ProductDetail
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
      variants: allVariants
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
  const state = (location.state ?? {}) as LocationState;
  const [fetchedProduct, setFetchedProduct] = useState<ProductDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedVariant, setSelectedVariant] = useState<ProductDetail['variants'][0] | null>(null);
  
  const productFromState = state?.product;
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

  // Функция для получения значения атрибута по ID
  const getAttributeValue = (variant: ProductDetail['variants'][0], attributeId: string) => {
    const attributeValue = variant.attribute_values.find(av => av.attribute_id === attributeId);
    return attributeValue?.value || '';
  };

  // Функция для получения названия атрибута по ID
  const getAttributeName = (attributeId: string) => {
    const attribute = product?.attributes.find(a => a.id === attributeId);
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
                {/* Показываем все изображения вариантов */}
                {selectedVariant?.attribute_values
                  .filter(av => av.image)
                  .map((av, i) => (
                    <button key={i} className={cn.thumb} type="button" aria-label={`Превью ${i+1}`}>
                      <img src={getProductImageUrl(av.image)} alt="" />
                    </button>
                  ))}
                {/* Добавляем основное изображение если нужно */}
                {(!selectedVariant?.attribute_values.some(av => av.image) || selectedVariant.attribute_values.filter(av => av.image).length < 5) && 
                  [0,1,2,3,4].slice(0, 5 - (selectedVariant?.attribute_values.filter(av => av.image).length || 0)).map((i) => (
                    <button key={`main-${i}`} className={cn.thumb} type="button" aria-label={`Превью ${i+1}`}>
                      <img src={getProductImageUrl(product.main_image)} alt="" />
                    </button>
                  ))
                }
              </div>
              <div className={cn.gallery_main}>
                <img 
                  src={getProductImageUrl(
                    selectedVariant?.attribute_values.find(av => av.image)?.image || product.main_image
                  )} 
                  alt={product.product_name} 
                  className={cn.main_image}
                  onClick={() => {
                    // Здесь будет открытие модального окна для просмотра изображения
                    console.log('Открыть просмотр изображения');
                  }}
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
                  Yetkazib berish narxi: <strong>{formatPrice(product.refferal_price)}</strong> so`m
                </div>
                <div className={cn.stock_info}>
                  {selectedVariant ? (
                    selectedVariant.stock > 0 ? (
                      <span className={cn.in_stock}>В наличии: {selectedVariant.stock} шт.</span>
                    ) : (
                      <span className={cn.out_of_stock}>Нет в наличии</span>
                    )
                  ) : (
                    <span className={cn.in_stock}>В наличии</span>
                  )}
                </div>
                <form className={cn.buy_form} onSubmit={(e)=>e.preventDefault()}>
                  <input className={cn.input} placeholder="Ismingiz" />
                  <input className={cn.input} placeholder="Telefon raqamingiz" />
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
            {/* Описание */}
            <section className={cn.description_section}>
              <h3 className={cn.section_title}>Описание</h3>
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
            </section>

            {/* Недавно просмотренные */}
            <section className={cn.recently_viewed_section}>
              <h3 className={cn.section_title}>Недавно просмотренные</h3>
              <div className={cn.products_grid}>
                {/* Здесь будут карточки недавно просмотренных товаров */}
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
    </div>
  );
}
export default Product;
