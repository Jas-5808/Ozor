import React from 'react';
import cn from './mainCss.module.css';
import { getSubcategories } from '../hooks/useCategories';
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
      className={cn.subcategories_panel}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <div className={cn.subcategories_content}>
          <div className={cn.subcategories_grid}>
            {subcategories.map((subcategory) => (
              <div
                key={subcategory.id}
                className={`${cn.subcategory_item} ${
                  selectedSubcategoryId === subcategory.id ? cn.subcategory_active : ''
                }`}
                onClick={() => handleSubcategoryClick(subcategory.id)}
              >
                <div className={cn.subcategory_name}>
                  {subcategory.name}
                </div>
                <div className={cn.subcategory_count}>
                  {subcategory.products_count} товаров
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
  );
};
export default SubcategoriesPanel;