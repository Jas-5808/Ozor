import React, { memo, useMemo, useCallback } from "react";
import { Link, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useApp } from "../../context/AppContext";
import { formatPrice, truncateText, getProductImageUrl, getVariantMainImage } from "../../utils/helpers";
import { htmlToPlainText } from "../../utils/sanitize";
import { resolveProductName, resolveProductDescription } from "../../utils/productUtils";
import { Product } from "../../types";
import type { VariantMedia } from "../../types/api";

interface ProductCardProps {
  product: Product;
  onToggleLike?: (productId: string) => void;
  isLiked?: boolean;
  size?: "default" | "compact";
  matchPercent?: number;
  /** Текущий язык — передавать, чтобы карточка перерисовывалась при смене языка (описание/название) */
  locale?: string;
}

const ProductCardComponent: React.FC<ProductCardProps> = ({
  product,
  onToggleLike,
  isLiked = false,
  size = "default",
  matchPercent,
  locale: _localeProp,
}) => {
  const { toggleLike, isLiked: isProductLiked } = useApp();
  const { t, i18n } = useTranslation();
  const location = useLocation();
  
  // Получаем локализованное название и описание с учетом текущего языка
  // Используем name_uz и name_ru напрямую, чтобы обновляться при смене языка
  const localizedName = useMemo(() => {
    const locale = i18n.language?.split("-")[0] || "ru";
    if (locale === "uz") {
      return product.name_uz || product.product_name || "";
    }
    return product.name_ru || product.name_uz || product.product_name || "";
  }, [product.name_uz, product.name_ru, product.product_name, i18n.language]);
  
  const localizedDescription = useMemo(() => {
    const locale = i18n.language?.split("-")[0] || "ru";
    const raw =
      locale === "uz"
        ? product.description_uz || product.description_ru || product.product_description || ""
        : product.description_ru || product.description_uz || product.product_description || "";
    return htmlToPlainText(raw);
  }, [product.description_uz, product.description_ru, product.product_description, i18n.language]);

  const isCompact = size === "compact";

  // Создаем уникальный идентификатор: product_id + variant_id (если есть)
  // Это гарантирует, что разные варианты одного товара считаются разными
  const getUniqueId = () => {
    if (product.variant_id && product.variant_id.trim() !== "") {
      return `${product.product_id}_${product.variant_id}`;
    }
    return product.product_id;
  };

  const uniqueId = useMemo(() => getUniqueId(), [product.product_id, product.variant_id]);

  const liked = useMemo(() => isLiked || isProductLiked(uniqueId), [isLiked, isProductLiked, uniqueId]);

  // Формируем ссылку: если это конкретный вариант, пробрасываем его через query
  const productUrl = useMemo(() => {
    if (product.variant_id && product.variant_id.trim() !== "") {
      return `/product/${product.product_id}?variant=${product.variant_id}`;
    }
    return `/product/${product.product_id}`;
  }, [product.product_id, product.variant_id]);

  // Получаем изображение: сначала variant_media.main, потом из атрибута, потом основное
  const productImage = useMemo(() => {
    const variantMedia = product.variant_media as VariantMedia[] | undefined;
    const fromMedia = variantMedia ? getVariantMainImage(variantMedia) : null;
    if (fromMedia) return fromMedia;

    if (product.variant_attributes && product.variant_attributes.length > 0) {
      const variantWithImage = product.variant_attributes.find((attr) => attr.image && attr.image.trim() !== "");
      if (variantWithImage && variantWithImage.image) {
        return getProductImageUrl(variantWithImage.image);
      }
    }

    return getProductImageUrl(product.main_image);
  }, [product.variant_media, product.variant_attributes, product.main_image]);

  const hasDiscount = useMemo(() => {
    const base = typeof product.base_price === "number" ? product.base_price : null;
    const current = typeof product.price === "number" ? product.price : null;
    if (!base || !current) return false;
    return base > 0 && current > 0 && base > current;
  }, [product.base_price, product.price]);

  const discountPercent = useMemo(() => {
    if (!hasDiscount) return null;
    const base = Number(product.base_price || 0);
    const current = Number(product.price || 0);
    if (!base || base <= 0) return null;
    return Math.max(1, Math.round(((base - current) / base) * 100));
  }, [hasDiscount, product.base_price, product.price]);

  const handleToggleLikeMemo = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      toggleLike(uniqueId);
      onToggleLike?.(uniqueId);
    },
    [uniqueId, toggleLike, onToggleLike]
  );

  return (
    <div className="w-full flex flex-col h-full min-w-0">
      <Link
        to={productUrl}
        state={{
          product,
          variant_id: product.variant_id,
          from: location.pathname + location.search,
          scrollY: typeof window !== "undefined" ? window.scrollY : 0,
        }}
        className={[
          "flex flex-col text-black transition-transform min-w-0",
          "md:hover:scale-105",
          isCompact ? "mb-1" : "mb-2",
        ].join(" ")}
      >
        <div
          className={[
            "relative w-full rounded-xl overflow-hidden",
            // В compact-режиме делаем "стандарт" как витрина: белый фон + contain, чтобы не обрезать фото
            isCompact ? "mb-2 bg-white" : "mb-3",
          ].join(" ")}
          style={{ aspectRatio: isCompact ? "1/1" : "220/285" }}
        >
          <img
            src={productImage}
            alt={localizedName}
            className={[
              "w-full h-full",
              isCompact ? "object-contain p-2" : "object-cover",
            ].join(" ")}
            loading="lazy"
            decoding="async"
            onError={(e) => {
              e.currentTarget.src = "/img/NaturalTitanium.jpg";
            }}
          />

          {hasDiscount && (
            <div
              className={[
                "absolute left-2 top-2 rounded-full px-2 py-1 font-bold text-white shadow-md",
                "bg-linear-to-r from-rose-600 to-orange-500",
                isCompact ? "text-[10px]" : "text-xs",
              ].join(" ")}
            >
              {t("product.badges.sale", "Акция")}
              {discountPercent ? ` -${discountPercent}%` : ""}
            </div>
          )}

          {typeof matchPercent === "number" && (
            <div
              className={[
                "absolute left-2 bottom-2 rounded-full px-2 py-1 font-semibold text-white shadow-md",
                "bg-emerald-600/90",
                isCompact ? "text-[10px]" : "text-xs",
              ].join(" ")}
            >
              {matchPercent}%
            </div>
          )}

          <button
            type="button"
            className={[
              "absolute flex items-center justify-center transition-all shadow-md border border-gray-200 bg-white rounded-full",
              isCompact ? "top-1 right-1 w-7 h-7" : "top-1 right-1 w-8 h-8",
            ].join(" ")}
            onClick={handleToggleLikeMemo}
            aria-pressed={liked}
            aria-label={liked ? t("common.actions.removeFavorite") : t("common.actions.addFavorite")}
          >
            <img
              src={liked ? "/icons/like3.svg" : "/icons/like2.svg"}
              alt=""
              className={[
                "transition-transform",
                isCompact ? "w-3.5 h-3.5" : "w-4 h-4",
                liked ? "scale-110" : "scale-100",
              ].join(" ")}
              aria-hidden="true"
            />
          </button>
        </div>

        <div className={["flex flex-col min-w-0", isCompact ? "gap-1" : "gap-1.5"].join(" ")}>
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 min-w-0">
            <h3 className={["font-semibold text-emerald-600", isCompact ? "text-xs" : "text-sm"].join(" ")}>
              {product.price && product.price > 0 ? formatPrice(product.price) : t("product.priceMissing")}
            </h3>
            {hasDiscount && typeof product.base_price === "number" && product.base_price > 0 && (
              <span className={["text-slate-400 line-through", isCompact ? "text-[10px]" : "text-xs"].join(" ")}>
                {formatPrice(product.base_price)}
              </span>
            )}
          </div>

          <div
            className={[
              "font-semibold leading-tight min-w-0",
              isCompact ? "text-xs line-clamp-2" : "text-sm",
            ].join(" ")}
          >
            {truncateText(localizedName, isCompact ? 32 : 40)}
          </div>

          {!isCompact && localizedDescription && (
            <div className="text-[10px] text-gray-600 leading-tight line-clamp-2">
              {truncateText(localizedDescription, 60)}
            </div>
          )}
        </div>
      </Link>
    </div>
  );
};

