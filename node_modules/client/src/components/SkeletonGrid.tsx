import React from 'react';
import ProductSkeleton from './ProductSkeleton';
import cn from '../pages/style.module.scss';
interface SkeletonGridProps {
  count?: number;
  columns?: number;
}
export const SkeletonGrid: React.FC<SkeletonGridProps> = ({ 
  count = 8, 
  columns = 4 
}) => {
  return (
    <div 
      className={cn.products_grid}
      style={{
        gridTemplateColumns: `repeat(${columns}, 1fr)`,
        gap: '20px'
      }}
    >
      <ProductSkeleton count={count} />
    </div>
  );
};
export default SkeletonGrid;