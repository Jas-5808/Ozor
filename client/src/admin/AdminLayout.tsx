import { useMemo, useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
// @ts-ignore
import s from './AdminLayout.module.scss';

const NAV_ITEMS = [
  { to: '/admin', label: 'Dashboard', icon: '📊', roles: ['admin', 'manager'] },
  { to: '/admin/orders', label: 'Orders', icon: '🧾', roles: ['admin', 'manager'] },
  { to: '/admin/users', label: 'Users', icon: '👥', roles: ['admin'] },
  { to: '/admin/products', label: 'Products', icon: '📦', roles: ['admin', 'manager'] },
  { to: '/admin/warehouse', label: 'Warehouse', icon: '🏚️', roles: ['admin', 'manager'] },
  { to: '/admin/categories', label: 'Categories', icon: '🗂️', roles: ['admin'] },
  { to: '/admin/banners', label: 'Banners', icon: '📣', roles: ['admin'] },
  { to: '/admin/audit', label: 'Audit', icon: '🛡️', roles: ['admin'] },
];

const QUICK_FILTERS = [
  { id: 'all', label: 'Все' },
  { id: 'pending', label: 'Ожидают' },
  { id: 'packing', label: 'Сборка' },
  { id: 'ready', label: 'К отгрузке' },
];

export default function AdminLayout() {
  const { profile, logout } = useAuth();
  const [activeFilter, setActiveFilter] = useState('all');

  const roleSource = profile as any;
  const roleRaw = String(roleSource?.role || roleSource?.user_role || roleSource?.data?.role || '').toLowerCase();
  const normalizedRole = roleRaw === 'sale_operator' ? 'sale' : roleRaw || 'admin';

  const navigation = useMemo(() => {
    return NAV_ITEMS.filter((item) => item.roles.includes(normalizedRole));
  }, [normalizedRole]);

  return (
    <div className={s.root}>
      <aside className={s.sidebar}>
        <div className={s.sidebarHeader}>
          <div className={s.brand}>
            <span className={s.logo}>OZ</span>
            <div>
              <p>Ozar Admin</p>
              <small>Control Center</small>
            </div>
          </div>
          <div className={s.userCard}>
            <div className={s.avatar}>{(profile?.first_name || 'A').slice(0, 1)}</div>
            <div>
              <p className={s.userName}>{profile?.first_name || 'Admin'}</p>
              <small>{normalizedRole}</small>
            </div>
          </div>
        </div>
        <nav className={s.nav}>
          {navigation.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/admin'}
              className={({ isActive }) =>
                isActive ? `${s.navLink} ${s.navLinkActive}` : s.navLink
              }
            >
              <span>{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className={s.sidebarFooter}>
          <div className={s.sidebarStat}>
            <p>В обработке</p>
            <strong>12 заказов</strong>
          </div>
          <div className={s.sidebarStat}>
            <p>Новых товаров</p>
            <strong>8</strong>
          </div>
          <button className={s.logout} onClick={logout}>
            Выйти
          </button>
        </div>
      </aside>

      <div className={s.body}>
        <header className={s.toolbar}>
          <div className={s.search}>
            <span>🔍</span>
            <input type="search" placeholder="Поиск по заказам, товарам, клиентам..." />
          </div>
          <div className={s.filters}>
            {QUICK_FILTERS.map((chip) => (
              <button
                key={chip.id}
                type="button"
                onClick={() => setActiveFilter(chip.id)}
                className={
                  activeFilter === chip.id ? `${s.filterChip} ${s.filterChipActive}` : s.filterChip
                }
              >
                {chip.label}
              </button>
            ))}
          </div>
          <div className={s.toolbarActions}>
            <button className={s.iconButton} type="button" title="Включить тёмную тему">
              🌓
            </button>
            <button className={s.iconButton} type="button" title="Уведомления">
              🔔
              <span className={s.badgeDot} />
            </button>
            <button className={s.iconButton} type="button" title="Быстрое добавление">
              ➕
            </button>
          </div>
        </header>

        <main className={s.main}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}

