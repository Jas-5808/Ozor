import { Link, useLocation } from "react-router-dom";
import { useApp } from "../../context/AppContext";
import { useAuth } from "../../hooks/useAuth";

export function BottomNavbar() {
  const { getCartItemCount, state } = useApp();
  const { isAuthenticated } = useAuth();
  const location = useLocation();
  const cartCount = getCartItemCount();
  const likedCount = state.likedProducts?.size || 0;

  // Определяем активные маршруты
  const isHomeActive = location.pathname === '/';
  const isCatalogActive = location.pathname === '/catalog';
  const isCartActive = location.pathname === '/cart';
  const isFavoritesActive = location.pathname === '/favorites';
  const isProfileActive = location.pathname === '/profile' || location.pathname === '/login';

  return (
    <div className="fixed bottom-0 inset-x-0 z-50 md:hidden">
      <div className="mx-auto w-full max-w-[640px] px-4" style={{ paddingBottom: 'calc(0.5rem + env(safe-area-inset-bottom))' }}>
        <div className="rounded-t-[24px] bg-gradient-to-b from-white to-white/95 backdrop-blur-xl border-t border-x border-gray-200/50 shadow-[0_-4px_20px_rgba(0,0,0,0.08)]">
          <ul className="flex items-center justify-around gap-1 py-2">
            <li>
              <Link
                to="/"
                className={`flex flex-col items-center justify-center gap-1 px-3 py-2 rounded-xl transition-all ${
                  isHomeActive 
                    ? 'text-[#003d32]' 
                    : 'text-gray-600 hover:text-[#003d32] active:scale-95'
                }`}
                aria-label="Главная"
              >
                <span className={`text-base font-extrabold tracking-tight ${isHomeActive ? '' : 'opacity-70'}`}>
                  OZAR
                </span>
                <span className={`text-[10px] font-medium ${isHomeActive ? 'font-semibold' : ''}`}>
                  Bosh
                </span>
              </Link>
            </li>
            <li>
              <Link
                to="/catalog"
                className={`flex flex-col items-center justify-center gap-1 px-3 py-2 rounded-xl transition-all ${
                  isCatalogActive 
                    ? 'text-[#003d32]' 
                    : 'text-gray-600 hover:text-[#003d32] active:scale-95'
                }`}
                aria-label="Каталог"
              >
                <svg 
                  width="24" 
                  height="24" 
                  viewBox="0 0 24 24" 
                  fill={isCatalogActive ? "currentColor" : "none"} 
                  stroke="currentColor" 
                  strokeWidth="2"
                  className={isCatalogActive ? "" : "opacity-70"}
                >
                  <rect x="3" y="3" width="7" height="7"/>
                  <rect x="14" y="3" width="7" height="7"/>
                  <rect x="14" y="14" width="7" height="7"/>
                  <rect x="3" y="14" width="7" height="7"/>
                </svg>
                <span className={`text-[10px] font-medium ${isCatalogActive ? 'font-semibold' : ''}`}>
                  Katalog
                </span>
              </Link>
            </li>
            <li className="relative">
              <Link
                to="/cart"
                className={`flex flex-col items-center justify-center gap-1 px-3 py-2 rounded-xl transition-all relative ${
                  isCartActive 
                    ? 'text-[#003d32]' 
                    : 'text-gray-600 hover:text-[#003d32] active:scale-95'
                }`}
                aria-label="Корзина"
              >
                <svg 
                  width="24" 
                  height="24" 
                  viewBox="0 0 24 24" 
                  fill={isCartActive ? "currentColor" : "none"} 
                  stroke="currentColor" 
                  strokeWidth="2"
                  className={isCartActive ? "" : "opacity-70"}
                >
                  <circle cx="9" cy="21" r="1"/>
                  <circle cx="20" cy="21" r="1"/>
                  <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
                </svg>
                {cartCount > 0 && (
                  <span className="absolute top-0 right-1 h-4 min-w-4 px-1 rounded-full bg-gradient-to-r from-[#003d32] to-[#04734b] text-[9px] leading-4 text-white text-center font-bold shadow-sm">
                    {cartCount > 99 ? '99+' : cartCount}
                  </span>
                )}
                <span className={`text-[10px] font-medium ${isCartActive ? 'font-semibold' : ''}`}>
                  Savatcha
                </span>
              </Link>
            </li>
            <li className="relative">
              <Link
                to="/favorites"
                className={`flex flex-col items-center justify-center gap-1 px-3 py-2 rounded-xl transition-all relative ${
                  isFavoritesActive 
                    ? 'text-[#003d32]' 
                    : 'text-gray-600 hover:text-[#003d32] active:scale-95'
                }`}
                aria-label="Избранное"
              >
                <svg 
                  width="24" 
                  height="24" 
                  viewBox="0 0 24 24" 
                  fill={isFavoritesActive ? "currentColor" : "none"} 
                  stroke="currentColor" 
                  strokeWidth="2"
                  className={isFavoritesActive ? "" : "opacity-70"}
                >
                  <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                </svg>
                {likedCount > 0 && (
                  <span className="absolute top-0 right-1 h-4 min-w-4 px-1 rounded-full bg-gradient-to-r from-[#003d32] to-[#04734b] text-[9px] leading-4 text-white text-center font-bold shadow-sm">
                    {likedCount > 99 ? '99+' : likedCount}
                  </span>
                )}
                <span className={`text-[10px] font-medium ${isFavoritesActive ? 'font-semibold' : ''}`}>
                  Tanlanganlar
                </span>
              </Link>
            </li>
            <li>
              <Link
                to={isAuthenticated ? "/profile" : "/login"}
                state={isAuthenticated ? undefined : { from: '/profile' }}
                className={`flex flex-col items-center justify-center gap-1 px-3 py-2 rounded-xl transition-all ${
                  isProfileActive 
                    ? 'text-[#003d32]' 
                    : 'text-gray-600 hover:text-[#003d32] active:scale-95'
                }`}
                aria-label={isAuthenticated ? "Профиль" : "Войти"}
              >
                <svg 
                  width="24" 
                  height="24" 
                  viewBox="0 0 24 24" 
                  fill={isProfileActive ? "currentColor" : "none"} 
                  stroke="currentColor" 
                  strokeWidth="2"
                  className={isProfileActive ? "" : "opacity-70"}
                >
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                  <circle cx="12" cy="7" r="4"/>
                </svg>
                <span className={`text-[10px] font-medium ${isProfileActive ? 'font-semibold' : ''}`}>
                  {isAuthenticated ? 'Profil' : 'Kirish'}
                </span>
              </Link>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}

export default BottomNavbar;