// Мемоизация для оптимизации производительности при большом количестве продуктов
// Сравниваем name_uz/name_ru, чтобы компонент перерисовывался при смене языка
// (когда язык меняется, продукты пересчитываются и создаются новые объекты с обновленными полями)
export const ProductCard = memo(ProductCardComponent, (prevProps, nextProps) => {
  // Сравниваем ключевые поля для идентификации продукта
  const sameProduct = 
    prevProps.product.product_id === nextProps.product.product_id &&
    prevProps.product.variant_id === nextProps.product.variant_id;
  
  if (!sameProduct) return false;
  
  // Сравниваем поля, влияющие на отображение
  // При смене языка продукты пересчитываются через transformProductFromApi,
  // который создает новые объекты с обновленными product_name и product_description
  // (через resolveProductName/resolveProductDescription, зависящие от языка)
  const sameDisplayData =
    prevProps.product.name_uz === nextProps.product.name_uz &&
    prevProps.product.name_ru === nextProps.product.name_ru &&
    prevProps.product.description_uz === nextProps.product.description_uz &&
    prevProps.product.description_ru === nextProps.product.description_ru &&
    prevProps.product.product_name === nextProps.product.product_name &&
    prevProps.product.product_description === nextProps.product.product_description &&
    prevProps.product.price === nextProps.product.price &&
    prevProps.product.base_price === nextProps.product.base_price &&
    prevProps.product.stock === nextProps.product.stock;
  
  // При смене языка нужно перерисовывать карточку (локализованные название/описание)
  if (prevProps.locale !== nextProps.locale) return false;

  // Сравниваем остальные props
  const sameProps =
    prevProps.isLiked === nextProps.isLiked &&
    prevProps.size === nextProps.size &&
    prevProps.matchPercent === nextProps.matchPercent;

  return sameDisplayData && sameProps;
});

ProductCard.displayName = "ProductCard";

export default ProductCard;
