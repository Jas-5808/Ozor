import React, { useRef, useState, useEffect } from "react";
import cn from "./mainCss.module.css";
import CategoryList from "./CategoryList";
import SubcategoriesPanel from "./SubcategoriesPanel";
import { useCategories } from "../hooks/useCategories";
import SideCatalog from "./SideCatalog";
import { useApp } from "../context/AppContext";
import { useAuth } from "../hooks/useAuth";
export function Header() {
  const [isOpen, setIsOpen] = useState(false);
  const [selected, setSelected] = useState({
    img: "/icons/uzb.png",
    label: "UZS",
    value: "uz",
  });
  const [selectedCategoryId, setSelectedCategoryId] = useState<
    string | undefined
  >();
  const [hoveredCategoryId, setHoveredCategoryId] = useState<string | null>(
    null
  );
  const [selectedSubcategoryId, setSelectedSubcategoryId] = useState<
    string | undefined
  >();
  const [isHoveringSubcategories, setIsHoveringSubcategories] = useState(false);
  const { categories } = useCategories();
  const { state, showLocationModal } = useApp();
  const { isAuthenticated } = useAuth();
  const hideTimerRef = useRef<number | null>(null);
  const [isSideCatalogOpen, setIsSideCatalogOpen] = useState(false);
  const [isCompact, setIsCompact] = useState(false);
  const handleSelect = (value: string, img: string, label: string) => {
    setSelected({ value, img, label });
    setIsOpen(false);
  };
  const handleCategorySelect = (categoryId: string) => {
    setSelectedCategoryId(categoryId);
    setSelectedSubcategoryId(undefined);
    console.log("Выбрана категория:", categoryId);
  };
  const handleCategoryHover = (categoryId: string | null) => {
    if (categoryId) {
      if (hideTimerRef.current) {
        clearTimeout(hideTimerRef.current);
        hideTimerRef.current = null;
      }
      setHoveredCategoryId(categoryId);
      return;
    }
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
    }
    hideTimerRef.current = window.setTimeout(() => {
      if (!isHoveringSubcategories) {
        setHoveredCategoryId(null);
      }
      hideTimerRef.current = null;
    }, 180);
  };
  const handleSubcategorySelect = (subcategoryId: string) => {
    setSelectedSubcategoryId(subcategoryId);
    console.log("Выбрана подкатегория:", subcategoryId);
  };
  const handleSubcategoriesMouseEnter = () => {
    setIsHoveringSubcategories(true);
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
  };
  const handleSubcategoriesMouseLeave = () => {
    setIsHoveringSubcategories(false);
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
    }
    hideTimerRef.current = window.setTimeout(() => {
      setHoveredCategoryId(null);
      hideTimerRef.current = null;
    }, 150);
  };
  useEffect(() => {
    const onScroll = () => {
      setIsCompact(window.scrollY > 10);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  return (
    <>
      <header className={`${cn.header} ${isCompact ? cn.header_compact : ""}`}>
        <div className="container">
          <div className={cn.header_content}>
            <div className={cn.header_location}>
              <div
                className={cn.loc}
                onClick={showLocationModal}
                style={{ cursor: "pointer" }}
                title="Нажмите, чтобы изменить местоположение"
              >
                <img src="/icons/location.svg" alt="" />
                <p>
                  {state.location.data?.address ||
                    "Местоположение не определено"}
                </p>
              </div>
              <div className={cn.select}>
                <div className={cn.selected} onClick={() => setIsOpen(!isOpen)}>
                  <img src={selected.img} alt={selected.value} />{" "}
                  {selected.label}
                </div>
                {isOpen && (
                  <ul className={cn.options}>
                    <p>Язык</p>
                    <li
                      onClick={() =>
                        handleSelect("uz", "/icons/uzb.png", "UZS")
                      }
                    >
                      UZ <span>Oʻzbek</span>
                    </li>
                    <li
                      onClick={() => handleSelect("ru", "/icons/ru.png", "RU")}
                    >
                      RU <span>Русский</span>
                    </li>
                  </ul>
                )}
              </div>
            </div>
            <div className={cn.header_main}>
              <div>
                <a href="/" className={cn.logo}>
                  OZOR
                </a>

                <div className={cn.select}>
                  <div
                    className={cn.selected}
                    onClick={() => setIsOpen(!isOpen)}
                  >
                    <img src={selected.img} alt={selected.value} />{" "}
                    {selected.label}
                  </div>
                  {isOpen && (
                    <ul className={cn.options}>
                      <p>Язык</p>
                      <li
                        onClick={() =>
                          handleSelect("uz", "/icons/uzb.png", "UZS")
                        }
                      >
                        UZ <span>Oʻzbek</span>
                      </li>
                      <li
                        onClick={() =>
                          handleSelect("ru", "/icons/ru.png", "RU")
                        }
                      >
                        RU <span>Русский</span>
                      </li>
                    </ul>
                  )}
                </div>
              </div>

              <div
                className={cn.catalog}
                onClick={() => setIsSideCatalogOpen((prev) => !prev)}
              >
                <img src="/icons/burger.svg" alt="" />
                <p>Katalog</p>
              </div>
              <form action="/search" method="get">
                <input type="text" name="q" placeholder="Uzbmarketda izlash" />
                <button type="submit">
                  <img src="/icons/search.svg" alt="" />
                </button>
              </form>
              <ul className={cn.header_link}>
                {isAuthenticated ? (
                  <li>
                    <a href="/profile">
                      <img src="/icons/user.svg" alt="" />
                      Profil
                    </a>
                  </li>
                ) : (
                  <li>
                    <a href="/login">
                      <img src="/icons/user.svg" alt="" />
                      Kirish
                    </a>
                  </li>
                )}
                <li>
                  <a href="#">
                    <img src="/icons/like.svg" alt="" />
                    Saralangan
                  </a>
                </li>
                <li>
                  <a href="#">
                    <img src="/icons/korzinka.svg" alt="" />
                    Savat
                  </a>
                </li>
              </ul>
            </div>
          </div>
        </div>
        <div className={cn.category_container}>
          <CategoryList
            onCategorySelect={handleCategorySelect}
            selectedCategoryId={selectedCategoryId}
            onCategoryHover={handleCategoryHover}
          />
          <SubcategoriesPanel
            categories={categories}
            parentCategoryId={hoveredCategoryId}
            onSubcategorySelect={handleSubcategorySelect}
            selectedSubcategoryId={selectedSubcategoryId}
            isVisible={!!hoveredCategoryId || isHoveringSubcategories}
            onMouseEnter={handleSubcategoriesMouseEnter}
            onMouseLeave={handleSubcategoriesMouseLeave}
          />
        </div>
      </header>
      <div className={cn.header_menu}>
        <div className="container">
          <div className={cn.menu_container}>
            <ul className={cn.menu_link}>
              <li>
                <a href="#">
                  <img src="/icons/home.png" alt="" />
                </a>
              </li>
              <li>
                <a href="#">
                  <img src="/icons/catalog.png" alt="" />
                </a>
              </li>
              <li>
                <a href="#">
                  <img src="/icons/korzinka2.svg" alt="" />
                </a>
              </li>
              <li>
                <a href="#">
                  <img src="/icons/like4.svg" alt="" />
                </a>
              </li>
              <li>
                <a href={isAuthenticated ? "/profile" : "/login"}>
                  <img src="/icons/user2.svg" alt="" />
                </a>
              </li>
            </ul>
          </div>
        </div>
      </div>
      <SideCatalog
        open={isSideCatalogOpen}
        onClose={() => setIsSideCatalogOpen(false)}
      />
    </>
  );
}
export default Header;
