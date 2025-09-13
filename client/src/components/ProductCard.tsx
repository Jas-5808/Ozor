import React from "react";
import { Link } from "react-router-dom";
import cn from "../pages/style.module.scss";
import { useApp } from "../context/AppContext";
import { formatPrice, truncateText, getProductImageUrl } from "../utils/helpers";
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
    e.preventDefault();      // не даём ссылке сработать
    e.stopPropagation();     // и прерываем всплытие
    toggleLike(product.id);
    onToggleLike?.(product.id);
  };
  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };
  const liked = isLiked || isProductLiked(product.id);
  return (
    <Link to={`/product/${product.id}`}  state={{ product }}  className={cn.card}>
      <div className={cn.card_img}>
        <img 
          src={getProductImageUrl(product.main_image)} 
          alt={product.name}
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
          <h3>{formatPrice(product.base_price)}</h3>
        </div>
        <div className={cn.product_quantities}>
          <p>В наличии</p>
        </div>
        <div className={cn.product_name}>
          {truncateText(product.name, 50)}
        </div>
        {product.description && (
          <div className={cn.product_description}>
            {truncateText(product.description, 80)}
          </div>
        )}
        <div className={cn.product_grade}>
          <div className={cn.stars}>
            <img src="/icons/star.png" alt="Рейтинг" />
            <p>4.7</p>
          </div>
          <span>1 230 оценки</span>
        </div>
        <button type="button" onClick={handleAddToCart}>
          <img src="/icons/korzinka.svg" alt="" aria-hidden="true" />
          Savatka
        </button>
      </div>
    </Link>
  );
};
export default ProductCard;
