import React from "react";
import { Link } from "react-router-dom";
import { useApp } from "../context/AppContext";

type Props = {
  isAuthenticated: boolean;
};

export default function HeaderActions({ isAuthenticated }: Props) {
  const { getCartItemCount, state } = useApp();
  const cartCount = getCartItemCount();
  const likedCount = state.likedProducts?.size || 0;
  return (
    <ul className="flex items-center gap-4">
      {isAuthenticated ? (
        <li>
          <Link to="/profile" className="flex items-center justify-center gap-2 h-12 px-4 md:px-5 rounded-2xl bg-white/10 text-white/90 hover:bg-white/15 transition" aria-label="Профиль">
            <img src="/icons/user.svg" alt="" className="size-5" />
            <span>Profil</span>
          </Link>
        </li>
      ) : (
        <li>
          <Link to="/login" state={{ from: '/profile' }} className="flex items-center justify-center gap-2 h-12 px-4 md:px-5 rounded-2xl bg-white/10 text-white/90 hover:bg-white/15 transition" aria-label="Войти">
            <img src="/icons/user.svg" alt="" className="size-5" />
            <span>Kirish</span>
          </Link>
        </li>
      )}
      <li className="relative">
        <Link to="/favorites" className="flex items-center justify-center gap-2 h-12 px-4 md:px-5 rounded-2xl bg-white/10 text-white/90 hover:bg-white/15 transition relative" aria-label="Избранное">
          <img src="/icons/like.svg" alt="" className="size-5" />
          <span>Saralangan</span>
          {likedCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 h-5 min-w-5 px-1 rounded-full bg-red-500 text-[11px] leading-5 text-white text-center font-bold">
              {likedCount}
            </span>
          )}
        </Link>
      </li>
      <li className="relative">
        <Link to="/cart" className="flex items-center justify-center gap-2 h-12 px-4 md:px-5 rounded-2xl bg-white/10 text-white/90 hover:bg-white/15 transition relative" aria-label="Корзина">
          <img src="/icons/korzinka.svg" alt="" className="size-5" />
          <span>Savat</span>
          {cartCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 h-5 min-w-5 px-1 rounded-full bg-red-500 text-[11px] leading-5 text-white text-center font-bold">
              {cartCount}
            </span>
          )}
        </Link>
      </li>
    </ul>
  );
}


