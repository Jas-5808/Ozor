import { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import SideCatalog from "../SideCatalog";
import LanguageSwitcher from "../LanguageSwitcher";
import SearchBar from "../SearchBar";
import HeaderActions from "../HeaderActions";
import { useApp } from "../../context/AppContext";
import { useAuth } from "../../hooks/useAuth";
export function Header({ showOnlyNavbar = false }: { showOnlyNavbar?: boolean }) {
  const { state, showLocationModal, getCartItemCount } = useApp();
  const cartCount = getCartItemCount();
  const likedCount = state.likedProducts?.size || 0;
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isSideCatalogOpen, setIsSideCatalogOpen] = useState(false);
  const [isCompact, setIsCompact] = useState(false);
  
  // Определяем активные маршруты
  const isHomeActive = location.pathname === '/';
  const isCatalogActive = location.pathname === '/catalog';
  const isCartActive = location.pathname === '/cart';
  const isFavoritesActive = location.pathname === '/favorites';
  const isProfileActive = location.pathname === '/profile' || location.pathname === '/login';
  useEffect(() => {
    const onScroll = () => {
      setIsCompact(window.scrollY > 10);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  // Если нужно показать только навбар, возвращаем только его
  if (showOnlyNavbar) {
    return (
      <>
        <div className="fixed bottom-3 inset-x-0 z-50 md:hidden">
          <div className="mx-auto w-[min(640px,calc(100%-1.5rem))]">
            <div className="rounded-[28px] bg-[#434344]/55 backdrop-blur-3xl border border-white/15 ring-1 ring-white/5 shadow-[0_10px_30px_rgba(0,0,0,0.35)] px-2 py-1.5 pb-[calc(0.375rem+env(safe-area-inset-bottom))]">
              <ul className="flex items-center justify-evenly gap-1 sm:gap-2">
                <li>
                  <Link
                    to="/"
                    className={`inline-flex h-12 w-12 items-center justify-center rounded-2xl transition ${
                      isHomeActive 
                        ? 'bg-white/20 shadow-lg' 
                        : 'hover:bg-white/10 active:bg-white/15'
                    }`}
                    aria-label="Главная"
                  >
                    <span className={`font-bold text-sm ${
                      isHomeActive ? 'text-white' : 'text-white'
                    }`}>OZAR</span>
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
                    aria-label="Каталог"
                  >
                    <img src="/icons/catalog.png" alt="" className={`h-7 w-7 ${
                      isCatalogActive ? 'opacity-100' : 'opacity-90'
                    }`} />
                  </Link>
                </li>
                <li>
                  <Link
                    to="/cart"
                    className={`inline-flex h-12 w-12 items-center justify-center rounded-2xl transition relative ${
                      isCartActive 
                        ? 'bg-white/20 shadow-lg' 
                        : 'hover:bg-white/10 active:bg-white/15'
                    }`}
                    aria-label="Корзина"
                  >
                    <img src="/icons/korzinka2.svg" alt="" className={`h-7 w-7 ${
                      isCartActive ? 'opacity-100' : 'opacity-90'
                    }`} />
                    {cartCount > 0 && (
                      <span className="absolute -top-0.5 -right-0.5 h-4 min-w-4 px-1 rounded-full bg-red-500 text-[10px] leading-4 text-white text-center font-bold">
                        {cartCount}
                      </span>
                    )}
                  </Link>
                </li>
                <li className="relative">
                  <Link
                    to="/favorites"
                    className={`inline-flex h-12 w-12 items-center justify-center rounded-2xl transition relative ${
                      isFavoritesActive 
                        ? 'bg-white/20 shadow-lg' 
                        : 'hover:bg-white/10 active:bg-white/15'
                    }`}
                    aria-label="Избранное"
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
                    aria-label={isAuthenticated ? "Профиль" : "Войти"}
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
      <header
      style={{ background: 'linear-gradient(92.41deg, #003d32, #04734b)' }}
      className={`hidden md:block sticky top-0 z-50 transition-all duration-300 ${
          isCompact ? "pt-2" : "pt-3"
        } pb-2 md:pb-3 text-white border-b border-white/20 shadow-[0_10px_30px_rgba(0,0,0,0.22)] backdrop-blur-xl mb-3 md:mb-4`}
      >
        <div className="mx-auto w-full max-w-[1240px] px-4 sm:px-5 md:px-6">
            <div className="flex flex-col space-y-2 md:space-y-3">
              <div className="relative flex items-center justify-between gap-2 md:gap-3">
                <div
                  onClick={showLocationModal}
                  className="flex items-center gap-1.5 cursor-pointer select-none z-10"
                  title="Нажмите, чтобы изменить местоположение"
                >
                  <img src="/icons/location.svg" alt="" className="size-4" />
                  <p
                    className="text-xs md:text-sm max-w-[80px] md:max-w-[240px] truncate whitespace-nowrap overflow-hidden"
                    title={state.location.data?.address || "Местоположение не определено"}
                  >
                    {state.location.data?.address || "Местоположение не определено"}
                  </p>
                </div>
                {/* OZAR текст по центру в мобильной версии */}
                <Link
                  to="/"
                  className="absolute left-1/2 transform -translate-x-1/2 md:hidden text-xl font-extrabold tracking-tight text-white z-10"
                  aria-label="На главную"
                >
                  OZAR
                </Link>
                <div className="z-10">
                  <LanguageSwitcher />
                </div>
              </div>

              <div className="hidden md:flex items-center  md:gap-10 flex-1 justify-end md:justify-between">
                <div className="flex items-center gap-7 md:gap-10">
                  <Link
                    to="/"
                    className="text-2xl font-extrabold tracking-tight"
                    aria-label="На главную"
                  >
                    OZAR
                  </Link>
                </div>

                <div
                  className="hidden md:flex items-center justify-center gap-1 h-12 px-4 rounded-2xl bg-white/10 ring-1 ring-white/15 backdrop-blur-xl cursor-pointer hover:bg-white/15 active:scale-[0.99] transition"
                  onClick={() => setIsSideCatalogOpen((prev) => !prev)}
                >
                  <img src="/icons/burger.svg" alt="" className="size-5" />
                  <p className="font-medium">Katalog</p>
                </div>

                <SearchBar className="mx-4 flex-[1_1_720px] max-w-[840px]" />

                <HeaderActions isAuthenticated={isAuthenticated} />
              </div>
            </div>
          </div>
        {/* Панель категорий скрыта по требованию */}
      </header>
      
      {/* Мобильная версия хедера с поиском */}
      <div className="md:hidden sticky top-0 z-40 bg-white border-b border-gray-200 shadow-sm">
        <div className="px-4 py-3 space-y-3">
          {/* Верхняя строка: локация и город доставки */}
          <div className="flex items-center justify-between">
            <div
              onClick={showLocationModal}
              className="flex items-center gap-2 cursor-pointer"
            >
              <img src="/icons/location.svg" alt="" className="size-5" />
              <p className="text-xs font-medium text-gray-900">
                {state.location.data?.address?.split(',')[0] || "Ташкент"}
              </p>
              <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
            <p className="text-xs text-gray-500">город доставки</p>
          </div>

          {/* Поисковая строка */}
          <div className="flex items-center gap-2">
            <form onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              const query = formData.get('search') as string;
              if (query?.trim()) {
                navigate(`/search?q=${encodeURIComponent(query.trim())}`);
              }
            }} className="flex-1" role="search">
              <div className="relative flex items-center h-11 bg-gray-100 rounded-lg px-3">
                <svg className="w-5 h-5 text-gray-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  name="search"
                  placeholder="Искать товары и категории"
                  className="flex-1 bg-gray-100 outline-none text-sm text-gray-900 placeholder:text-gray-400 border-0"
                  style={{ background: 'transparent' }}
                />
              </div>
            </form>
            <Link
              to="/favorites"
              className="p-2 relative"
              aria-label="Избранное"
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
          </div>
        </div>
      </div>

      <div className="fixed bottom-3 inset-x-0 z-50 md:hidden">
        <div className="mx-auto w-[min(640px,calc(100%-1.5rem))]">
          <div className="rounded-[28px] bg-[#434344]/55 backdrop-blur-3xl border border-white/15 ring-1 ring-white/5 shadow-[0_10px_30px_rgba(0,0,0,0.35)] px-2 py-1.5 pb-[calc(0.375rem+env(safe-area-inset-bottom))]">
            <ul className="flex items-center justify-evenly gap-1 sm:gap-2">
              <li>
                <Link
                  to="/"
                  className={`inline-flex h-12 w-12 items-center justify-center rounded-2xl transition ${
                    isHomeActive 
                      ? 'bg-white/20 shadow-lg' 
                      : 'hover:bg-white/10 active:bg-white/15'
                  }`}
                  aria-label="Главная"
                >
                  <span className={`font-bold text-sm ${
                    isHomeActive ? 'text-white' : 'text-white'
                  }`}>OZAR</span>
                </Link>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => setIsSideCatalogOpen((prev) => !prev)}
                  className="hidden md:inline-flex h-12 w-12 items-center justify-center rounded-2xl hover:bg-white/10 active:bg-white/10 transition"
                  aria-label="Каталог"
                >
                  <img src="/icons/catalog.png" alt="" className="h-7 w-7" />
                </button>
                <Link
                  to="/catalog"
                  className="md:hidden inline-flex h-12 w-12 items-center justify-center rounded-2xl hover:bg-white/10 active:bg-white/10 transition"
                  aria-label="Каталог"
                >
                  <img src="/icons/catalog.png" alt="" className="h-7 w-7" />
                </Link>
              </li>
              <li>
                <Link
                  to="/cart"
                  className={`inline-flex h-12 w-12 items-center justify-center rounded-2xl transition relative ${
                    isCartActive 
                      ? 'bg-white/20 shadow-lg' 
                      : 'hover:bg-white/10 active:bg-white/15'
                  }`}
                  aria-label="Корзина"
                >
                  <img src="/icons/korzinka2.svg" alt="" className={`h-7 w-7 ${
                    isCartActive ? 'opacity-100' : 'opacity-90'
                  }`} />
                  {cartCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 h-4 min-w-4 px-1 rounded-full bg-red-500 text-[10px] leading-4 text-white text-center font-bold">
                      {cartCount}
                    </span>
                  )}
                </Link>
              </li>
              <li className="relative">
                <Link
                  to="/favorites"
                  className={`inline-flex h-12 w-12 items-center justify-center rounded-2xl transition relative ${
                    isFavoritesActive 
                      ? 'bg-white/20 shadow-lg' 
                      : 'hover:bg-white/10 active:bg-white/15'
                  }`}
                  aria-label="Избранное"
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
                  aria-label={isAuthenticated ? "Профиль" : "Войти"}
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
