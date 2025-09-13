import { useEffect, useMemo, useState } from "react";
import { useLocation, useParams } from "react-router-dom";
import cn from "./style.module.scss";
import { formatPrice, getProductImageUrl } from "../utils/helpers";
import { Product as ProductType } from "../types";
type LocationState = { product?: ProductType };
async function fetchProductById(id: string): Promise<ProductType | null> {
  return null;
}
export function Product() {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const state = (location.state ?? {}) as LocationState;
  const [fetchedProduct, setFetchedProduct] = useState<ProductType | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const productFromState = state?.product;
  const product = useMemo<ProductType | null>(() => {
    return productFromState ?? fetchedProduct ?? null;
  }, [productFromState, fetchedProduct]);
  useEffect(() => {
    let ignore = false;
    if (!productFromState && id) {
      setLoading(true);
      setError(null);
      fetchProductById(id)
        .then((p) => { if (!ignore) setFetchedProduct(p); })
        .catch((e) => { if (!ignore) setError(e instanceof Error ? e.message : "Ошибка загрузки"); })
        .finally(() => { if (!ignore) setLoading(false); });
    }
    return () => { ignore = true; };
  }, [id, productFromState]);
  return (
    <div className={cn.product}>
      <div className="container">
        {loading && <p>Загрузка товара…</p>}
        {error && <p className={cn.error}>Ошибка: {error}</p>}
        {!loading && !product && <h2>Товар {id ? `#${id}` : ""} не найден</h2>}
        {product && (
          <div className={cn.product_content}>
            <section className={cn.product_gallery}>
              <div className={cn.gallery_thumbs}>
                {[0,1,2,3,4].map((i) => (
                  <button key={i} className={cn.thumb} type="button" aria-label={`Превью ${i+1}`}>
                    <img src={getProductImageUrl(product.main_image)} alt="" />
                  </button>
                ))}
              </div>
              <div className={cn.gallery_main}>
                <img src={getProductImageUrl(product.main_image)} alt={product.name} />
              </div>
            </section>
            <section className={cn.product_info}>
              <h1 className={cn.product_title}>{product.name}</h1>
              <div className={cn.rating_row}>
                <img src="/icons/star.png" alt="" aria-hidden="true" />
                <strong>4.9</strong>
                <span className={cn.muted}>18 503 оценки</span>
              </div>
              <div className={cn.color_swatch} aria-label="Цвет">
                <span className={cn.swatch} />
              </div>
              <h3 className={cn.block_title}>Описание</h3>
              <p className={cn.product_desc}>
                {product.description ?? "Описание недоступно."}
              </p>
            </section>
            <aside className={cn.aside}>
              <div className={cn.buy_card}>
                <div className={cn.price_row}>
                  <span className={cn.price_icon} aria-hidden="true" />
                  <div className={cn.price_value}>
                    {formatPrice(product.base_price)} so`m
                  </div>
                </div>
                <div className={cn.delivery_hint}>
                  Yetkazib berish narxi: <strong>30 000</strong> so`m
                </div>
                <form className={cn.buy_form} onSubmit={(e)=>e.preventDefault()}>
                  <input className={cn.input} placeholder="Ismingiz" />
                  <input className={cn.input} placeholder="Telefon raqamingiz" />
                  <button type="submit" className={cn.primary_btn}>Buyurtma berish</button>
                </form>
              </div>
              <div className={cn.seller_card}>
                <div className={cn.seller_top}>
                  <div className={cn.seller_logo} />
                  <div className={cn.seller_meta}>
                    <div className={cn.seller_name}>Mediapark</div>
                    <div className={cn.seller_rating}>
                      <img src="/icons/star.png" alt="" aria-hidden="true" />
                      <strong>4.5</strong>
                      <span className={cn.muted}>1320 baho</span>
                    </div>
                  </div>
                </div>
                <button type="button" className={cn.seller_btn}>Do`konga o`tish</button>
              </div>
            </aside>
          </div>
        )}
      </div>
    </div>
  );
}
export default Product;
