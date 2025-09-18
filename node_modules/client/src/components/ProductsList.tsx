import React from 'react';
import { useProducts } from '../hooks/useProducts';
import ProductCard from './ProductCard';
import SkeletonGrid from './SkeletonGrid';
import cn from '../pages/style.module.scss';
export const ProductsList: React.FC = () => {
  const { products, loading, error, refetch } = useProducts();
  const handleToggleLike = (productId: string) => {
    console.log('Переключен лайк для:', productId);
  };
  if (loading) {
    return <SkeletonGrid count={8} columns={4} />;
  }
  if (error) {
    return (
      <div className={cn.error_container}>
        <p>Ошибка: {error}</p>
        <button onClick={refetch} className={cn.retry_button}>
          Попробовать снова
        </button>
      </div>
    );
  }
  if (!products || products.length === 0) {
    return (
      <div className={cn.empty_container}>
        <p>Продукты не найдены</p>
        <button onClick={refetch} className={cn.retry_button}>
          Обновить
        </button>
      </div>
    );
  }
  return (
    <div className={cn.products_grid}>
      {products.map((product, index) => (
        <ProductCard
          key={product?.product_id || `product-${index}`}
          product={product}
          onToggleLike={handleToggleLike}
        />
      ))}
    </div>
  );
};
export default ProductsList;
