import React, { memo, useMemo, useCallback } from "react";
import { useProducts } from "../hooks/useProducts";
import ProductCard from "./ui/ProductCard";
import SkeletonGrid from "./SkeletonGrid";
// CSS module removed - using Tailwind utilities

const ProductsListComponent: React.FC = () => {
  const { products, loading, error, refetch } = useProducts();
  
  const handleToggleLike = useCallback((productId: string) => {
    // Логика переключения лайка обрабатывается в AppContext
    // Этот callback оставлен для совместимости
  }, []);
  
  const productCards = useMemo(() => {
    if (!products || products.length === 0) return null;
    
    return products.map((product, index) => {
      const uniqueKey = product?.variant_id 
        ? `${product.product_id}_${product.variant_id}` 
        : product?.product_id || `product-${index}`;
      return (
        <ProductCard
          key={uniqueKey}
          product={product}
          onToggleLike={handleToggleLike}
        />
      );
    });
  }, [products, handleToggleLike]);
  if (loading) {
    return <SkeletonGrid count={8} columns={4} />;
  }
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center p-10 text-center">
        <p className="mb-5 text-red-600">Ошибка: {error}</p>
        <button 
          className="bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600 transition-colors"
          onClick={refetch}
        >
          Попробовать снова
        </button>
      </div>
    );
  }
  if (!products || products.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-10 text-center">
        <p className="mb-5 text-gray-500">Продукты не найдены</p>
        <button 
          className="bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600 transition-colors"
          onClick={refetch}
        >
          Обновить
        </button>
      </div>
    );
  }
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4 lg:gap-5 items-stretch">
      {productCards}
    </div>
  );
};

export const ProductsList = memo(ProductsListComponent);
ProductsList.displayName = 'ProductsList';

export default ProductsList;
