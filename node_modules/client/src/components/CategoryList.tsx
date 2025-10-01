import React from 'react';
import cn from './mainCss.module.css';
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
      <div className={cn.category}>
        <div className="container">
          <ul className={cn.list}>
            {Array.from({ length: 6 }, (_, index) => (
              <li key={index} className={cn.category_skeleton}></li>
            ))}
          </ul>
        </div>
      </div>
    );
  }
  if (error) {
    return (
      <div className={cn.category}>
        <div className="container">
          <ul className={cn.list}>
            <li>Ошибка загрузки категорий</li>
          </ul>
        </div>
      </div>
    );
  }
  return (
    <div className={cn.category}>
      <div className="container">
        <ul className={cn.list}>
          {mainCategories.slice(0, 5).map((category) => (
                         <li
               key={category.id}
               className={`${cn.category_item} ${
                 selectedCategoryId === category.id ? cn.category_active : ''
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