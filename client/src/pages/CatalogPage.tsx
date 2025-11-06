import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useCategories, getMainCategories, getSubcategories } from "../hooks/useCategories";
import cn from "../components/mainCss.module.scss";
import useSEO from "../hooks/useSEO";

export function CatalogPage() {
  useSEO({
    title: "Каталог — OZAR",
    robots: "noindex,nofollow",
    canonical: typeof window !== 'undefined' ? window.location.origin + '/catalog' : undefined,
  });
  
  const navigate = useNavigate();
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");
  const { categories, loading } = useCategories();


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

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const value = searchQuery.trim();
    if (!value) return;
    navigate(`/search?q=${encodeURIComponent(value)}`);
  };

  const mainCategories = getMainCategories(categories);
  const filteredCategories = searchQuery.trim()
    ? mainCategories.filter(cat => 
        cat.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        getSubcategories(categories, cat.id).some(sub => 
          sub.name.toLowerCase().includes(searchQuery.toLowerCase())
        )
      )
    : mainCategories;

  return (
    <div className={cn.mobileCatalogPage}>
      {/* Поиск сверху */}
      <div className={cn.mobileCatalogSearch}>
        <Link to="/" className={cn.mobileCatalogBack}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H5M12 19l-7-7 7-7"/>
          </svg>
        </Link>
        <form onSubmit={handleSearch} className={cn.mobileCatalogSearchForm}>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Искать в каталоге..."
            className={cn.mobileCatalogSearchInput}
          />
          <button type="submit" className={cn.mobileCatalogSearchButton}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8"/>
              <path d="m21 21-4.35-4.35"/>
            </svg>
          </button>
        </form>
      </div>

      {/* Каталог */}
      <div className={cn.mobileCatalogContent}>
        <div className={cn.mobileCatalogHeader}>
          <h2>Каталог</h2>
        </div>
        <div className={cn.mobileCatalogList}>
          {loading ? (
            <div className={cn.mobileCatalogLoading}>
              Загрузка категорий...
            </div>
          ) : filteredCategories.length === 0 ? (
            <div className={cn.mobileCatalogEmpty}>
              <p>Ничего не найдено</p>
            </div>
          ) : (
            filteredCategories.map((category) => {
              const subcategories = getSubcategories(categories, category.id);
              const isExpanded = expandedCategories.has(category.id);
              const hasSubcategories = subcategories.length > 0;
              return (
                <div key={category.id} className={cn.mobileCatalogCategory}>
                  <div 
                    className={`${cn.mobileCatalogItem} ${hasSubcategories ? cn.mobileCatalogItemWithSub : ''}`}
                    onClick={() => hasSubcategories ? toggleCategory(category.id) : undefined}
                  >
                    <span>{category.name}</span>
                    {hasSubcategories && (
                      <span className={`${cn.mobileCatalogArrow} ${isExpanded ? cn.mobileCatalogArrowExpanded : ''}`}>
                        ▼
                      </span>
                    )}
                  </div>
                  {hasSubcategories && isExpanded && (
                    <div className={cn.mobileCatalogSubcategories}>
                      {subcategories.map((subcategory) => (
                        <Link 
                          key={subcategory.id} 
                          to={`/category/${subcategory.id}`}
                          className={cn.mobileCatalogSubcategory}
                        >
                          {subcategory.name}
                          <span className={cn.mobileCatalogCount}>
                            ({subcategory.products_count})
                          </span>
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

export default CatalogPage;

