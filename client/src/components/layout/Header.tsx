import { useState, useEffect, useLayoutEffect, useRef } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import SideCatalog from "../SideCatalog";
import LanguageSwitcher from "../LanguageSwitcher";
import SearchBar from "../SearchBar";
import MobileSearchBar from "../MobileSearchBar";
import HeaderActions from "../HeaderActions";
import { useApp } from "../../context/AppContext";
import { useAuth } from "../../hooks/useAuth";
import { useTranslation } from "react-i18next";
export function Header({ showOnlyNavbar = false }: { showOnlyNavbar?: boolean }) {
  const { state, showLocationModal, getCartItemCount } = useApp();
  const cartCount = getCartItemCount();
  const likedCount = state.likedProducts?.size || 0;
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isSideCatalogOpen, setIsSideCatalogOpen] = useState(false);
  const [isCompact, setIsCompact] = useState(false);
  const [isHeaderVisible, setIsHeaderVisible] = useState(true);
  const [headerOffset, setHeaderOffset] = useState(0);
  const lastScrollYRef = useRef(0);
  const lastEventRef = useRef<{ type: string; target: string } | null>(null);
  const headerContainerRef = useRef<HTMLDivElement | null>(null);
  const { t } = useTranslation();
  
  // Определяем активные маршруты
  const isHomeActive = location.pathname === '/';
  const isCatalogActive = location.pathname === '/catalog';
  const isCartActive = location.pathname === '/cart';
  const isFavoritesActive = location.pathname === '/favorites';
  const isProfileActive = location.pathname === '/profile' || location.pathname === '/login';
  const isProductPage = location.pathname.startsWith('/product');
  const headerVisible = !isHomeActive || isHeaderVisible;
  
  useLayoutEffect(() => {
    if (typeof document === "undefined") return;
    if (showOnlyNavbar) {
      document.documentElement.style.setProperty("--app-header-offset", "0px");
      setHeaderOffset(0);
      return;
    }
    const el = headerContainerRef.current;
    if (!el || typeof window === "undefined") return;

    const update = () => {
      const rect = el.getBoundingClientRect();
      // Высота нужна, чтобы схлопывать место под хедер, когда он скрыт
      const h = Math.max(0, Math.round(rect.height));
      setHeaderOffset(h);
      document.documentElement.style.setProperty("--app-header-offset", `${h}px`);
    };

    update();

    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", update);
      return () => window.removeEventListener("resize", update);
    }

    const ro = new ResizeObserver(() => update());
    ro.observe(el);
    window.addEventListener("resize", update);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", update);
    };
  }, [showOnlyNavbar]);

  // Для мобильной версии скрываем поисковик на отдельных страницах
  const shouldHideSearchBarMobile = isCartActive || isFavoritesActive || isProfileActive || isProductPage;
  // На десктопе оставляем поиск всегда видимым по просьбе заказчика
  const shouldHideSearchBarDesktop = false;
  useEffect(() => {
    const mainEl = typeof document !== "undefined" ? document.getElementById("main-content") : null;
    const mainHasScrollableOverflow =
      !!mainEl && ["auto", "scroll", "overlay"].includes(window.getComputedStyle(mainEl).overflowY);
    const debugEnabled =
      typeof window !== "undefined" &&
      (window.location.search.includes("debugHeader=1") ||
        window.localStorage.getItem("debugHeader") === "1");
    const debugLog = (...args: unknown[]) => {
      if (!debugEnabled) return;
      console.log("[HeaderScroll]", ...args);
    };
    const getScrollSource = () => {
      if (mainEl && mainHasScrollableOverflow && mainEl.scrollHeight > mainEl.clientHeight) {
        return "main-content";
      }
      return "document";
    };
    const getScrollY = () => {
      // Prefer the document scroll; use main-content only if it is explicitly scrollable.
      if (mainEl && mainHasScrollableOverflow && mainEl.scrollHeight > mainEl.clientHeight) {
        return mainEl.scrollTop;
      }
      const scrollingElement = document.scrollingElement || document.documentElement;
      return scrollingElement.scrollTop || window.scrollY || document.body.scrollTop || 0;
    };

    let raf = 0;
    const onScroll = (event?: Event) => {
      if (event) {
        const targetLabel =
          event.target instanceof Element
            ? event.target.id || event.target.tagName.toLowerCase()
            : "window";
        lastEventRef.current = { type: event.type, target: targetLabel };
      } else {
        lastEventRef.current = { type: "manual", target: "manual" };
      }
      if (raf) return;
      raf = window.requestAnimationFrame(() => {
        raf = 0;
        const currentY = getScrollY();
        const delta = currentY - lastScrollYRef.current;
        const source = getScrollSource();
        const eventInfo = lastEventRef.current;
        debugLog("scroll", {
          event: eventInfo,
          source,
          currentY,
          lastY: lastScrollYRef.current,
          delta,
          isHomeActive,
        });
        const nextCompact = currentY > 10;
        setIsCompact((prev) => {
          if (prev !== nextCompact) {
            debugLog("compact", { prev, next: nextCompact, currentY });
          }
          return nextCompact;
        });

        if (!isHomeActive) {
          setIsHeaderVisible((prev) => {
            if (!prev) {
              debugLog("visibility", {
                prev,
                next: true,
                reason: "not-home",
                currentY,
                delta,
                source,
              });
            }
            return true;
          });
          lastScrollYRef.current = currentY;
          return;
        }

        const hideThreshold = 10;

        setIsHeaderVisible((prev) => {
          let next = prev;
          let reason = "no-change";
          if (currentY <= 0) {
            next = true;
            reason = "top";
          } else if (delta < 0) {
            next = true;
            reason = "scroll-up";
          } else if (delta > hideThreshold) {
            next = false;
            reason = "scroll-down";
          }
          if (prev !== next) {
            debugLog("visibility", {
              prev,
              next,
              reason,
              currentY,
              delta,
              source,
            });
          }
          return next;
        });

        lastScrollYRef.current = currentY;
      });
    };
    const onWheel = (event: WheelEvent) => {
      if (!isHomeActive) return;
      const currentY = getScrollY();
      const source = getScrollSource();
      debugLog("wheel", { deltaY: event.deltaY, currentY, source, isHomeActive });
      if (event.deltaY < 0) {
        setIsHeaderVisible((prev) => {
          if (!prev) {
            debugLog("visibility", {
              prev,
              next: true,
              reason: "wheel-up",
              currentY,
              delta: currentY - lastScrollYRef.current,
              source,
            });
          }
          return true;
        });
      } else if (event.deltaY > 0 && currentY > 10) {
        setIsHeaderVisible((prev) => {
          if (prev) {
            debugLog("visibility", {
              prev,
              next: false,
              reason: "wheel-down",
              currentY,
              delta: currentY - lastScrollYRef.current,
              source,
            });
          }
          return false;
        });
      }
      lastScrollYRef.current = currentY;
    };

    lastScrollYRef.current = getScrollY();
    debugLog("init", {
      path: location.pathname,
      isHomeActive,
      mainHasScrollableOverflow,
      mainScrollHeight: mainEl?.scrollHeight ?? null,
      mainClientHeight: mainEl?.clientHeight ?? null,
      docScrollHeight: document.documentElement?.scrollHeight ?? null,
    });
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    document.addEventListener("scroll", onScroll, { passive: true, capture: true });
    window.addEventListener("wheel", onWheel, { passive: true });
    if (mainEl && mainHasScrollableOverflow) {
      mainEl.addEventListener("scroll", onScroll, { passive: true });
      mainEl.addEventListener("wheel", onWheel, { passive: true });
    }
    return () => {
      window.removeEventListener("scroll", onScroll);
      document.removeEventListener("scroll", onScroll, { capture: true });
      window.removeEventListener("wheel", onWheel);
      if (mainEl && mainHasScrollableOverflow) {
        mainEl.removeEventListener("scroll", onScroll);
        mainEl.removeEventListener("wheel", onWheel);
      }
      if (raf) {
        window.cancelAnimationFrame(raf);
      }
    };
  }, [isHomeActive]);
  // Если нужно показать только навбар, возвращаем только его
  if (showOnlyNavbar) {
    return (
      <>
        <div className="fixed bottom-0 left-0 right-0 z-50 md:hidden">
          <div className="mx-auto w-full">
            <div className="relative rounded-t-[28px] rounded-b-none bg-white border-t border-x border-gray-200 shadow-[0_-4px_20px_rgba(0,0,0,0.08)] px-2 py-1.5 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
              {/* Floating centered cart button */}
              <Link
                to="/cart"
                className="absolute left-1/2 -translate-x-1/2 h-14 w-14 rounded-full shadow-xl ring-1 ring-black/10 border border-white/40 flex items-center justify-center"
                style={{ background: 'linear-gradient(92.41deg, #003d32, #04734b)', top: '6px' }}
                aria-label={t("common.navigation.cart")}
              >
                <img src="/icons/korzinka2.svg" alt="" className="h-7 w-7 opacity-95" />
                {cartCount > 0 && (
                  <span className="absolute -top-1 -right-1 h-5 min-w-5 px-1 rounded-full bg-red-500 text-[10px] leading-5 text-white text-center font-bold">
                    {cartCount}
                  </span>
                )}
              </Link>

              <ul className="flex items-center justify-evenly gap-1 sm:gap-2">
                <li>
                  <Link
                    to="/"
                    className={`inline-flex h-12 w-12 items-center justify-center rounded-2xl transition ${
                      isHomeActive 
                        ? 'bg-white/20 shadow-lg' 
                        : 'hover:bg-white/10 active:bg-white/15'
                    }`}
                    aria-label={t("common.navigation.home")}
                  >
                    <img src="/img/logo.png" alt="OZAR" className="h-8 w-auto" />
                    {/* <div className="text-white text-sm font-medium">OZAR</div> */}
                  </Link>
                </li>
                <li>
                  <Link
                    to="/catalog"
                    className={`md:hidden inline-flex h-12 w-12 items-center justify-center rounded-2xl transition ${
                      isCatalogActive 
                        ? 'bg-white/20 shadow-lg' 
                        : 'hover:bg-white/10 active:bg-white/15'
                    }`}
                    aria-label={t("common.navigation.catalog")}
                  >
                    <img src="/icons/catalog.png" alt="" className={`h-7 w-7 ${
                      isCatalogActive ? 'opacity-100' : 'opacity-90'
                    }`} />
                  </Link>
                </li>
                {/* placeholder to keep spacing for the centered floating button */}
                <li className="w-14 h-12 pointer-events-none" />
                <li className="relative">
                  <Link
                    to="/favorites"
                    className={`inline-flex h-12 w-12 items-center justify-center rounded-2xl transition relative ${
                      isFavoritesActive 
                        ? 'bg-white/20 shadow-lg' 
                        : 'hover:bg-white/10 active:bg-white/15'
                    }`}
                    aria-label={t("common.navigation.favorites")}
                  >
                    <img src="/icons/like4.svg" alt="" className={`h-7 w-7 ${
                      isFavoritesActive ? 'opacity-100' : 'opacity-90'
                    }`} />
                    {likedCount > 0 && (
                      <span className="absolute -top-0.5 -right-0.5 h-4 min-w-4 px-1 rounded-full bg-red-500 text-[10px] leading-4 text-white text-center font-bold">
                        {likedCount}
                      </span>
                    )}
                  </Link>
                </li>
                <li>
                  <Link
                    to={isAuthenticated ? "/profile" : "/login"}
                    state={isAuthenticated ? undefined : { from: '/profile' }}
                    className={`inline-flex h-12 w-12 items-center justify-center rounded-2xl transition ${
                      isProfileActive 
                        ? 'bg-white/20 shadow-lg' 
                        : 'hover:bg-white/10 active:bg-white/15'
                    }`}
                    aria-label={isAuthenticated ? t("common.auth.profile") : t("common.auth.login")}
                  >
                    <img src="/icons/user2.svg" alt="" className={`h-7 w-7 ${
                      isProfileActive ? 'opacity-100' : 'opacity-90'
                    }`} />
                  </Link>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <div
        ref={headerContainerRef}
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          headerVisible ? "translate-y-0 opacity-100" : "-translate-y-full opacity-0 pointer-events-none"
        }`}
      >
        <header
          style={{ background: 'linear-gradient(92.41deg, #003d32, #04734b)' }}
          className={`hidden md:block w-full ${isCompact ? "pt-2" : "pt-3"} pb-2 md:pb-3 text-white border-b border-white/20 shadow-[0_10px_30px_rgba(0,0,0,0.22)] backdrop-blur-xl`}
        >
        <div className="mx-auto w-full max-w-[1240px] px-4 sm:px-5 md:px-6">
            <div className="flex flex-col space-y-2 md:space-y-3">
              <div className="relative flex items-center justify-between gap-2 md:gap-3">
                <div
                  onClick={showLocationModal}
                  className="flex items-center gap-1.5 cursor-pointer select-none z-10"
                  title={t("header.locationTooltip")}
                >
                  <img src="/icons/location.svg" alt="" className="size-4" />
                  <p
                    className="text-xs md:text-sm max-w-[80px] md:max-w-[240px] truncate whitespace-nowrap overflow-hidden"
                    title={state.location.data?.address || t("header.locationFallback")}
                  >
                    {state.location.data?.address || t("header.locationFallback")}
                  </p>
                </div>
                {/* OZAR текст по центру в мобильной версии */}
                <Link
                  to="/"
                  className="absolute left-1/2 transform -translate-x-1/2 md:hidden z-10"
                  aria-label={t("common.navigation.home")}
                >
                  <img src="/img/logo.png" alt="OZAR" className="h-7 w-auto" />
                </Link>
                <div className="z-10">
                  <LanguageSwitcher />
                </div>
              </div>

              <div className="hidden md:flex items-center  md:gap-10 flex-1 justify-end md:justify-between">
                <div className="flex items-center gap-7 md:gap-10">
                  <Link
                    to="/"
                    className=""
                    aria-label={t("common.navigation.home")}
                  >
                    {/* <img src="/img/logo.png" alt="OZAR" className="h-8 w-auto" /> */}
                    <div className="text-white text-sm font-medium">OZAR</div>
                  </Link>
                </div>

                <div
                  className="hidden md:flex items-center justify-center gap-1 h-12 px-4 rounded-2xl bg-white/10 ring-1 ring-white/15 backdrop-blur-xl cursor-pointer hover:bg-white/15 active:scale-[0.99] transition"
                  onClick={() => setIsSideCatalogOpen((prev) => !prev)}
                >
                  <img src="/icons/burger.svg" alt="" className="size-5" />
                  <p className="font-medium">Katalog</p>
                </div>

                {!shouldHideSearchBarDesktop && (
                  <SearchBar className="mx-4 flex-[1_1_720px] max-w-[840px]" />
                )}

                <HeaderActions isAuthenticated={isAuthenticated} />
              </div>
            </div>
          </div>
        {/* Панель категорий скрыта по требованию */}
      </header>
      
      {/* Мобильная версия хедера с поиском */}
      <div className="md:hidden bg-white border-b border-gray-200 shadow-sm">
        <div className="px-4 py-3 space-y-3">
          {/* Верхняя строка: локация и переключатель языка */}
          <div className="flex items-center justify-between">
            <div
              onClick={showLocationModal}
              className="flex items-center gap-2 cursor-pointer"
            >
              <img src="/icons/location.svg" alt="" className="size-5" />
              <p className="text-xs font-medium text-gray-900">
                {state.location.data?.address?.split(',')[0] || t("common.delivery.defaultCity")}
              </p>
              <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
            <div className="flex items-center gap-2">
              <LanguageSwitcher variant="mobile" />
            </div>
          </div>

          {/* Поисковая строка - скрываем на страницах профиля, корзины и избранных */}
          {!shouldHideSearchBarMobile && (
            <div className="flex items-center gap-2">
              <MobileSearchBar />
              {!isProductPage && (
                <Link
                  to="/favorites"
                  className="p-2 relative"
                  aria-label={t("common.navigation.favorites")}
                >
                  <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                  </svg>
                  {likedCount > 0 && (
                    <span className="absolute top-1 right-1 h-4 min-w-4 px-1 rounded-full bg-red-500 text-[10px] leading-4 text-white text-center font-bold">
                      {likedCount}
                    </span>
                  )}
                </Link>
              )}
            </div>
          )}
        </div>
      </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 z-50 md:hidden">
        <div className="mx-auto w-full">
          <div className="relative rounded-t-[28px] rounded-b-none bg-white border-t border-x border-gray-200 shadow-[0_-4px_20px_rgba(0,0,0,0.08)] px-2 py-1.5 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
            {/* Floating centered cart button */}
            <Link
              to="/cart"
              className="absolute  left-1/2 -translate-x-1/2 h-14 w-14 rounded-full shadow-xl ring-1 ring-black/10 border border-white/40 flex items-center justify-center"
              style={{ background: 'linear-gradient(92.41deg, #003d32, #04734b)', bottom: '17px' }}
              aria-label={t("common.navigation.cart")}
            >
              <img src="/icons/korzinka2.svg" alt="" className="h-7 w-7 opacity-95" />
              {cartCount > 0 && (
                <span className="absolute -top-1 -right-1 h-5 min-w-5 px-1 rounded-full bg-red-500 text-[10px] leading-5 text-white text-center font-bold">
                  {cartCount}
                </span>
              )}
            </Link>

            <ul className="flex items-center justify-evenly gap-1 sm:gap-2">
              <li>
                <Link
                  to="/"
                  className={`inline-flex h-12 w-12 items-center justify-center rounded-2xl transition ${
                    isHomeActive 
                      ? 'bg-white/20 shadow-lg' 
                      : 'hover:bg-white/10 active:bg-white/15'
                  }`}
                  aria-label={t("common.navigation.home")}
                >
                  <img src="/img/logo.png" alt="OZAR" className="h-9 w-auto" />
                </Link>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => setIsSideCatalogOpen((prev) => !prev)}
                  className="hidden md:inline-flex h-12 w-12 items-center justify-center rounded-2xl hover:bg-white/10 active:bg-white/10 transition"
                  aria-label={t("common.navigation.catalog")}
                >
                  <img src="/icons/catalog.png" alt="" className="h-7 w-7" />
                </button>
                <Link
                  to="/catalog"
                  className="md:hidden inline-flex h-12 w-12 items-center justify-center rounded-2xl hover:bg-white/10 active:bg-white/10 transition"
                  aria-label={t("common.navigation.catalog")}
                >
                  <img src="/icons/catalog.png" alt="" className="h-7 w-7" />
                </Link>
              </li>
              <li>
                {/* placeholder to keep spacing for the centered floating button */}
                <div className="w-14 h-12" />
              </li>
              <li className="relative">
                <Link
                  to="/favorites"
                  className={`inline-flex h-12 w-12 items-center justify-center rounded-2xl transition relative ${
                    isFavoritesActive 
                      ? 'bg-white/20 shadow-lg' 
                      : 'hover:bg-white/10 active:bg-white/15'
                  }`}
                  aria-label={t("common.navigation.favorites")}
                >
                  <img src="/icons/like4.svg" alt="" className={`h-7 w-7 ${
                    isFavoritesActive ? 'opacity-100' : 'opacity-90'
                  }`} />
                  {likedCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 h-4 min-w-4 px-1 rounded-full bg-red-500 text-[10px] leading-4 text-white text-center font-bold">
                      {likedCount}
                    </span>
                  )}
                </Link>
              </li>
              <li>
                <Link
                  to={isAuthenticated ? "/profile" : "/login"}
                  state={isAuthenticated ? undefined : { from: '/profile' }}
                  className={`inline-flex h-12 w-12 items-center justify-center rounded-2xl transition ${
                    isProfileActive 
                      ? 'bg-white/20 shadow-lg' 
                      : 'hover:bg-white/10 active:bg-white/15'
                  }`}
                  aria-label={isAuthenticated ? t("common.auth.profile") : t("common.auth.login")}
                >
                  <img src="/icons/user2.svg" alt="" className={`h-7 w-7 ${
                    isProfileActive ? 'opacity-100' : 'opacity-90'
                  }`} />
                </Link>
              </li>
            </ul>
          </div>
        </div>
      </div>
      {isSideCatalogOpen && (
        <SideCatalog
          open={isSideCatalogOpen}
          onClose={() => setIsSideCatalogOpen(false)}
        />
      )}
    </>
  );
}
export default Header;
