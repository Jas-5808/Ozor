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
  onBuyNow: (qty: number, extra?: { city?: string; order_region?: string }) => void;
  onAddToCart: (qty: number) => void;
}

export default function OrderDialog({ open, onClose, product, variant, deliveryPrice, onBuyNow, onAddToCart }: Props) {
  const [qty, setQty] = useState<number>(1);
  const [busy, setBusy] = useState<boolean>(false);
  const price = variant?.price ?? product.price ?? 0;
  const { state } = useApp();
  const hasCity = Boolean(state.location.data?.city);
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
      <div className={s.dialog} onClick={(e)=>e.stopPropagation()}>
        {stage === 'review' ? (
          <>
            <div className={s.row}>
              <img className={s.thumb} src={image} alt={product.product_name} />
              <div>
                <div className={profile.productTitle + ' ' + s.name}>{product.product_name}</div>
                <div className={profile.meta + ' ' + s.meta}>{variant?.attribute_values?.map(av => av.value).join(', ') || product.product_description?.slice(0, 80)}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div className={profile.textDark + ' ' + s.price}>{formatPrice(price)} so`m</div>
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
              <strong>{formatPrice(total)} so`m</strong>
            </div>

            <div className={profile.actions + ' ' + s.actions}>
              <button
                type="button"
                className={s.primary}
                disabled={busy}
                onClick={async ()=>{
                  if (busy) return;
                  if (!hasCity) {
                    setStage('location');
                    return;
                  }
                  try {
                    setBusy(true);
                    await Promise.resolve(onBuyNow(qty));
                    onClose();
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                {busy ? 'Iltimos, kuting...' : 'Hozir sotib olish'}
              </button>
              <button
                type="button"
                className={s.secondary}
                disabled={busy}
                onClick={async ()=>{
                  if (busy) return;
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
                disabled={busy || !fallbackCityCode}
                onClick={async ()=>{
                  if (busy || !fallbackCityCode) return;
                  try {
                    setBusy(true);
                    await Promise.resolve(onBuyNow(qty, { city: fallbackCityCode }));
                    onClose();
                  } finally {
                    setBusy(false);
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


