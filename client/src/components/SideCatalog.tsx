import React, { useEffect, useState } from "react";
import cn from "./mainCss.module.scss";
import { useCategories, getMainCategories, getSubcategories } from "../hooks/useCategories";
interface SideCatalogProps {
  open: boolean;
  onClose: () => void;
}
export default function SideCatalog({ open, onClose }: SideCatalogProps) {
  const [isVisible, setIsVisible] = useState(open);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const { categories, loading } = useCategories();
  useEffect(() => {
    if (open) {
      setIsVisible(true);
    } else {
      const timer = setTimeout(() => setIsVisible(false), 200);
      return () => clearTimeout(timer);
    }
  }, [open]);
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [open]);
  const toggleCategory = (categoryId: string) => {
    setExpandedCategories(prev => {
      const newSet = new Set(prev);
      if (newSet.has(categoryId)) {
        newSet.delete(categoryId);
      } else {
        newSet.add(categoryId);
      }
      return newSet;
    });
  };
  const mainCategories = getMainCategories(categories);
  if (!isVisible && !open) return null;
  return (
    <>
      <div 
        className={cn.sideCatalog_overlay} 
        onClick={onClose}
        style={{ opacity: open ? 1 : 0, transition: "opacity .2s ease" }}
      />
      <div 
        className={`${cn.sideCatalog_panel} ${open ? cn.open : cn.close}`}
      >
        <div className={cn.sideCatalog_header}>
          <span>Каталог</span>
          <button 
            className={cn.sideCatalog_close}
            onClick={onClose}
            aria-label="Закрыть каталог"
          >
            ×
          </button>
        </div>
        <div className={cn.sideCatalog_list}>
          {loading ? (
            <div className={cn.sideCatalog_loading}>
              Загрузка категорий...
            </div>
          ) : (
            mainCategories.map((category) => {
              const subcategories = getSubcategories(categories, category.id);
              const isExpanded = expandedCategories.has(category.id);
              const hasSubcategories = subcategories.length > 0;
              return (
                <div key={category.id} className={cn.sideCatalog_category}>
                  <div 
                    className={`${cn.sideCatalog_item} ${hasSubcategories ? cn.sideCatalog_item_with_sub : ''}`}
                    onClick={() => hasSubcategories ? toggleCategory(category.id) : undefined}
                  >
                    <span>{category.name}</span>
                    {hasSubcategories && (
                      <span className={`${cn.sideCatalog_arrow} ${isExpanded ? cn.sideCatalog_arrow_expanded : ''}`}>
                        ▼
                      </span>
                    )}
                  </div>
                  {hasSubcategories && isExpanded && (
                    <div className={cn.sideCatalog_subcategories}>
                      {subcategories.map((subcategory) => (
                        <a 
                          key={subcategory.id} 
                          href={`/category/${subcategory.id}`}
                          className={cn.sideCatalog_subcategory}
                          onClick={onClose}
                        >
                          {subcategory.name}
                          <span className={cn.sideCatalog_count}>
                            ({subcategory.products_count})
                          </span>
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </>
  );
}
