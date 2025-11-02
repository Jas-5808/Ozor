import React from "react";
import { Link } from "react-router-dom";
// CSS module removed - using Tailwind utilities
import { useApp } from "../../context/AppContext";
import { formatPrice, truncateText, getProductImageUrl, getVariantMainImage } from "../../utils/helpers";
import { Product } from "../../types";
interface ProductCardProps {
  product: Product;
  onToggleLike?: (productId: string) => void;
  isLiked?: boolean;
}
export const ProductCard: React.FC<ProductCardProps> = ({
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
  
  const uniqueId = getUniqueId();
  
  const handleToggleLike = (e: React.MouseEvent) => {
    e.preventDefault(); // не даём ссылке сработать
    e.stopPropagation(); // и прерываем всплытие
    toggleLike(uniqueId);
    onToggleLike?.(uniqueId);
  };
  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };
  const liked = isLiked || isProductLiked(uniqueId);

  // Получаем изображение: сначала variant_media.main, потом из атрибута, потом основное
  const getProductImage = () => {
    const fromMedia = getVariantMainImage((product as any).variant_media);
    if (fromMedia) return fromMedia;
    if (product.variant_attributes && product.variant_attributes.length > 0) {
      const variantWithImage = product.variant_attributes.find((attr) => (attr as any).image && (attr as any).image.trim() !== "");
      if (variantWithImage) return getProductImageUrl((variantWithImage as any).image);
    }
    return getProductImageUrl(product.main_image);
  };

  return (
    <Link
      to={`/product/${product.product_id}`}
      state={{ product }}
      className="flex-1 min-w-[160px] max-w-[220px] w-full cursor-pointer text-black transition-transform hover:scale-105"
    >
      <div className="relative w-full aspect-[220/285] rounded-xl overflow-hidden mb-3">
        <img
          src={getProductImage()}
          alt={product.product_name}
          className="absolute inset-0 w-full h-full object-cover"
          onError={(e) => {
            e.currentTarget.src = "/img/NaturalTitanium.jpg";
          }}
        />
        <button
          type="button"
          className="absolute top-1 right-1 w-8 h-8 bg-white rounded-full flex items-center justify-center transition-all shadow-md border border-gray-200 hover:bg-white"
          style={{ backgroundColor: 'white' }}
          onClick={handleToggleLike}
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
      <div className="flex flex-col gap-2">
        <div className="flex justify-between items-center">
          <h3 className="text-blue-600 font-semibold text-sm">
            {product.price && product.price > 0
              ? formatPrice(product.price)
              : "Цена не указана"}
          </h3>
        </div>
        <div className="font-semibold text-sm">
          {truncateText(product.product_name, 50)}
        </div>
        {product.product_description && (
          <div className="text-xs text-gray-600 leading-relaxed mb-1">
            {truncateText(product.product_description, 80)}
          </div>
        )}
        <div className="flex items-center gap-2 mb-1">
          <div className="flex gap-1">
            <img src="/icons/star.png" alt="Рейтинг" className="w-4 h-4" />
            <p className="text-xs font-semibold">4.7</p>
          </div>
          <span className="text-xs text-gray-500">1 230 оценки</span>
        </div>
        <button
          type="button"
          onClick={handleAddToCart}
          disabled={!product.price || product.price <= 0 || product.stock <= 0}
          className={`w-full py-2 rounded-xl flex items-center justify-center gap-1 text-white font-medium text-sm transition-colors ${
            !product.price || product.price <= 0 || product.stock <= 0
              ? "bg-gray-300 text-gray-500 cursor-not-allowed"
              : "bg-blue-600 hover:bg-blue-700"
          }`}
        >
          <img src="/icons/korzinka.svg" alt="" className="w-4 h-4" aria-hidden="true" />
          {!product.price || product.price <= 0
            ? "Цена не указана"
            : product.stock <= 0
            ? "Нет в наличии"
            : "Savatka"}
        </button>
      </div>
    </Link>
  );
};
export default ProductCard;
