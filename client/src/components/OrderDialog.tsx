import React, { useMemo, useState } from "react";
import ReactDOM from "react-dom";
// @ts-ignore – модуль стилей объявлен через d.ts
import s from "./OrderDialog.module.scss";
// @ts-ignore – модуль стилей объявлен через d.ts
import profile from "../pages/profile.module.scss";
import { ProductDetail } from "../types";
import { formatPrice, getProductImageUrl, getVariantMainImage } from "../utils/helpers";

interface Props {
  open: boolean;
  onClose: () => void;
  product: ProductDetail;
  variant: ProductDetail['variants'][0] | null;
  deliveryPrice?: number | null;
  onBuyNow: (qty: number) => void;
  onAddToCart: (qty: number) => void;
}

export default function OrderDialog({ open, onClose, product, variant, deliveryPrice, onBuyNow, onAddToCart }: Props) {
  const [qty, setQty] = useState<number>(1);
  const price = variant?.price ?? product.price ?? 0;

  const image = useMemo(() => {
    const fromVariant = getVariantMainImage(variant?.variant_media);
    return fromVariant || getProductImageUrl(product.main_image);
  }, [variant, product]);

  const total = useMemo(() => (price * qty) + (deliveryPrice ?? 0), [price, qty, deliveryPrice]);

  if (!open) return null;

  return ReactDOM.createPortal(
    <div className={profile.dialogOverlay} onClick={onClose}>
      <div className={profile.dialog + ' ' + s.dialog} onClick={(e)=>e.stopPropagation()}>
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
          <button type="button" className={profile.button} onClick={()=>{ onBuyNow(qty); onClose(); }}>Hozir sotib olish</button>
          <button type="button" className={profile.secondaryBlue} onClick={()=>{ onAddToCart(qty); onClose(); }}>Savatga qo'shish</button>
        </div>
      </div>
    </div>,
    document.body
  );
}


