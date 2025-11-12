import React from 'react';

/**
 * Универсальный скелетон для страниц
 * Используется как fallback для lazy loading
 */
export const PageSkeleton: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header skeleton */}
        <div className="h-8 bg-gray-200 rounded-lg w-1/3 mb-6 animate-pulse" />
        
        {/* Content skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="bg-white rounded-lg p-4 shadow-sm">
              <div className="h-48 bg-gray-200 rounded-lg mb-4 animate-pulse" />
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-2 animate-pulse" />
              <div className="h-4 bg-gray-200 rounded w-1/2 animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default PageSkeleton;

