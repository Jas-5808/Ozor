import React, { useRef, useState, useEffect } from "react";
import CategoryList from "../CategoryList";
import SubcategoriesPanel from "../SubcategoriesPanel";
import { useCategories } from "../../hooks/useCategories";
import SideCatalog from "../SideCatalog";
import { useApp } from "../../context/AppContext";
import { useAuth } from "../../hooks/useAuth";
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
        <div className="max-w-full mx-auto px-5">
          <div className="container">
            <div className="gap-4">
              <div className="flex items-center gap-4 justify-between">
                <div
                  onClick={showLocationModal}
                  className="flex items-center gap-2 cursor-pointer select-none"
                  title="Нажмите, чтобы изменить местоположение"
                >
                  <img src="/icons/location.svg" alt="" className="size-5" />
                  <p
                    className="text-sm md:text-base max-w-[220px] md:max-w-[320px] truncate whitespace-nowrap overflow-hidden"
                    title={state.location.data?.address || "Местоположение не определено"}
                  >
                    {state.location.data?.address || "Местоположение не определено"}
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

              <div className="hidden md:flex items-center gap-4 px-4 py-4 flex-1 justify-end md:justify-between">
                <div className="flex items-center gap-6">
                  <a
                    href="/"
                    className="text-2xl font-extrabold tracking-tight"
                  >
                    OZOR
                  </a>
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
        <div className="hidden md:block bg-[#434344]/60 backdrop-blur-xl border-t border-white/10">
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
      <div className="fixed bottom-3 inset-x-0 z-50 md:hidden">
        <div className="mx-auto w-[min(640px,calc(100%-1.5rem))]">
          <div className="rounded-[28px] bg-[#434344]/55 backdrop-blur-3xl border border-white/15 ring-1 ring-white/5 shadow-[0_10px_30px_rgba(0,0,0,0.35)] px-2 py-1.5 pb-[calc(0.375rem+env(safe-area-inset-bottom))]">
            <ul className="flex items-center justify-evenly gap-1 sm:gap-2">
              <li>
                <a
                  href="/"
                  className="inline-flex h-12 w-12 items-center justify-center rounded-2xl hover:bg-white/10 active:bg-white/15 transition"
                >
                  <img src="/icons/home.png" alt="" className="h-7 w-7" />
                </a>
              </li>
              <li>
                <a
                  href="#"
                  className="inline-flex h-12 w-12 items-center justify-center rounded-2xl hover:bg-white/10 active:bg-white/10 transition"
                >
                  <img src="/icons/catalog.png" alt="" className="h-7 w-7" />
                </a>
              </li>
              <li>
                <a
                  href="/cart"
                  className="inline-flex h-12 w-12 items-center justify-center rounded-2xl hover:bg-white/10 active:bg-white/15 transition"
                >
                  <img src="/icons/korzinka2.svg" alt="" className="h-7 w-7" />
                </a>
              </li>
              <li className="relative">
                <a
                  href="/favorites"
                  className="inline-flex h-12 w-12 items-center justify-center rounded-2xl hover:bg-white/10 active:bg-white/15 transition relative"
                >
                  <img src="/icons/like4.svg" alt="" className="h-7 w-7" />
                  <span className="absolute -top-0.5 -right-0.5 h-4 min-w-4 px-1 rounded-full bg-red-500 text-[10px] leading-4 text-white text-center">
                    1
                  </span>
                </a>
              </li>
              <li>
                <a
                  href={isAuthenticated ? "/profile" : "/login"}
                  className="inline-flex h-12 w-12 items-center justify-center rounded-2xl hover:bg-white/10 active:bg-white/15 transition"
                >
                  <img src="/icons/user2.svg" alt="" className="h-7 w-7" />
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
