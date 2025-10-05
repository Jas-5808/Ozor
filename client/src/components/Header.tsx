import React, { useRef, useState, useEffect } from "react";
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
      <header
        className={`sticky top-0 z-50 transition-all duration-300 ${
          isCompact ? "py-2" : "py-4"
        } bg-[#434344]/70 backdrop-blur-2xl border-b border-white/10 shadow-[0_8px_30px_rgba(0,0,0,0.15)] text-white`}
      >
        <div className="max-w-[1240px] mx-auto px-5">
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div
                  onClick={showLocationModal}
                  className="flex items-center gap-2 cursor-pointer select-none"
                  title="Нажмите, чтобы изменить местоположение"
                >
                  <img src="/icons/location.svg" alt="" className="size-5" />
                  <p className="text-sm md:text-base">
                    {state.location.data?.address ||
                      "Местоположение не определено"}
                  </p>
                </div>
                <div className="relative">
                  <div
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/10 border border-white/10 backdrop-blur-md cursor-pointer"
                    onClick={() => setIsOpen(!isOpen)}
                  >
                    <img
                      src={selected.img}
                      alt={selected.value}
                      className="h-4 w-6 object-contain"
                    />
                    <span className="text-sm font-medium">
                      {selected.label}
                    </span>
                  </div>
                  {isOpen && (
                    <ul className="absolute mt-2 w-48 rounded-xl overflow-hidden right-0 bg-[#434344]/90 backdrop-blur-xl border border-white/10 shadow-lg">
                      <p className="px-3 pt-2 pb-1 text-xs uppercase tracking-wide text-white/70">
                        Язык
                      </p>
                      <li
                        className="px-3 py-2 hover:bg-white/10 cursor-pointer flex items-center justify-between"
                        onClick={() =>
                          handleSelect("uz", "/icons/uzb.png", "UZS")
                        }
                      >
                        <span>UZ</span>
                        <span className="text-white/70">Oʻzbek</span>
                      </li>
                      <li
                        className="px-3 py-2 hover:bg-white/10 cursor-pointer flex items-center justify-between"
                        onClick={() =>
                          handleSelect("ru", "/icons/ru.png", "RU")
                        }
                      >
                        <span>RU</span>
                        <span className="text-white/70">Русский</span>
                      </li>
                    </ul>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-4 flex-1 justify-end md:justify-between">
                <div className="flex items-center gap-6">
                  <a
                    href="/"
                    className="text-2xl font-extrabold tracking-tight"
                  >
                    OZOR
                  </a>

                  <div className="relative hidden md:block">
                    <div
                      className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/10 border border-white/10 backdrop-blur-md cursor-pointer"
                      onClick={() => setIsOpen(!isOpen)}
                    >
                      <img
                        src={selected.img}
                        alt={selected.value}
                        className="h-4 w-6 object-contain"
                      />
                      <span className="text-sm font-medium">
                        {selected.label}
                      </span>
                    </div>
                    {isOpen && (
                      <ul className="absolute mt-2 w-48 rounded-xl overflow-hidden left-0 bg-[#434344]/90 backdrop-blur-xl border border-white/10 shadow-lg">
                        <p className="px-3 pt-2 pb-1 text-xs uppercase tracking-wide text-white/70">
                          Язык
                        </p>
                        <li
                          className="px-3 py-2 hover:bg-white/10 cursor-pointer flex items-center justify-between"
                          onClick={() =>
                            handleSelect("uz", "/icons/uzb.png", "UZS")
                          }
                        >
                          <span>UZ</span>
                          <span className="text-white/70">Oʻzbek</span>
                        </li>
                        <li
                          className="px-3 py-2 hover:bg-white/10 cursor-pointer flex items-center justify-between"
                          onClick={() =>
                            handleSelect("ru", "/icons/ru.png", "RU")
                          }
                        >
                          <span>RU</span>
                          <span className="text-white/70">Русский</span>
                        </li>
                      </ul>
                    )}
                  </div>
                </div>

                <div
                  className="hidden md:flex items-center gap-2 px-3 py-2 rounded-xl bg-white/10 border border-white/10 backdrop-blur-xl cursor-pointer"
                  onClick={() => setIsSideCatalogOpen((prev) => !prev)}
                >
                  <img src="/icons/burger.svg" alt="" className="size-5" />
                  <p className="font-medium">Katalog</p>
                </div>

                <form
                  action="/search"
                  method="get"
                  className="flex-1 max-w-xl hidden md:flex"
                >
                  <div className="flex w-full items-center rounded-xl bg-white/10 border border-white/10 backdrop-blur-xl overflow-hidden">
                    <input
                      type="text"
                      name="q"
                      placeholder="Uzbmarketda izlash"
                      className="w-full bg-transparent placeholder-white/70 text-white px-4 py-2 outline-none"
                    />
                    <button
                      type="submit"
                      className="px-3 py-2 hover:bg-white/10"
                    >
                      <img src="/icons/search.svg" alt="" className="size-5" />
                    </button>
                  </div>
                </form>

                <ul className="flex items-center gap-5">
                  {isAuthenticated ? (
                    <li>
                      <a
                        href="/profile"
                        className="flex items-center gap-2 hover:text-white/80"
                      >
                        <img src="/icons/user.svg" alt="" className="size-5" />
                        <span>Profil</span>
                      </a>
                    </li>
                  ) : (
                    <li>
                      <a
                        href="/login"
                        className="flex items-center gap-2 hover:text-white/80"
                      >
                        <img src="/icons/user.svg" alt="" className="size-5" />
                        <span>Kirish</span>
                      </a>
                    </li>
                  )}
                  <li>
                    <a
                      href="/favorites"
                      className="flex items-center gap-2 hover:text-white/80"
                    >
                      <img src="/icons/like.svg" alt="" className="size-5" />
                      <span>Saralangan</span>
                    </a>
                  </li>
                  <li>
                    <a
                      href="/cart"
                      className="flex items-center gap-2 hover:text-white/80"
                    >
                      <img
                        src="/icons/korzinka.svg"
                        alt=""
                        className="size-5"
                      />
                      <span>Savat</span>
                    </a>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
        <div className="bg-[#434344]/60 backdrop-blur-xl border-t border-white/10">
          <div className="max-w-[1240px] mx-auto px-5">
            <div className="relative">
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
          </div>
        </div>
      </header>
      <div className="fixed bottom-0 inset-x-0 z-50 bg-[#434344]/80 backdrop-blur-2xl border-t border-white/10 md:hidden">
        <div className="max-w-[1240px] mx-auto px-5">
          <div className="py-2">
            <ul className="flex items-center justify-between">
              <li>
                <a href="#" className="block p-2">
                  <img src="/icons/home.png" alt="" className="h-6 w-6" />
                </a>
              </li>
              <li>
                <a href="#" className="block p-2">
                  <img src="/icons/catalog.png" alt="" className="h-6 w-6" />
                </a>
              </li>
              <li>
                <a href="/cart" className="block p-2">
                  <img src="/icons/korzinka2.svg" alt="" className="h-6 w-6" />
                </a>
              </li>
              <li>
                <a href="/favorites" className="block p-2">
                  <img src="/icons/like4.svg" alt="" className="h-6 w-6" />
                </a>
              </li>
              <li>
                <a
                  href={isAuthenticated ? "/profile" : "/login"}
                  className="block p-2"
                >
                  <img src="/icons/user2.svg" alt="" className="h-6 w-6" />
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
