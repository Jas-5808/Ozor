import React from "react";
import { useProducts } from "../hooks/useProducts";
import ProductCard from "./ui/ProductCard";
import SkeletonGrid from "./SkeletonGrid";
// CSS module removed - using Tailwind utilities
export const ProductsList: React.FC = () => {
  const { products, loading, error, refetch } = useProducts();
  const handleToggleLike = (productId: string) => {
    console.log("Переключен лайк для:", productId);
  };
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
      {products.map((product, index) => {
        // Создаем уникальный ключ на основе product_id и variant_id
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
      })}
    </div>
  );
};
export default ProductsList;
