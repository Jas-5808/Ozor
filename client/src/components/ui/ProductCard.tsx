import React, { memo, useMemo, useCallback } from "react";
import { Link } from "react-router-dom";
// CSS module removed - using Tailwind utilities
import { useApp } from "../../context/AppContext";
import { formatPrice, truncateText, getProductImageUrl, getVariantMainImage } from "../../utils/helpers";
import { Product } from "../../types";
import type { VariantMedia } from "../../types/api";

interface ProductCardProps {
  product: Product;
  onToggleLike?: (productId: string) => void;
  isLiked?: boolean;
}

const ProductCardComponent: React.FC<ProductCardProps> = ({
  product,
  onToggleLike,
  isLiked = false,
}) => {
  const { toggleLike, isLiked: isProductLiked } = useApp();
  
  // Создаем уникальный идентификатор: product_id + variant_id (если есть)
  // Это гарантирует, что разные варианты одного товара считаются разными
  const getUniqueId = () => {
    if (product.variant_id && product.variant_id.trim() !== '') {
      return `${product.product_id}_${product.variant_id}`;
    }
    return product.product_id;
  };
  
  const uniqueId = useMemo(() => getUniqueId(), [product.product_id, product.variant_id]);
  
  const liked = useMemo(() => isLiked || isProductLiked(uniqueId), [isLiked, isProductLiked, uniqueId]);

  // Получаем изображение: сначала variant_media.main, потом из атрибута, потом основное
  const productImage = useMemo(() => {
    const variantMedia = product.variant_media as VariantMedia[] | undefined;
    const fromMedia = variantMedia ? getVariantMainImage(variantMedia) : null;
    if (fromMedia) return fromMedia;
    if (product.variant_attributes && product.variant_attributes.length > 0) {
      const variantWithImage = product.variant_attributes.find(
        (attr) => attr.image && attr.image.trim() !== ""
      );
      if (variantWithImage && variantWithImage.image) {
        return getProductImageUrl(variantWithImage.image);
      }
    }
    return getProductImageUrl(product.main_image);
  }, [product.variant_media, product.variant_attributes, product.main_image]);

  const handleToggleLikeMemo = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    toggleLike(uniqueId);
    onToggleLike?.(uniqueId);
  }, [uniqueId, toggleLike, onToggleLike]);


  return (
    <div className="w-full flex flex-col h-full">
      <Link
        to={`/product/${product.product_id}`}
        state={{ product }}
        className="flex flex-col text-black transition-transform md:hover:scale-105 mb-2"
      >
        <div className="relative w-full rounded-xl overflow-hidden mb-3" style={{ aspectRatio: '220/285' }}>
          <img
            src={productImage}
            alt={product.product_name}
            className="w-full h-full object-cover"
            loading="lazy"
            decoding="async"
            onError={(e) => {
              e.currentTarget.src = "/img/NaturalTitanium.jpg";
            }}
          />
          <button
            type="button"
            className="absolute top-1 right-1 w-8 h-8 bg-white rounded-full flex items-center justify-center transition-all shadow-md border border-gray-200 hover:bg-white"
            style={{ backgroundColor: 'white' }}
            onClick={handleToggleLikeMemo}
            aria-pressed={liked}
            aria-label={liked ? "Убрать из избранного" : "Добавить в избранное"}
          >
            <img
              src={liked ? "/icons/like3.svg" : "/icons/like2.svg"}
              alt=""
              className={`w-4 h-4 transition-transform ${
                liked ? 'scale-110' : 'scale-100'
              }`}
              aria-hidden="true"
            />
          </button>
        </div>
        <div className="flex flex-col gap-1.5">
          <div className="flex justify-between items-center">
            <h3 className="text-blue-600 font-semibold text-sm">
              {product.price && product.price > 0
                ? formatPrice(product.price)
                : "Цена не указана"}
            </h3>
          </div>
          <div className="font-semibold text-sm leading-tight">
            {truncateText(product.product_name, 40)}
          </div>
          {product.product_description && (
            <div className="text-[10px] text-gray-600 leading-tight line-clamp-2">
              {truncateText(product.product_description, 60)}
            </div>
          )}
        </div>
      </Link>
    </div>
  );
};

// Мемоизация компонента для предотвращения ненужных ререндеров
export const ProductCard = memo(ProductCardComponent, (prevProps, nextProps) => {
  // Кастомная функция сравнения для оптимизации
  return (
    prevProps.product.product_id === nextProps.product.product_id &&
    prevProps.product.variant_id === nextProps.product.variant_id &&
    prevProps.isLiked === nextProps.isLiked
  );
});

ProductCard.displayName = 'ProductCard';

export default ProductCard;
