import cn from "./style.module.scss";
import { useApp } from "../context/AppContext";
import { formatPrice } from "../utils/helpers";
import useSEO from "../hooks/useSEO";
import { useTranslation } from "react-i18next";

export function Cart() {
  const { t } = useTranslation();
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
  const handleIncrease = (productId: string, currentQty: number) => {
    updateCartItem(productId, currentQty + 1);
  };

  if (!items || items.length === 0) {
    return (
      <div className="container">
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
          <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
            <div>
              <div className="flex items-center justify-between mb-3 px-1 sm:px-0">
                <h2 className="m-0 text-[20px] font-extrabold text-slate-900 leading-tight py-3">{t("common.cart.title")}</h2>
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
                      className="flex items-start gap-4 p-4 border border-gray-200 rounded-2xl bg-white shadow-[0_8px_30px_rgba(0,0,0,0.04)]"
                    >
                      <div className="h-24 w-24 shrink-0 overflow-hidden rounded-2xl bg-white border border-gray-100 flex items-center justify-center">
                        <img
                          src={imageSrc}
                          alt={item.product.name}
                          className="h-full w-full object-contain"
                          onError={(e) => {
                            e.currentTarget.src = cartPlaceholderImage;
                          }}
                        />
                      </div>
                      <div className="flex-1 space-y-3">
                        <div className="flex items-start gap-3">
                          <p className="font-semibold text-slate-900 pr-2 text-sm leading-snug line-clamp-2 flex-1">
                            {item.product.name}
                          </p>
                          <div className="inline-flex items-center gap-2" aria-label={t("common.cart.quantity")}>
                            <button
                              onClick={() => handleDecrease(item.productId, item.quantity)}
                              className="h-9 w-9 rounded-xl border border-gray-300 bg-white hover:bg-gray-50"
                            >
                              −
                            </button>
                            <strong className="min-w-7 text-center">{item.quantity}</strong>
                            <button
                              onClick={() => handleIncrease(item.productId, item.quantity)}
                              className="h-9 w-9 rounded-xl border border-gray-300 bg-white hover:bg-gray-50"
                            >
                              +
                            </button>
                          </div>
                        </div>
                        <div className="text-sm font-semibold text-[#04734b]">
                          {formatPrice(item.product.base_price)}
                        </div>
                        {hasOriginal && (
                          <div className="text-xs text-gray-500">
                            {t("common.cart.withoutDiscount")}{" "}
                            <span className="relative inline-block text-red-500 font-semibold">
                              <span className="relative z-10">{formatPrice(item.product.original_price!)}</span>
                              <span className="absolute left-0 right-0 top-1/2 border-t border-red-500 rotate-6"></span>
                            </span>
                          </div>
                        )}
                        {attributes.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-slate-600">
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
                        <div className="flex justify-end">
                          <button
                            onClick={() => removeFromCart(item.productId)}
                            className="rounded-full border border-gray-200 bg-white p-2 text-gray-400 transition hover:border-rose-200 hover:text-rose-500"
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

            <aside>
              <div className="sticky top-4 grid gap-3 p-4 bg-white border border-gray-200 rounded-2xl shadow-[0_8px_30px_rgba(0,0,0,0.04)]">
                <div className="flex items-center justify-between">
                  <div className="text-slate-500 font-bold">{t("common.cart.products")}</div>
                  <div className="text-[16px] font-extrabold">{formatPrice(total)}</div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="text-slate-500 font-bold">{t("common.cart.delivery")}</div>
                  <div className="text-[16px] font-extrabold">{formatPrice(delivery)}</div>
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-gray-200">
                  <div className="text-slate-700 font-black">{t("common.cart.grandTotal")}</div>
                  <div className="text-[20px] font-black">{formatPrice(grandTotal)}</div>
                </div>
                <button className={`${cn.primary_btn} h-11`}>{t("common.cart.checkout")}</button>
              </div>
            </aside>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Cart;
