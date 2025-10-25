import React from "react";
import ProductSkeleton from "./ProductSkeleton";

interface SkeletonGridProps {
  count?: number;
  columns?: number;
}

export const SkeletonGrid: React.FC<SkeletonGridProps> = ({
  count = 8,
  columns = 4,
}) => {
  return (
    <div
      className="grid gap-3 sm:gap-4 lg:gap-5"
      style={{
        gridTemplateColumns: `repeat(${columns}, 1fr)`,
      }}
    >
      <ProductSkeleton count={count} />
    </div>
  );
};
export default SkeletonGrid;
