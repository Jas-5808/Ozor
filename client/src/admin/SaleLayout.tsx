import React from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import useSEO from '../hooks/useSEO';

export default function SaleLayout() {
  const { profile, logout } = useAuth();

  useSEO({
    title: 'Sale — OZAR',
    robots: 'noindex,nofollow',
  });

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">
      <header className="sticky top-0 z-10 flex items-center justify-between bg-white/80 backdrop-blur border-b border-slate-200 px-4 py-3 shadow-sm">
        <div className="text-lg font-extrabold text-emerald-700">Ozar Sale</div>
        <nav className="flex items-center gap-3">
          <NavLink
            to="/sale/orders"
            className={({ isActive }) =>
              [
                'rounded-xl px-3 py-2 text-sm font-semibold transition border',
                isActive
                  ? 'bg-emerald-600 text-white border-emerald-600 shadow'
                  : 'bg-white text-slate-700 border-slate-200 hover:border-emerald-500 hover:text-emerald-700',
              ].join(' ')
            }
          >
            Orders
          </NavLink>
        </nav>
        <div className="flex items-center gap-3 text-sm">
          <span className="font-semibold">{profile?.first_name || 'Sale'}</span>
          <button
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-slate-700 transition hover:border-emerald-500 hover:text-emerald-700"
            onClick={logout}
          >
            Logout
          </button>
        </div>
      </header>

      <main className="flex-1 p-4 md:p-6">
        <Outlet />
      </main>
    </div>
  );
}


