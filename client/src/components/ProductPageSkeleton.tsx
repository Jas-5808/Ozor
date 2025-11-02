import React from 'react';
import cn from '../pages/style.module.scss';

export const ProductPageSkeleton: React.FC = () => {
  return (
    <div className={cn.product}>
      <div className="container">
        <div className={cn.product_content}>
          {/* Галерея */}
          <section className={cn.product_gallery}>
            <div className={cn.gallery_thumbs}>
              <div className={cn.skeleton_thumb}></div>
              <div className={cn.skeleton_thumb}></div>
              <div className={cn.skeleton_thumb}></div>
            </div>
            <div className={cn.gallery_main}>
              <div className={cn.skeleton_main_image}></div>
            </div>
          </section>

          {/* Информация о продукте */}
          <section className={cn.product_info}>
            <div className={cn.skeleton_title}></div>
            <div className={cn.skeleton_rating}></div>
            
            {/* Варианты */}
            <div className={cn.variants_section}>
              <div className={cn.skeleton_variant_group}>
                <div className={cn.skeleton_variant_title}></div>
                <div className={cn.skeleton_variant_values}>
                  <div className={cn.skeleton_variant_value}></div>
                  <div className={cn.skeleton_variant_value}></div>
                  <div className={cn.skeleton_variant_value}></div>
                </div>
              </div>
            </div>

            {/* Характеристики */}
            <div className={cn.specifications_section}>
              <div className={cn.skeleton_spec_title}></div>
              <div className={cn.specifications_list}>
                <div className={cn.skeleton_spec_item}></div>
                <div className={cn.skeleton_spec_item}></div>
                <div className={cn.skeleton_spec_item}></div>
              </div>
            </div>
          </section>

          {/* Боковая панель */}
          <aside className={cn.aside}>
            <div className={cn.buy_card}>
              <div className={cn.price_row}>
                <div className={cn.skeleton_price_icon}></div>
                <div className={cn.skeleton_price_value}></div>
              </div>
              <div className={cn.skeleton_delivery_hint}></div>
              <div className={cn.skeleton_stock}></div>
              <div className={cn.buy_form}>
                <div className={cn.skeleton_input}></div>
                <div className={cn.skeleton_input}></div>
                <div className={cn.skeleton_button}></div>
              </div>
            </div>
            <div className={cn.seller_card}>
              <div className={cn.seller_top}>
                <div className={cn.skeleton_seller_logo}></div>
                <div className={cn.skeleton_seller_meta}>
                  <div className={cn.skeleton_seller_name}></div>
                  <div className={cn.skeleton_seller_rating}></div>
                </div>
              </div>
              <div className={cn.skeleton_seller_button}></div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
};

export default ProductPageSkeleton;

