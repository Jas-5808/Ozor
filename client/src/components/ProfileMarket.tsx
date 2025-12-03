import React from 'react';
import cn from '../pages/profile.module.scss';
import ProductCard from './ui/ProductCard';
import SkeletonGrid from './SkeletonGrid';
import type { Product } from '../types';

interface ProfileMarketProps {
  products: Product[];
  productsLoading: boolean;
  productsError: string | null;
  onGenerate: (product: Product) => void;
  loadingProductId: string | null;
}

/**
 * Компонент маркета в профиле
 * Показывает список продуктов для создания реферальных ссылок
 */
export const ProfileMarket: React.FC<ProfileMarketProps> = ({
  products,
  productsLoading,
  productsError,
  onGenerate,
  loadingProductId,
}) => {
  if (productsLoading) {
    return <SkeletonGrid count={8} columns={4} />;
  }

  if (productsError) {
    return (
      <div className={cn.errorContainer}>
        <p>Ошибка: {productsError}</p>
      </div>
    );
  }

  if (!products || products.length === 0) {
    return (
      <div className={cn.emptyContainer}>
        <p>Продукты не найдены</p>
      </div>
    );
  }

  return (
    <div className={`grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2 sm:gap-3 md:gap-4 lg:gap-5 items-stretch ${cn.marketGrid}`}>
      {products.map((product) => (
        <div key={product.product_id} className={`flex flex-col ${cn.marketCardWrapper}`}>
          <div className={cn.marketCardInner}>
            <ProductCard product={product} />
          </div>
          <button
            onClick={() => onGenerate(product)}
            disabled={loadingProductId === product.product_id}
            className={cn.generateButton}
          >
            {loadingProductId === product.product_id ? 'Создание...' : 'Создать ссылку'}
          </button>
        </div>
      ))}
    </div>
  );
};

export default ProfileMarket;

