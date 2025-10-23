import React from "react";

type Props = {
  isAuthenticated: boolean;
};

export default function HeaderActions({ isAuthenticated }: Props) {
  return (
    <ul className="flex items-center gap-3 md:gap-5">
      {isAuthenticated ? (
        <li>
          <a href="/profile" className="inline-flex items-center gap-2 h-11 px-3 md:px-4 rounded-xl hover:bg-white/10 hover:text-white/90 transition">
            <img src="/icons/user.svg" alt="" className="size-5" />
            <span>Profil</span>
          </a>
        </li>
      ) : (
        <li>
          <a href="/login" className="inline-flex items-center gap-2 h-11 px-3 md:px-4 rounded-xl hover:bg-white/10 hover:text-white/90 transition">
            <img src="/icons/user.svg" alt="" className="size-5" />
            <span>Kirish</span>
          </a>
        </li>
      )}
      <li>
        <a href="/favorites" className="inline-flex items-center gap-2 h-11 px-3 md:px-4 rounded-xl hover:bg-white/10 hover:text-white/90 transition">
          <img src="/icons/like.svg" alt="" className="size-5" />
          <span>Saralangan</span>
        </a>
      </li>
      <li>
        <a href="/cart" className="inline-flex items-center gap-2 h-11 px-3 md:px-4 rounded-xl hover:bg-white/10 hover:text-white/90 transition">
          <img src="/icons/korzinka.svg" alt="" className="size-5" />
          <span>Savat</span>
        </a>
      </li>
    </ul>
  );
}


