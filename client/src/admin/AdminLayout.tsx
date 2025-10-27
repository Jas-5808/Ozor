import React from 'react';
// @ts-ignore
import s from './AdminLayout.module.scss';
import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export default function AdminLayout() {
  const { isAuthenticated, profile, logout } = useAuth();
  return (
    <div className={s.root}>
      {/* sidebar removed in top-nav layout */}
      <header className={s.header}>
        <div className={s.brand}>Ozor Admin</div>
        <nav className={s.topnav}>
          <NavLink to="/admin" end className={({isActive})=> isActive ? `${s.topnavLink} ${s.topnavActive}` : s.topnavLink}>Dashboard</NavLink>
          <NavLink to="/admin/orders" className={({isActive})=> isActive ? `${s.topnavLink} ${s.topnavActive}` : s.topnavLink}>Orders</NavLink>
          <NavLink to="/admin/users" className={({isActive})=> isActive ? `${s.topnavLink} ${s.topnavActive}` : s.topnavLink}>Users</NavLink>
          <NavLink to="/admin/products" className={({isActive})=> isActive ? `${s.topnavLink} ${s.topnavActive}` : s.topnavLink}>Products</NavLink>
          <NavLink to="/admin/warehouse" className={({isActive})=> isActive ? `${s.topnavLink} ${s.topnavActive}` : s.topnavLink}>Warehouse</NavLink>
          <NavLink to="/admin/categories" className={({isActive})=> isActive ? `${s.topnavLink} ${s.topnavActive}` : s.topnavLink}>Categories</NavLink>
          <NavLink to="/admin/banners" className={({isActive})=> isActive ? `${s.topnavLink} ${s.topnavActive}` : s.topnavLink}>Banners</NavLink>
          <NavLink to="/admin/audit" className={({isActive})=> isActive ? `${s.topnavLink} ${s.topnavActive}` : s.topnavLink}>Audit</NavLink>
        </nav>
        <div style={{display:'flex', alignItems:'center', gap:14}}>
          <span>{profile?.first_name || 'Admin'}</span>
          <button className={`${s.btn} ${s.muted}`} onClick={logout}>Logout</button>
        </div>
      </header>
      <main className={s.main}>
        <Outlet />
      </main>
    </div>
  );
}

