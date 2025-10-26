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
            <div style={{
              display:'grid', gap:12, padding:24, background:'#fff', border:'1px solid #e5e7eb', borderRadius:14,
              boxShadow:'0 8px 30px rgba(0,0,0,0.04)'
            }}>
              <h2 style={{ margin:0, fontSize:22, fontWeight:800 }}>Savat</h2>
              <div style={{display:'grid', placeItems:'center', padding:24, color:'#64748b'}}>Savat bo'sh</div>
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
          <div style={{ display:'grid', gridTemplateColumns:'1fr 340px', gap:16 }}>
            <div>
              <div style={{
                display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12
              }}>
                <h2 style={{ margin:0, fontSize:22, fontWeight:800 }}>Savat</h2>
                <button onClick={clearCart} className={cn.btn_secondary}>Savtni tozalash</button>
              </div>

              <div style={{ display: 'grid', gap: 12 }}>
                {items.map((item) => {
                  const subtotal = item.product.refferal_price * item.quantity;
                  return (
                    <div
                      key={item.productId}
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr auto auto',
                        gap: 12,
                        alignItems: 'center',
                        padding: 14,
                        border: '1px solid #e5e7eb',
                        borderRadius: 14,
                        background: '#fff',
                        boxShadow:'0 8px 30px rgba(0,0,0,0.04)'
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 800, color:'#0f172a' }}>{item.product.name}</div>
                        <div style={{ fontSize:12, color:'#64748b', marginTop:4 }}>Narx: {formatPrice(item.product.refferal_price)}</div>
                      </div>
                      <div
                        style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}
                        aria-label="Miqdor"
                      >
                        <button
                          onClick={() => handleDecrease(item.productId, item.quantity)}
                          style={{ height:36, width:36, borderRadius:10, border:'1px solid #d1d5db', background:'#fff' }}
                        >
                          −
                        </button>
                        <strong style={{ minWidth: 28, textAlign: 'center' }}>{item.quantity}</strong>
                        <button
                          onClick={() => handleIncrease(item.productId, item.quantity)}
                          style={{ height:36, width:36, borderRadius:10, border:'1px solid #d1d5db', background:'#fff' }}
                        >
                          +
                        </button>
                      </div>
                      <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                        <div style={{ fontWeight: 800, color: '#111827' }}>{formatPrice(subtotal)}</div>
                        <button onClick={() => removeFromCart(item.productId)} className={cn.btn_secondary}>O'chirish</button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <aside>
              <div style={{
                position:'sticky', top:16, padding:16, background:'#fff', border:'1px solid #e5e7eb', borderRadius:14,
                boxShadow:'0 8px 30px rgba(0,0,0,0.04)', display:'grid', gap:12
              }}>
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                  <div style={{ color:'#64748b', fontWeight:700 }}>Jami</div>
                  <div style={{ fontSize:20, fontWeight:900 }}>{formatPrice(total)}</div>
                </div>
                <button className={cn.primary_btn} style={{ height:44 }}>Buyurtmani rasmiylashtirish</button>
                <div style={{ fontSize:12, color:'#64748b' }}>Yetkazib berish narxi kassada hisoblanadi.</div>
              </div>
            </aside>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Cart;
