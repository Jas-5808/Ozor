import { useState } from "react";
import cn from "./style.module.scss";
import { useApp } from "../context/AppContext";
import { formatPrice } from "../utils/helpers";
import useSEO from "../hooks/useSEO";
import { useTranslation } from "react-i18next";

const USER_AGREEMENT_PDF_URL = '/user-agreement.pdf';

export function Cart() {
  const { t } = useTranslation();
  const [showComingSoonModal, setShowComingSoonModal] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  useSEO({
    title: `${t("common.cart.title")} — OZAR`,
    robots: "noindex,nofollow",
    canonical: typeof window !== 'undefined' ? window.location.origin + '/cart' : undefined,
  });
  const { state, updateCartItem, removeFromCart, getCartTotal } = useApp();
  const items = state.cart;
  const cartPlaceholderImage = "/img/product-placeholder.png";

  const handleDecrease = (productId: string, currentQty: number) => {
    const next = Math.max(1, currentQty - 1);
    updateCartItem(productId, next);
  };
  const handleIncrease = (productId: string, currentQty: number, stock?: number) => {
    // Ограничиваем количество по наличию на складе
    const maxQty = stock !== undefined ? stock : Infinity;
    if (currentQty < maxQty) {
      updateCartItem(productId, currentQty + 1);
    }
  };

  if (!items || items.length === 0) {
    return (
      <div className="container mx-auto">
        <div className={cn.main}>
          <div className={cn.main_content}>
            <div className="grid gap-3 p-6 bg-white border border-gray-200 rounded-2xl shadow-[0_8px_30px_rgba(0,0,0,0.04)]">
              <h2 className="m-0 text-[22px] font-extrabold text-slate-900">{t("common.cart.title")}</h2>
              <div className="grid place-items-center py-6 text-slate-500">{t("common.cart.empty")}</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const total = getCartTotal();
  const delivery = 30000;
  const grandTotal = total + delivery;

  return (
    <div className="container">
      <div className={cn.main}>
        <div className={cn.main_content}>
          <div className={`${cn.cartGrid} grid gap-4 lg:grid-cols-[1fr_340px]`}>
            <div>
              <div className={`${cn.cartHeader} flex items-center justify-between mb-3 px-1 sm:px-0`}>
                <h2 className={`${cn.cartTitle} m-0 text-[20px] font-extrabold text-slate-900 leading-tight py-3`}>{t("common.cart.title")}</h2>
              </div>

              <div className="grid gap-3">
                {items.map((item) => {
                  const attributes = item.product.attributes || [];
                  const imageSrc = item.product.image || cartPlaceholderImage;
                  const hasOriginal =
                    typeof item.product.original_price === "number" &&
                    item.product.original_price > item.product.base_price;
                  return (
                    <div
                      key={item.productId}
                      className={`${cn.cartItem} flex items-start gap-4 p-4 border border-gray-200 rounded-2xl bg-white shadow-[0_8px_30px_rgba(0,0,0,0.04)]`}
                    >
                      <div className={`${cn.cartItemImage} h-24 w-24 shrink-0 overflow-hidden rounded-2xl bg-white border border-gray-100 flex items-center justify-center`}>
                        <img
                          src={imageSrc}
                          alt={item.product.name}
                          className="h-full w-full object-contain"
                          onError={(e) => {
                            e.currentTarget.src = cartPlaceholderImage;
                          }}
                        />
                      </div>
                      <div className={`${cn.cartItemContent} flex-1 space-y-3`}>
                        <div className={`${cn.cartItemHeader} flex items-start gap-3`}>
                          <p className={`${cn.cartItemName} font-semibold text-slate-900 pr-2 text-sm leading-snug line-clamp-2 flex-1`}>
                            {item.product.name}
                          </p>
                          <div className={`${cn.cartQuantity} inline-flex items-center gap-2`} aria-label={t("common.cart.quantity")}>
                            <button
                              onClick={() => handleDecrease(item.productId, item.quantity)}
                              className={`${cn.quantityBtn} h-9 w-9 rounded-xl border border-gray-300 bg-white hover:bg-gray-50`}
                            >
                              −
                            </button>
                            <strong className="min-w-7 text-center">{item.quantity}</strong>
                            <button
                              onClick={() => handleIncrease(item.productId, item.quantity, item.product.stock)}
                              disabled={item.product.stock !== undefined && item.quantity >= item.product.stock}
                              className={`${cn.quantityBtn} h-9 w-9 rounded-xl border border-gray-300 bg-white ${
                                item.product.stock !== undefined && item.quantity >= item.product.stock
                                  ? 'opacity-50 cursor-not-allowed'
                                  : 'hover:bg-gray-50'
                              }`}
                            >
                              +
                            </button>
                          </div>
                        </div>
                        {item.product.stock !== undefined && item.quantity >= item.product.stock && (
                          <div className={`${cn.stockWarning} text-xs text-orange-600 font-medium`}>
                            ⚠️ Максимум на складе: {item.product.stock} шт.
                          </div>
                        )}
                        <div className={`${cn.cartPrice} text-sm font-semibold text-[#04734b]`}>
                          {formatPrice(item.product.base_price)}
                        </div>
                        {hasOriginal && (
                          <div className={`${cn.originalPrice} text-xs text-gray-500`}>
                            {t("common.cart.withoutDiscount")}{" "}
                            <span className="relative inline-block text-red-500 font-semibold">
                              <span className="relative z-10">{formatPrice(item.product.original_price!)}</span>
                              <span className="absolute left-0 right-0 top-1/2 border-t border-red-500 rotate-6"></span>
                            </span>
                          </div>
                        )}
                        {attributes.length > 0 && (
                          <div className={`${cn.cartAttributes} mt-2 flex flex-wrap gap-2 text-[11px] text-slate-600`}>
                            {attributes.map((attr, idx) => (
                              <span
                                key={`${attr.name}-${attr.value}-${idx}`}
                                className="rounded-full bg-slate-100 px-2 py-1"
                              >
                                {attr.name}: <strong className="text-slate-800">{attr.value}</strong>
                              </span>
                            ))}
                          </div>
                        )}
                        <div className={`${cn.cartItemActions} flex justify-end`}>
                          <button
                            onClick={() => removeFromCart(item.productId)}
                            className={`${cn.removeBtn} rounded-full border border-gray-200 bg-white p-2 text-gray-400 transition hover:border-rose-200 hover:text-rose-500`}
                            aria-label={t("common.cart.removeItem")}
                          >
                            <svg
                              width="16"
                              height="16"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <polyline points="3 6 5 6 21 6"></polyline>
                              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                              <line x1="10" y1="11" x2="10" y2="17"></line>
                              <line x1="14" y1="11" x2="14" y2="17"></line>
                            </svg>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <aside className={cn.cartSidebar}>
              <div className={`${cn.cartSummary} sticky top-4 grid gap-3 p-4 bg-white border border-gray-200 rounded-2xl shadow-[0_8px_30px_rgba(0,0,0,0.04)]`}>
                <div className={`${cn.summaryRow} flex items-center justify-between`}>
                  <div className={`${cn.summaryLabel} text-slate-500 font-bold`}>{t("common.cart.products")}</div>
                  <div className={`${cn.summaryValue} text-[16px] font-extrabold`}>{formatPrice(total)}</div>
                </div>
                <div className={`${cn.summaryRow} flex items-center justify-between`}>
                  <div className={`${cn.summaryLabel} text-slate-500 font-bold`}>{t("common.cart.delivery")}</div>
                  <div className={`${cn.summaryValue} text-[16px] font-extrabold`}>{formatPrice(delivery)}</div>
                </div>
                <div className={`${cn.summaryTotal} flex items-center justify-between pt-2 border-t border-gray-200`}>
                  <div className={`${cn.summaryTotalLabel} text-slate-700 font-black`}>{t("common.cart.grandTotal")}</div>
                  <div className={`${cn.summaryTotalValue} text-[20px] font-black`}>{formatPrice(grandTotal)}</div>
                </div>
                <label className="flex items-start gap-3 cursor-pointer mt-3 p-3 rounded-xl border border-gray-200 bg-slate-50 hover:bg-slate-100/80 transition">
                  <input
                    type="checkbox"
                    checked={agreedToTerms}
                    onChange={(e) => setAgreedToTerms(e.target.checked)}
                    className="mt-1 h-4 w-4 rounded border-gray-300 text-[#04734b] focus:ring-[#04734b]"
                  />
                  <span className="text-sm text-slate-700">
                    {t("common.cart.agreementAccept")}{' '}
                    <a
                      href={USER_AGREEMENT_PDF_URL}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#04734b] font-semibold underline hover:no-underline"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {t("common.cart.agreementLink")}
                    </a>
                  </span>
                </label>
                {!agreedToTerms && (
                  <p className="text-xs text-amber-600 mt-1">
                    {t("common.cart.agreementRequired")}
                  </p>
                )}
                <button 
                  type="button"
                  onClick={() => agreedToTerms && setShowComingSoonModal(true)}
                  disabled={!agreedToTerms}
                  className={`${cn.checkoutBtn} w-full h-11 rounded-2xl text-white font-semibold transition active:scale-[0.98] ${
                    agreedToTerms ? 'hover:brightness-110' : 'cursor-not-allowed bg-slate-400'
                  }`}
                  style={agreedToTerms ? { background: "linear-gradient(92.41deg, #003d32, #04734b)" } : undefined}
                  title={!agreedToTerms ? t("common.cart.agreementRequired") : undefined}
                >
                  {t("common.cart.checkout")}
                </button>
              </div>
            </aside>
          </div>
        </div>
      </div>

      {/* Модалка "Скоро заработает" */}
      {showComingSoonModal && (
        <div 
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
          onClick={() => setShowComingSoonModal(false)}
        >
          <div 
            className="relative w-full max-w-sm bg-white rounded-3xl shadow-2xl p-6 text-center"
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
              Оформление заказа находится в разработке. Мы работаем над этим и скоро всё будет готово!
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
    </div>
  );
}

export default Cart;
