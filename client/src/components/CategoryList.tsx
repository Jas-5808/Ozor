import React from 'react';
// CSS module removed - using Tailwind utilities
import { useCategories, getMainCategories } from '../hooks/useCategories';
interface CategoryListProps {
  onCategorySelect?: (categoryId: string) => void;
  selectedCategoryId?: string;
  onCategoryHover?: (categoryId: string | null) => void;
}
export const CategoryList: React.FC<CategoryListProps> = ({
  onCategorySelect,
  selectedCategoryId,
  onCategoryHover,
}) => {
  const { categories, loading, error } = useCategories();
  const mainCategories = getMainCategories(categories);
  const handleCategoryClick = (categoryId: string) => {
    if (onCategorySelect) {
      onCategorySelect(categoryId);
    }
  };
  const handleCategoryHover = (categoryId: string | null) => {
    if (onCategoryHover) {
      onCategoryHover(categoryId);
    }
  };
  if (loading) {
    return (
      <div className="bg-white py-4">
        <div className="container">
          <ul className="flex flex-wrap gap-2">
            {Array.from({ length: 6 }, (_, index) => (
              <li key={index} className="h-10 bg-gray-200 rounded-lg animate-pulse flex-1 min-w-[120px]"></li>
            ))}
          </ul>
        </div>
      </div>
    );
  }
  if (error) {
    return (
      <div className="bg-white py-4">
        <div className="container">
          <ul className="flex flex-wrap gap-2">
            <li className="text-red-600">Ошибка загрузки категорий</li>
          </ul>
        </div>
      </div>
    );
  }
  return (
    <div className="bg-white py-4">
      <div className="container">
        <ul className="flex flex-wrap gap-2">
          {mainCategories.slice(0, 5).map((category) => (
            <li
              key={category.id}
              className={`px-4 py-2 rounded-lg cursor-pointer transition-colors hover:bg-gray-100 ${
                selectedCategoryId === category.id ? 'bg-blue-100 text-blue-600' : 'text-gray-700'
              }`}
              data-has-subcategories={category.subcategories_count > 0}
              onClick={() => handleCategoryClick(category.id)}
              onMouseEnter={() => {
                if (category.subcategories_count > 0) {
                  handleCategoryHover(category.id);
                }
              }}
              onMouseLeave={() => handleCategoryHover(null)}
            >
              {category.name}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};
export default CategoryList;
