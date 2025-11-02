import React, { useEffect, useMemo, useState } from "react";
import ReactDOM from "react-dom";
// @ts-ignore – модуль стилей объявлен через d.ts
import s from "./OrderDialog.module.scss";
// @ts-ignore – модуль стилей объявлен через d.ts
import profile from "../pages/style.module.scss";
import { ProductDetail } from "../types";
import { formatPrice, getProductImageUrl, getVariantMainImage } from "../utils/helpers";
import { useApp } from "../context/AppContext";

interface Props {
  open: boolean;
  onClose: () => void;
  product: ProductDetail;
  variant: ProductDetail['variants'][0] | null;
  deliveryPrice?: number | null;
  onBuyNow: (qty: number, extra?: { city?: string; order_region?: string; comment?: string }) => void;
  onAddToCart: (qty: number) => void;
}

export default function OrderDialog({ open, onClose, product, variant, deliveryPrice, onBuyNow, onAddToCart }: Props) {
  const [qty, setQty] = useState<number>(1);
  const [busy, setBusy] = useState<boolean>(false);
  const [success, setSuccess] = useState<boolean>(false);
  const price = variant?.price ?? product.price ?? 0;
  const { state } = useApp();
  const hasCity = Boolean(state.location.data?.city);
  const hasSelectedAddress = Boolean(state.delivery?.selectedAddress);
  const [fallbackCityCode, setFallbackCityCode] = useState<string>("");
  const [stage, setStage] = useState<'review' | 'location'>("review");

  const ORDER_CITY: Array<{ value: string; label: string }> = [
    { value: 'tashkent', label: 'Ташкент' },
    { value: 'tashkent_region', label: 'Ташкентская область' },
    { value: 'samarkand', label: 'Самарканд' },
    { value: 'bukhara', label: 'Бухара' },
    { value: 'andijan', label: 'Андижан' },
    { value: 'fergana', label: 'Фергана' },
    { value: 'namangan', label: 'Наманган' },
    { value: 'navoiy', label: 'Навои' },
    { value: 'kashkadarya', label: 'Кашкадарья' },
    { value: 'surkhandarya', label: 'Сурхандарья' },
    { value: 'sirdarya', label: 'Сырдарья' },
    { value: 'jizzakh', label: 'Джизак' },
    { value: 'khorezm', label: 'Хорезм' },
    { value: 'karakalpakstan', label: 'Каракалпакстан' },
  ];

  const image = useMemo(() => {
    const fromVariant = getVariantMainImage(variant?.variant_media);
    return fromVariant || getProductImageUrl(product.main_image);
  }, [variant, product]);

  const total = useMemo(() => (price * qty) + (deliveryPrice ?? 0), [price, qty, deliveryPrice]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  if (!open) return null;

  return ReactDOM.createPortal(
    <div className={s.overlay} onClick={onClose}>
      <div className={s.dialog} onClick={(e)=>e.stopPropagation()} style={{ position: 'relative' }}>
        {success && (
          <div role="status" aria-live="polite" className={s.successLayer}>
            <div className={s.confetti} aria-hidden>
              <span></span><span></span><span></span><span></span>
              <span></span><span></span><span></span><span></span>
            </div>
            <div className={s.successWrap}>
              <svg width="96" height="96" viewBox="0 0 96 96" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="48" cy="48" r="42" stroke="#10b981" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="264 264">
                  <animate attributeName="stroke-dasharray" from="0 264" to="264 264" dur="0.6s" fill="freeze" />
                </circle>
                <path d="M30 50 L44 64 L68 40" stroke="#10b981" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="80 80">
                  <animate attributeName="stroke-dasharray" from="0 80" to="80 80" dur="0.4s" begin="0.4s" fill="freeze" />
                </path>
              </svg>
              <div className={s.successText}>Xarid muvaffaqiyatli</div>
            </div>
          </div>
        )}
        {stage === 'review' ? (
          <>
            <div className={s.row}>
              <img className={s.thumb} src={image} alt={product.product_name} />
              <div>
                <div className={profile.productTitle + ' ' + s.name}>{product.product_name}</div>
                <div className={profile.meta + ' ' + s.meta}>{variant?.attribute_values?.map(av => av.value).join(', ') || product.product_description?.slice(0, 80)}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div className={profile.textDark + ' ' + s.price}>{formatPrice(price)}</div>
                {deliveryPrice ? <div className={profile.small + ' ' + s.muted}>+ {formatPrice(deliveryPrice)} dostavka</div> : null}
              </div>
            </div>

            <div className={s.qty}>
              <span className={profile.small + ' ' + s.muted}>Miqdor</span>
              <div className={s.qtyCtrl}>
                <button type="button" className={profile.secondaryBlue + ' ' + s.qtyBtn} onClick={()=>setQty(q=>Math.max(1, q-1))}>-</button>
                <strong>{qty}</strong>
                <button type="button" className={profile.secondaryBlue + ' ' + s.qtyBtn} onClick={()=>setQty(q=>Math.min(99, q+1))}>+</button>
              </div>
            </div>

            <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span>Jami</span>
              <strong>{formatPrice(total)}</strong>
            </div>

            <div className={profile.actions + ' ' + s.actions}>
              <button
                type="button"
                className={s.primary}
                disabled={busy || success}
                onClick={async ()=>{
                  if (busy || success) return;
                  if (!hasCity || !hasSelectedAddress) {
                    setStage('location');
                    return;
                  }
                  try {
                    setBusy(true);
                    await Promise.resolve(onBuyNow(qty));
                    setSuccess(true);
                    setBusy(false);
                    setTimeout(()=>{ setSuccess(false); onClose(); }, 1200);
                  } finally {
                    // keep toast visible
                  }
                }}
              >
                {success ? 'Muvaffaqiyatli' : (busy ? 'Iltimos, kuting...' : 'Hozir sotib olish')}
              </button>
              <button
                type="button"
                className={s.secondary}
                disabled={busy || success}
                onClick={async ()=>{
                  if (busy || success) return;
                  try {
                    setBusy(true);
                    await Promise.resolve(onAddToCart(qty));
                    onClose();
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                {busy ? 'Iltimos, kuting...' : "Savatga qo'shish"}
              </button>
            </div>
          </>
        ) : (
          <>
            <div className={s.notice}>
              <div className={s.noticeTitle}>Укажите город/регион доставки</div>
              <div className={s.noticeText}>Определение местоположения недоступно. Выберите вручную из списка.</div>
              <select className={s.select} value={fallbackCityCode} onChange={(e)=>setFallbackCityCode(e.target.value)}>
                <option value="">— Выбрать город/регион —</option>
                {ORDER_CITY.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
            <div className={profile.actions + ' ' + s.actions}>
              <button type="button" className={s.secondary} disabled={busy} onClick={()=>setStage('review')}>Назад</button>
              <button
                type="button"
                className={s.primary}
                disabled={busy || !fallbackCityCode || success}
                onClick={async ()=>{
                  if (busy || !fallbackCityCode || success) return;
                  try {
                    setBusy(true);
                    await Promise.resolve(onBuyNow(qty, { city: fallbackCityCode }));
                    setSuccess(true);
                    setBusy(false);
                    setTimeout(()=>{ setSuccess(false); onClose(); }, 1200);
                  } finally {
                    // keep toast visible
                  }
                }}
              >Продолжить</button>
            </div>
          </>
        )}
      </div>
    </div>,
    document.body
  );
}


