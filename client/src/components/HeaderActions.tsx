import React from "react";
import { Link } from "react-router-dom";

type Props = {
  isAuthenticated: boolean;
};

export default function HeaderActions({ isAuthenticated }: Props) {
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
          <Link to="/login" className="flex items-center justify-center gap-2 h-12 px-4 md:px-5 rounded-2xl bg-white/10 text-white/90 hover:bg-white/15 transition" aria-label="Войти">
            <img src="/icons/user.svg" alt="" className="size-5" />
            <span>Kirish</span>
          </Link>
        </li>
      )}
      <li>
        <Link to="/favorites" className="flex items-center justify-center gap-2 h-12 px-4 md:px-5 rounded-2xl bg-white/10 text-white/90 hover:bg-white/15 transition" aria-label="Избранное">
          <img src="/icons/like.svg" alt="" className="size-5" />
          <span>Saralangan</span>
        </Link>
      </li>
      <li>
        <Link to="/cart" className="flex items-center justify-center gap-2 h-12 px-4 md:px-5 rounded-2xl bg-white/10 text-white/90 hover:bg-white/15 transition" aria-label="Корзина">
          <img src="/icons/korzinka.svg" alt="" className="size-5" />
          <span>Savat</span>
        </Link>
      </li>
    </ul>
  );
}


