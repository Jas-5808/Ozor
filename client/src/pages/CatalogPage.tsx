import React, { useMemo, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useCategories, getMainCategories, getSubcategories } from "../hooks/useCategories";
import cn from "../components/mainCss.module.scss";
import useSEO from "../hooks/useSEO";
import { Category } from "../types";

export function CatalogPage() {
  const { t, i18n } = useTranslation();
  // Оставляем SEO индексируемым, но возвращаем старый UI/дизайн
  useSEO({
    title: t("catalog.seoTitle"),
    description: t("home.seoDescription"),
    robots: "index,follow",
    canonical: typeof window !== "undefined" ? window.location.origin + "/catalog" : undefined,
  });
  
  const navigate = useNavigate();
  const [activeParent, setActiveParent] = useState<Category | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const { categories, loading } = useCategories();
  
  const getCategoryName = (cat: Category) => {
    return i18n.language?.split("-")[0] === "uz" ? cat.name : (cat.name_ru || cat.name);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const value = searchQuery.trim();
    if (!value) return;
    navigate(`/search?q=${encodeURIComponent(value)}`);
  };

  const mainCategories = getMainCategories(categories);
  const filteredCategories = useMemo(() => {
    if (searchQuery.trim()) {
      return mainCategories.filter((cat) => {
        const catName = getCategoryName(cat).toLowerCase();
        const searchLower = searchQuery.toLowerCase();
        return catName.includes(searchLower) ||
          getSubcategories(categories, cat.id).some((sub) => {
            const subName = i18n.language?.split("-")[0] === "uz" ? sub.name : (sub.name_ru || sub.name);
            return subName.toLowerCase().includes(searchLower);
          });
      });
    }
    return mainCategories;
  }, [searchQuery, mainCategories, categories, i18n.language]);

  const currentSubcategories = activeParent ? getSubcategories(categories, activeParent.id) : [];

  const handleCategoryClick = (category: Category) => {
    const hasSubcategories = getSubcategories(categories, category.id).length > 0;
    if (hasSubcategories) {
      setActiveParent(category);
    } else {
      navigate(`/category/${category.id}`);
    }
  };

  const handleSubcategoryClick = (subcategoryId: string) => {
    navigate(`/category/${subcategoryId}`);
  };

  return (
    <div className={cn.mobileCatalogPage}>
      {/* Поиск сверху */}
      <div className={cn.mobileCatalogSearch}>
        <Link to="/" className={cn.mobileCatalogBack}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
        </Link>
        <form onSubmit={handleSearch} className={cn.mobileCatalogSearchForm}>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t("catalog.searchPlaceholder")}
            className={cn.mobileCatalogSearchInput}
          />
          <button type="submit" className={cn.mobileCatalogSearchButton}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.35-4.35" />
            </svg>
          </button>
        </form>
      </div>

      {/* Каталог */}
      <div className={cn.mobileCatalogContent}>
        <div className={cn.mobileCatalogHeader}>
          <h2>{activeParent ? getCategoryName(activeParent) : t("catalog.header")}</h2>
          {activeParent && (
            <button
              type="button"
              onClick={() => setActiveParent(null)}
              className="mt-2 inline-flex items-center gap-2 text-sm font-semibold text-[#04734b]"
            >
              <span className="inline-block rotate-180">➜</span>
              {t("common.actions.back") || "Назад"}
            </button>
          )}
        </div>
        <div className={cn.mobileCatalogList}>
          {loading ? (
            <div className={cn.mobileCatalogLoading}>{t("catalog.loading")}</div>
          ) : activeParent ? (
            currentSubcategories.length === 0 ? (
              <div className={cn.mobileCatalogEmpty}>
                <p>{t("catalog.empty")}</p>
              </div>
            ) : (
              currentSubcategories.map((subcategory) => {
                const subName = i18n.language?.split("-")[0] === "uz" ? subcategory.name : (subcategory.name_ru || subcategory.name);
                return (
                  <div key={subcategory.id} className={cn.mobileCatalogCategory}>
                    <button
                      type="button"
                      className={cn.mobileCatalogSubcategory}
                      onClick={() => handleSubcategoryClick(subcategory.id)}
                    >
                      {subName}
                    </button>
                  </div>
                );
              })
            )
          ) : filteredCategories.length === 0 ? (
            <div className={cn.mobileCatalogEmpty}>
              <p>{t("catalog.empty")}</p>
            </div>
          ) : (
            filteredCategories.map((category) => {
              const subcategories = getSubcategories(categories, category.id);
              const hasSubcategories = subcategories.length > 0;
              const categoryName = getCategoryName(category);
              return (
                <div key={category.id} className={cn.mobileCatalogCategory}>
                  <div className={`${cn.mobileCatalogItem} ${hasSubcategories ? cn.mobileCatalogItemWithSub : ""}`}>
                    <button
                      type="button"
                      onClick={() => handleCategoryClick(category)}
                      className="flex-1 text-left hover:text-[#04734b] transition"
                    >
                      {categoryName}
                    </button>
                  </div>
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

