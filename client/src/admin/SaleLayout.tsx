import React from 'react';
// @ts-ignore
import s from './AdminLayout.module.scss';
import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export default function SaleLayout() {
  const { profile, logout } = useAuth();
  return (
    <div className={s.root}>
      <header className={s.header}>
        <div className={s.brand}>Ozor Sale</div>
        <nav className={s.topnav}>
          <NavLink to="/sale/orders" className={({isActive})=> isActive ? `${s.topnavLink} ${s.topnavActive}` : s.topnavLink}>Orders</NavLink>
        </nav>
        <div style={{display:'flex', alignItems:'center', gap:14}}>
          <span>{profile?.first_name || 'Sale'}</span>
          <button className={`${s.btn} ${s.muted}`} onClick={logout}>Logout</button>
        </div>
      </header>
      <main className={s.main}>
        <Outlet />
      </main>
    </div>
  );
}


