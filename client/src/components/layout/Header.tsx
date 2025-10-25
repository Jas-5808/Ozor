import { useState, useEffect } from "react";
import SideCatalog from "../SideCatalog";
import LanguageSwitcher from "../LanguageSwitcher";
import SearchBar from "../SearchBar";
import HeaderActions from "../HeaderActions";
import { useApp } from "../../context/AppContext";
import { useAuth } from "../../hooks/useAuth";
export function Header() {
  const { state, showLocationModal } = useApp();
  const { isAuthenticated } = useAuth();
  const [isSideCatalogOpen, setIsSideCatalogOpen] = useState(false);
  const [isCompact, setIsCompact] = useState(false);
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
          isCompact ? "pt-0.5" : "pt-1"
        } pb-1 md:pb-2 bg-[#434344]/70 backdrop-blur-2xl border-b border-white/10 shadow-[0_8px_30px_rgba(0,0,0,0.15)] text-white mb-1 md:mb-2`}
      >
        <div className="header-container w-full mx-auto">
          <div className="w-full">
            <div className="flex flex-col space-y-1 md:space-y-2">
              <div className="flex items-center gap-2 justify-between py-0.5 px-0.5">
                <div
                  onClick={showLocationModal}
                  className="flex items-center gap-1 cursor-pointer select-none flex-1 min-w-0"
                  title="Нажмите, чтобы изменить местоположение"
                >
                  <img
                    src="/icons/location.svg"
                    alt=""
                    className="size-5 flex-shrink-0"
                  />
                  <p
                    className="text-sm md:text-base max-w-[180px] sm:max-w-[220px] md:max-w-[320px] truncate whitespace-nowrap overflow-hidden"
                    title={
                      state.location.data?.address ||
                      "Местоположение не определено"
                    }
                  >
                    {state.location.data?.address ||
                      "Местоположение не определено"}
                  </p>
                </div>
                <div className="flex-shrink-0">
                  <LanguageSwitcher />
                </div>
              </div>

              <div className="hidden md:flex items-center gap-3 py-1 md:py-1.5 flex-1 justify-end md:justify-between">
                <div className="flex items-center gap-3">
                  <a
                    href="/"
                    className="text-2xl font-extrabold tracking-tight"
                  >
                    OZOR
                  </a>
                </div>

                <div
                  className="hidden md:flex items-center gap-1.5 h-8 px-2 md:px-3 rounded-lg bg-white/10 border border-white/10 backdrop-blur-xl cursor-pointer hover:bg-white/15 active:scale-[0.99] transition"
                  onClick={() => setIsSideCatalogOpen((prev) => !prev)}
                >
                  <img src="/icons/burger.svg" alt="" className="size-5" />
                  <p className="font-medium">Katalog</p>
                </div>

                <SearchBar />

                <HeaderActions isAuthenticated={isAuthenticated} />
              </div>
            </div>
          </div>
        </div>
        {/* Панель категорий скрыта по требованию */}
      </header>
      <div className="mobile-bottom-nav fixed bottom-1 inset-x-0 z-50 md:hidden">
        <div className="mx-auto w-full max-w-[640px]">
          <div className="rounded-[16px] bg-[#434344]/55 backdrop-blur-3xl border border-white/15 ring-1 ring-white/5 shadow-[0_6px_20px_rgba(0,0,0,0.25)] px-1 py-0.5 pb-[calc(0.125rem+env(safe-area-inset-bottom))]">
            <ul className="flex items-center justify-evenly gap-1 sm:gap-2">
              <li>
                <a
                  href="/"
                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg hover:bg-white/10 active:bg-white/15 transition"
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
                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg hover:bg-white/10 active:bg-white/15 transition"
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
                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg hover:bg-white/10 active:bg-white/15 transition"
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
