import React from "react";
import { useNavigate } from "react-router-dom";

type Props = { className?: string };

export default function SearchBar({ className = "" }: Props) {
  const navigate = useNavigate();
  const [q, setQ] = React.useState("");

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const value = q.trim();
    if (!value) return;
    navigate(`/search?q=${encodeURIComponent(value)}`);
  };

  return (
    <form onSubmit={onSubmit} className={`hidden md:flex ${className}`} role="search" aria-label="Поиск по сайту">
      <div className="p-2 flex w-full items-center h-12 rounded-2xl bg-white/10 ring-1 ring-white/15 backdrop-blur-xl overflow-hidden pl-3 pr-2 md:pl-4 md:pr-3">
        <label htmlFor="site-search" className="sr-only">Поиск</label>
        <input
          id="site-search"
          type="text"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Uzbmarketda izlash"
          className="w-full bg-transparent placeholder-white/70 text-white outline-none"
        />
        <button type="submit" className="h-12  hover:bg-white/10 rounded-xl" aria-label="Искать">
          <img src="/icons/search.svg" alt="" className="size-5" />
        </button>
      </div>
    </form>
  );
}


