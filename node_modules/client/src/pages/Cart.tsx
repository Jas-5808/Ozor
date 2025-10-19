import React from "react";
import cn from "./style.module.scss";
import { useApp } from "../context/AppContext";
import { formatPrice } from "../utils/helpers";

export function Cart() {
  const { state, updateCartItem, removeFromCart, clearCart, getCartTotal } =
    useApp();
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
            <h2 style={{ marginBottom: 16 }}>Savat</h2>
            <div className={cn.empty_container}>
              <p>Savat bo'sh</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <div className={cn.main}>
        <div className={cn.main_content}>
          <h2 style={{ marginBottom: 16 }}>Savat</h2>

          <div style={{ display: "grid", gap: 12 }}>
            {items.map((item) => (
              <div
                key={item.productId}
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr auto auto auto auto",
                  gap: 12,
                  alignItems: "center",
                  padding: 12,
                  border: "1px solid #e5e7eb",
                  borderRadius: 12,
                  background: "#fff",
                }}
              >
                <div style={{ fontWeight: 600 }}>{item.product.name}</div>
                <div style={{ color: "#111827", fontWeight: 700 }}>
                  {formatPrice(item.product.refferal_price)}
                </div>
                <div
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  <button
                    onClick={() =>
                      handleDecrease(item.productId, item.quantity)
                    }
                    style={{
                      padding: "4px 10px",
                      borderRadius: 8,
                      border: "1px solid #d1d5db",
                      background: "#fff",
                    }}
                  >
                    -
                  </button>
                  <span style={{ minWidth: 24, textAlign: "center" }}>
                    {item.quantity}
                  </span>
                  <button
                    onClick={() =>
                      handleIncrease(item.productId, item.quantity)
                    }
                    style={{
                      padding: "4px 10px",
                      borderRadius: 8,
                      border: "1px solid #d1d5db",
                      background: "#fff",
                    }}
                  >
                    +
                  </button>
                </div>
                <div style={{ fontWeight: 700, color: "#006DFF" }}>
                  {formatPrice(item.product.refferal_price * item.quantity)}
                </div>
                <button
                  onClick={() => removeFromCart(item.productId)}
                  className={cn.btn_secondary}
                >
                  O'chirish
                </button>
              </div>
            ))}
          </div>

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginTop: 16,
            }}
          >
            <button onClick={clearCart} className={cn.btn_secondary}>
              Savtni tozalash
            </button>
            <div style={{ fontSize: 18, fontWeight: 800, color: "#111827" }}>
              Jami: {formatPrice(getCartTotal())}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Cart;
