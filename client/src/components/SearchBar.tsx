import React from "react";

type Props = { className?: string };

export default function SearchBar({ className = "" }: Props) {
  return (
    <form action="/search" method="get" className={`flex-1 max-w-xl hidden md:flex ${className}`}>
      <div className="flex w-full items-center h-11 rounded-xl bg-white/10 border border-white/10 backdrop-blur-xl overflow-hidden px-2 md:px-3">
        <input
          type="text"
          name="q"
          placeholder="Uzbmarketda izlash"
          className="w-full bg-transparent placeholder-white/70 text-white px-4 md:px-5 outline-none"
        />
        <button type="submit" className="h-11 px-4 md:px-5 hover:bg-white/10">
          <img src="/icons/search.svg" alt="" className="size-5" />
        </button>
      </div>
    </form>
  );
}


