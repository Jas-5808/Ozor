import React from "react";
import cn from "./style.module.scss";
import { useApp } from "../context/AppContext";
import { formatPrice } from "../utils/helpers";

export function Cart() {
  const { state, updateCartItem, removeFromCart, clearCart, getCartTotal } = useApp();
  const items = state.cart;

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
              <h2 className="m-0 text-[22px] font-extrabold text-slate-900">Savat</h2>
              <div className="grid place-items-center py-6 text-slate-500">Savat bo'sh</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const total = getCartTotal();

  return (
    <div className="container">
      <div className={cn.main}>
        <div className={cn.main_content}>
          <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
            <div>
              <div className="flex items-center justify-between mb-3">
                <h2 className="m-0 text-[22px] font-extrabold text-slate-900">Savat</h2>
                <button onClick={clearCart} className={cn.btn_secondary}>Savtni tozalash</button>
              </div>

              <div className="grid gap-3">
                {items.map((item) => {
                  const subtotal = item.product.refferal_price * item.quantity;
                  return (
                    <div
                      key={item.productId}
                      className="grid grid-cols-1 sm:grid-cols-[1fr_auto_auto] gap-3 items-center p-4 border border-gray-200 rounded-2xl bg-white shadow-[0_8px_30px_rgba(0,0,0,0.04)]"
                    >
                      <div>
                        <div className="font-extrabold text-slate-900">{item.product.name}</div>
                        <div className="text-xs text-slate-500 mt-1">Narx: {formatPrice(item.product.refferal_price)}</div>
                      </div>
                      <div className="inline-flex items-center gap-2" aria-label="Miqdor">
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
                      <div className="flex items-center gap-2 sm:justify-end">
                        <div className="font-extrabold text-slate-900">{formatPrice(subtotal)}</div>
                        <button onClick={() => removeFromCart(item.productId)} className={cn.btn_secondary}>O'chirish</button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <aside>
              <div className="sticky top-4 grid gap-3 p-4 bg-white border border-gray-200 rounded-2xl shadow-[0_8px_30px_rgba(0,0,0,0.04)]">
                <div className="flex items-center justify-between">
                  <div className="text-slate-500 font-bold">Jami</div>
                  <div className="text-[20px] font-black">{formatPrice(total)}</div>
                </div>
                <button className={`${cn.primary_btn} h-11`}>Buyurtmani rasmiylashtirish</button>
                <div className="text-xs text-slate-500">Yetkazib berish narxi kassada hisoblanadi.</div>
              </div>
            </aside>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Cart;
