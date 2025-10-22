import React from "react";
import { Link } from "react-router-dom";
import cn from "../pages/style.module.scss";
import { useApp } from "../context/AppContext";
import {
  formatPrice,
  truncateText,
  getProductImageUrl,
} from "../utils/helpers";
import { Product } from "../types";
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
  const handleToggleLike = (e: React.MouseEvent) => {
    e.preventDefault(); // не даём ссылке сработать
    e.stopPropagation(); // и прерываем всплытие
    toggleLike(product.product_id);
    onToggleLike?.(product.product_id);
  };
  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };
  const liked = isLiked || isProductLiked(product.product_id);

  // Получаем изображение варианта или основное изображение
  const getProductImage = () => {
    // Ищем изображение в variant_attributes
    if (product.variant_attributes && product.variant_attributes.length > 0) {
      const variantWithImage = product.variant_attributes.find(
        (attr) => attr.image && attr.image.trim() !== ""
      );
      if (variantWithImage) {
        return getProductImageUrl(variantWithImage.image);
      }
    }
    // Fallback на основное изображение
    return getProductImageUrl(product.main_image);
  };

  return (
    <Link
      to={`/product/${product.product_id}`}
      state={{ product }}
      className={cn.card}
    >
      <div className={cn.card_img}>
        <img
          src={getProductImage()}
          alt={product.product_name}
          onError={(e) => {
            e.currentTarget.src = "/img/NaturalTitanium.jpg";
          }}
        />
        <button
          type="button"
          className={cn.like}
          onClick={handleToggleLike}
          aria-pressed={liked}
          aria-label={liked ? "Убрать из избранного" : "Добавить в избранное"}
        >
          <img
            src={liked ? "/icons/like3.svg" : "/icons/like2.svg"}
            alt=""
            aria-hidden="true"
          />
        </button>
        {}
      </div>
      <div className={cn.card_body}>
        <div className={cn.product_price}>
          <h3>
            {product.price && product.price > 0
              ? formatPrice(product.price)
              : "Цена не указана"}
          </h3>
        </div>
        <div className={cn.product_quantities}>
          <p>{product.stock > 0 ? "В наличии" : "Нет в наличии"}</p>
        </div>
        <div className={cn.product_name}>
          {truncateText(product.product_name, 50)}
        </div>
        {product.product_description && (
          <div className={cn.product_description}>
            {truncateText(product.product_description, 80)}
          </div>
        )}
        <div className={cn.product_grade}>
          <div className={cn.stars}>
            <img src="/icons/star.png" alt="Рейтинг" />
            <p>4.7</p>
          </div>
          <span>1 230 оценки</span>
        </div>
        <button
          type="button"
          onClick={handleAddToCart}
          disabled={!product.price || product.price <= 0 || product.stock <= 0}
          className={
            !product.price || product.price <= 0 || product.stock <= 0
              ? cn.disabled_button
              : ""
          }
        >
          <img src="/icons/korzinka.svg" alt="" aria-hidden="true" />
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
