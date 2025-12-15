import { useEffect, useMemo, useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../hooks/useAuth';
// @ts-ignore
import s from './AdminLayout.module.scss';
import AdminLanguageSwitcher from './components/AdminLanguageSwitcher';

const iconProps = {
  width: 20,
  height: 20,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.6,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
} as const;

const NAV_ICON_MAP = {
  dashboard: () => (
    <svg {...iconProps}>
      <rect x="3.5" y="3.5" width="7" height="7" rx="1.5" />
      <rect x="13.5" y="3.5" width="7" height="5" rx="1.5" />
      <rect x="13.5" y="11.5" width="7" height="9" rx="1.5" />
      <rect x="3.5" y="13.5" width="7" height="7" rx="1.5" />
    </svg>
  ),
  orders: () => (
    <svg {...iconProps}>
      <path d="M7 3.5h10l3 3.5v13H4v-13z" />
      <path d="M7 3.5v4h13" />
      <path d="M8.5 12h7" />
      <path d="M8.5 16h7" />
    </svg>
  ),
  users: () => (
    <svg {...iconProps}>
      <circle cx="9" cy="8" r="3.5" />
      <path d="M4.5 19.5c.7-2.8 2.8-4.5 6-4.5s5.3 1.7 6 4.5" />
      <path d="M17 9.5a2.5 2.5 0 1 0-1.4-4.6" />
      <path d="M19.5 15.5c-.4-1.8-1.4-2.9-3.1-3.3" />
    </svg>
  ),
  products: () => (
    <svg {...iconProps}>
      <path d="M4 7.5 12 3l8 4.5-8 4.5-8-4.5Z" />
      <path d="M4 7.5v8.5l8 4.5 8-4.5v-8.5" />
      <path d="M12 12V3" />
    </svg>
  ),
  warehouse: () => (
    <svg {...iconProps}>
      <path d="M4 10.5 12 4l8 6.5v9.5H4z" />
      <path d="M8 20V12h8v8" />
      <path d="M10.5 14.5h3" />
    </svg>
  ),
  categories: () => (
    <svg {...iconProps}>
      <rect x="3.5" y="3.5" width="7" height="7" rx="1.5" />
      <rect x="13.5" y="3.5" width="7" height="7" rx="1.5" />
      <rect x="3.5" y="13.5" width="7" height="7" rx="1.5" />
      <rect x="13.5" y="13.5" width="7" height="7" rx="1.5" />
    </svg>
  ),
  banners: () => (
    <svg {...iconProps}>
      <path d="M5 10.5V4.5l14-2v14l-14-2V9" />
      <path d="M5 12.5v6" />
      <path d="M5 18.5h-1.5" />
    </svg>
  ),
  audit: () => (
    <svg {...iconProps}>
      <path d="M12 3 4 6.5v6c0 4.6 3.4 8.8 8 9.5 4.6-.7 8-4.9 8-9.5v-6z" />
      <path d="m9 12 2.2 2.2L15 10.5" />
    </svg>
  ),
} as const;

const ACTION_ICON_MAP = {
  search: () => (
    <svg {...iconProps}>
      <circle cx="11" cy="11" r="6" />
      <path d="m16.5 16.5 3.5 3.5" />
    </svg>
  ),
  moon: () => (
    <svg {...iconProps}>
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79Z" />
    </svg>
  ),
  sun: () => (
    <svg {...iconProps}>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2" />
      <path d="M12 20v2" />
      <path d="m4.93 4.93 1.41 1.41" />
      <path d="m17.66 17.66 1.41 1.41" />
      <path d="M2 12h2" />
      <path d="M20 12h2" />
      <path d="m4.93 19.07 1.41-1.41" />
      <path d="m17.66 6.34 1.41-1.41" />
    </svg>
  ),
  notifications: () => (
    <svg {...iconProps}>
      <path d="M6 17.5h12" />
      <path d="M18 17.5V11a6 6 0 0 0-12 0v6.5" />
      <path d="M9.5 17.5v1a2.5 2.5 0 0 0 5 0v-1" />
    </svg>
  ),
  add: () => (
    <svg {...iconProps}>
      <circle cx="12" cy="12" r="7.5" />
      <path d="M12 8v8" />
      <path d="M8 12h8" />
    </svg>
  ),
} as const;

type NavIconKey = keyof typeof NAV_ICON_MAP;

const NAV_ITEMS: Array<{ to: string; labelKey: string; icon: NavIconKey; roles: string[] }> = [
  { to: '/admin', labelKey: 'admin.nav.dashboard', icon: 'dashboard', roles: ['admin', 'manager'] },
  { to: '/admin/orders', labelKey: 'admin.nav.orders', icon: 'orders', roles: ['admin', 'manager'] },
  { to: '/admin/users', labelKey: 'admin.nav.users', icon: 'users', roles: ['admin'] },
  { to: '/admin/products', labelKey: 'admin.nav.products', icon: 'products', roles: ['admin', 'manager'] },
  { to: '/admin/warehouse', labelKey: 'admin.nav.warehouse', icon: 'warehouse', roles: ['admin', 'manager'] },
  { to: '/admin/categories', labelKey: 'admin.nav.categories', icon: 'categories', roles: ['admin'] },
  { to: '/admin/banners', labelKey: 'admin.nav.banners', icon: 'banners', roles: ['admin'] },
  { to: '/admin/audit', labelKey: 'admin.nav.audit', icon: 'audit', roles: ['admin'] },
];

const QUICK_FILTERS = [
  { id: 'all', labelKey: 'admin.filters.all' },
  { id: 'pending', labelKey: 'admin.filters.pending' },
  { id: 'packing', labelKey: 'admin.filters.packing' },
  { id: 'ready', labelKey: 'admin.filters.ready' },
];

export default function AdminLayout() {
  const { t } = useTranslation();
  const { profile, logout } = useAuth();
  const [activeFilter, setActiveFilter] = useState('all');
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window === 'undefined') {
      return 'light';
    }
    return (localStorage.getItem('admin_theme') as 'light' | 'dark') === 'dark' ? 'dark' : 'light';
  });

  const roleSource = profile as any;
  const roleRaw = String(roleSource?.role || roleSource?.user_role || roleSource?.data?.role || '').toLowerCase();
  const normalizedRole = roleRaw === 'sale_operator' ? 'sale' : roleRaw || 'admin';

  const navigation = useMemo(() => {
    return NAV_ITEMS.filter((item) => item.roles.includes(normalizedRole));
  }, [normalizedRole]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('admin_theme', theme);
    }
  }, [theme]);

  const isDarkTheme = theme === 'dark';
  const toggleTheme = () => setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));

  const SearchIcon = ACTION_ICON_MAP.search;
  const ThemeIcon = isDarkTheme ? ACTION_ICON_MAP.sun : ACTION_ICON_MAP.moon;
  const BellIcon = ACTION_ICON_MAP.notifications;
  const AddIcon = ACTION_ICON_MAP.add;

  return (
    <div className={`${s.root} ${isDarkTheme ? s.rootDark : ''} ${isSidebarExpanded ? s.rootExpanded : s.rootCollapsed}`}>
      <aside 
        className={`${s.sidebar} ${isSidebarExpanded ? s.sidebarExpanded : s.sidebarCollapsed}`}
        onMouseEnter={() => setIsSidebarExpanded(true)}
        onMouseLeave={() => setIsSidebarExpanded(false)}
      >
        <div className={s.sidebarHeader}>
            <div className={s.brand}>
              <span className={s.logo}>OZ</span>
              {isSidebarExpanded && (
                <div>
                  <p>{t('admin.brand.title')}</p>
                  <small>{t('admin.brand.subtitle')}</small>
                </div>
              )}
            </div>
          {isSidebarExpanded && (
            <div className={s.userCard}>
              <div className={s.avatar}>{(profile?.first_name || 'A').slice(0, 1)}</div>
              <div>
                  <p className={s.userName}>{profile?.first_name || 'Admin'}</p>
                  <small>{t(`admin.roles.${normalizedRole}`, normalizedRole)}</small>
              </div>
            </div>
          )}
        </div>
        <nav className={s.nav}>
          {navigation.map((item) => {
            const Icon = NAV_ICON_MAP[item.icon];
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/admin'}
                className={({ isActive }) =>
                  isActive ? `${s.navLink} ${s.navLinkActive}` : s.navLink
                }
                title={!isSidebarExpanded ? t(item.labelKey) : undefined}
              >
                <span className={s.navIcon}>
                  <Icon />
                </span>
                {isSidebarExpanded && <span>{t(item.labelKey)}</span>}
              </NavLink>
            );
          })}
        </nav>
        {isSidebarExpanded && (
          <div className={s.sidebarFooter}>
            <div className={s.sidebarStat}>
                <p>{t('admin.sidebar.processing')}</p>
                <strong>{t('admin.sidebar.processingCount', { count: 12 })}</strong>
              </div>
              <div className={s.sidebarStat}>
                <p>{t('admin.sidebar.newProducts')}</p>
                <strong>{t('admin.sidebar.newProductsCount', { count: 8 })}</strong>
              </div>
              <button className={s.logout} onClick={logout}>
                {t('admin.sidebar.logout')}
              </button>
            </div>
        )}
      </aside>

      <div className={s.body}>
        <header className={s.toolbar}>
          <div className={s.search}>
            <SearchIcon />
            <input type="search" placeholder={t('admin.toolbar.searchPlaceholder')} />
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
                {t(chip.labelKey)}
              </button>
            ))}
          </div>
          <div className={s.toolbarActions}>
            <AdminLanguageSwitcher />
            <button
              className={s.iconButton}
              type="button"
              title={
                isDarkTheme ? t('admin.toolbar.themeLight') : t('admin.toolbar.themeDark')
              }
              aria-pressed={isDarkTheme}
              onClick={toggleTheme}
            >
              <ThemeIcon />
            </button>
            <button className={s.iconButton} type="button" title={t('admin.toolbar.notifications')}>
              <BellIcon />
              <span className={s.badgeDot} />
            </button>
            <button className={s.iconButton} type="button" title={t('admin.toolbar.quickAdd')}>
              <AddIcon />
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

