import React from 'react';
import { useTranslation } from 'react-i18next';
// CSS module removed - using Tailwind utilities
import { getSubcategories } from '../hooks/useCategories';
import { getCategoryImageUrl } from '../utils/helpers';
interface SubcategoriesPanelProps {
  categories: any[];
  parentCategoryId: string | null;
  onSubcategorySelect?: (categoryId: string) => void;
  selectedSubcategoryId?: string;
  isVisible: boolean;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
}
export const SubcategoriesPanel: React.FC<SubcategoriesPanelProps> = ({
  categories,
  parentCategoryId,
  onSubcategorySelect,
  selectedSubcategoryId,
  isVisible,
  onMouseEnter,
  onMouseLeave,
}) => {
  const { i18n } = useTranslation();
  if (!isVisible || !parentCategoryId) {
    return null;
  }
  const subcategories = getSubcategories(categories, parentCategoryId);
  if (subcategories.length === 0) {
    return null;
  }
  const handleSubcategoryClick = (categoryId: string) => {
    if (onSubcategorySelect) {
      onSubcategorySelect(categoryId);
    }
  };
  return (
    <div 
      className="bg-white border-t border-gray-200 p-4"
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <div className="container">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {subcategories.map((subcategory) => {
            const subName = i18n.language?.split("-")[0] === "uz" ? subcategory.name : (subcategory.name_ru || subcategory.name);
            const subImage = getCategoryImageUrl(subcategory.image);
            return (
              <div
                key={subcategory.id}
                className={`p-3 rounded-lg border cursor-pointer transition-colors hover:bg-gray-50 ${
                  selectedSubcategoryId === subcategory.id 
                    ? 'bg-blue-100 border-blue-300 text-blue-600' 
                    : 'border-gray-200 text-gray-700'
                }`}
                onClick={() => handleSubcategoryClick(subcategory.id)}
              >
                {subImage && (
                  <div className="mb-2 flex justify-center">
                    <img 
                      src={subImage} 
                      alt={subName}
                      className="w-12 h-12 object-contain"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  </div>
                )}
                <div className="font-medium text-sm mb-1">
                  {subName}
                </div>
                <div className="text-xs text-gray-500">
                  {subcategory.products_count} товаров
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
export default SubcategoriesPanel;
