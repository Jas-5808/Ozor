import React from 'react';
import cn from '../pages/style.module.scss';
interface ProductSkeletonProps {
  count?: number;
}
export const ProductSkeleton: React.FC<ProductSkeletonProps> = ({ count = 1 }) => {
  const skeletons = Array.from({ length: count }, (_, index) => (
    <div key={index} className={cn.card_skeleton}>
      <div className={cn.skeleton_image}></div>
      <div className={cn.skeleton_content}>
        <div className={cn.skeleton_price}></div>
        <div className={cn.skeleton_quantity}></div>
        <div className={cn.skeleton_title}></div>
        <div className={cn.skeleton_description}></div>
        <div className={cn.skeleton_rating}></div>
        <div className={cn.skeleton_button}></div>
      </div>
    </div>
  ));
  return <>{skeletons}</>;
};
export default ProductSkeleton;