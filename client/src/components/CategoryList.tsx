import React from 'react';
import { useTranslation } from 'react-i18next';
// CSS module removed - using Tailwind utilities
import { useCategories, getMainCategories } from '../hooks/useCategories';
import { getCategoryImageUrl } from '../utils/helpers';
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
  const { i18n } = useTranslation();
  const { categories, loading, error } = useCategories();
  const mainCategories = getMainCategories(categories);
  const sortedMainCategories = [...mainCategories].sort((a, b) => {
    const nameA = (i18n.language?.split("-")[0] === "uz" ? a.name : (a.name_ru || a.name));
    const nameB = (i18n.language?.split("-")[0] === "uz" ? b.name : (b.name_ru || b.name));
    return nameA.localeCompare(nameB, "ru");
  });
  
  const getCategoryName = (category: typeof sortedMainCategories[0]) => {
    return i18n.language?.split("-")[0] === "uz" ? category.name : (category.name_ru || category.name);
  };
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
          {sortedMainCategories.map((category) => {
            const categoryName = getCategoryName(category);
            const categoryImage = getCategoryImageUrl(category.image);
            return (
              <li
                key={category.id}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg cursor-pointer transition-colors hover:bg-gray-100 ${
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
                {categoryImage && (
                  <img 
                    src={categoryImage} 
                    alt={categoryName}
                    className="w-6 h-6 object-contain flex-shrink-0"
                    onError={(e) => {
                      // Hide image on error
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                )}
                <span>{categoryName}</span>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
};
export default CategoryList;
