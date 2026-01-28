import { useEffect, useMemo, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../hooks/useAuth';
import AdminLanguageSwitcher from './components/AdminLanguageSwitcher';
import useSEO from '../hooks/useSEO';

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
  payments: () => (
    <svg {...iconProps}>
      <rect x="4" y="6.5" width="16" height="11" rx="2" />
      <path d="M4 10.5h16" />
      <path d="M8 14h3" />
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

const WAREHOUSE_SUB_ITEMS = [
  { to: '/admin/warehouse/orders', labelKey: 'admin.warehouse.nav.orders' as const },
  { to: '/admin/warehouse/add', labelKey: 'admin.warehouse.nav.add' as const },
  { to: '/admin/warehouse/locations', labelKey: 'admin.warehouse.nav.locations' as const },
];

const NAV_ITEMS: Array<{ to: string; labelKey: string; icon: NavIconKey; roles: string[]; subItems?: { to: string; labelKey: string }[] }> = [
  { to: '/admin', labelKey: 'admin.nav.dashboard', icon: 'dashboard', roles: ['admin', 'manager', 'seo', 'ceo'] },
  { to: '/admin/orders', labelKey: 'admin.nav.orders', icon: 'orders', roles: ['admin', 'manager', 'seo', 'ceo'] },
  { to: '/admin/users', labelKey: 'admin.nav.users', icon: 'users', roles: ['admin', 'seo', 'ceo'] },
  { to: '/admin/products', labelKey: 'admin.nav.products', icon: 'products', roles: ['admin', 'manager', 'seo', 'ceo'] },
  { to: '/admin/warehouse', labelKey: 'admin.nav.warehouse', icon: 'warehouse', roles: ['admin', 'manager', 'seo', 'ceo'], subItems: WAREHOUSE_SUB_ITEMS },
  { to: '/admin/categories', labelKey: 'admin.nav.categories', icon: 'categories', roles: ['admin', 'seo', 'ceo'] },
  { to: '/admin/banners', labelKey: 'admin.nav.banners', icon: 'banners', roles: ['admin', 'seo', 'ceo'] },
  { to: '/admin/audit', labelKey: 'admin.nav.audit', icon: 'audit', roles: ['admin', 'seo', 'ceo'] },
  { to: '/admin/payments', labelKey: 'admin.nav.payments', icon: 'payments', roles: ['ceo', 'admin', 'seo'] },
];

export default function AdminLayout() {
  const { t } = useTranslation();
  const { profile, logout } = useAuth();
  const location = useLocation();
  const pathname = location.pathname;

  useSEO({
    title: 'Admin — OZAR',
    robots: 'noindex,nofollow',
  });
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
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

  // Определение мобильного устройства
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
      if (window.innerWidth >= 768) {
        setIsMobileMenuOpen(false);
      }
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const isDarkTheme = theme === 'dark';
  const toggleTheme = () => setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));

  const SearchIcon = ACTION_ICON_MAP.search;
  const ThemeIcon = isDarkTheme ? ACTION_ICON_MAP.sun : ACTION_ICON_MAP.moon;
  const BellIcon = ACTION_ICON_MAP.notifications;
  const AddIcon = ACTION_ICON_MAP.add;

  const BurgerIcon = () => (
    <svg {...iconProps} width={24} height={24}>
      <path d="M3 12h18M3 6h18M3 18h18" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  );

  const handleSidebarMouseEnter = () => {
    if (!isMobile) {
      setIsSidebarExpanded(true);
    }
  };

  const handleSidebarMouseLeave = () => {
    if (!isMobile) {
      setIsSidebarExpanded(false);
    }
  };

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
    if (!isMobileMenuOpen) {
      setIsSidebarExpanded(true);
    }
  };

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
    setIsSidebarExpanded(false);
  };

  const rootClasses = [
    'min-h-screen grid grid-cols-1 transition-[grid-template-columns] duration-300 relative',
    isSidebarExpanded ? 'md:grid-cols-[260px_1fr]' : 'md:grid-cols-[80px_1fr]',
    isDarkTheme ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900',
    isMobileMenuOpen && 'overflow-hidden',
  ]
    .filter(Boolean)
    .join(' ');

  const sidebarClasses = [
    'bg-gradient-to-b from-emerald-900 via-emerald-800 to-teal-700 text-emerald-50 p-6 flex flex-col gap-6 transition-all duration-300 overflow-hidden relative z-20',
    isSidebarExpanded ? 'md:w-[260px]' : 'md:w-[90px]',
    isMobile
      ? `fixed left-0 top-0 h-full w-[260px] transform ${isMobileMenuOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'}`
      : '',
  ]
    .filter(Boolean)
    .join(' ');

  const navLinkBase =
    'flex items-center gap-3 rounded-xl py-2 text-sm font-semibold transition-colors';
  const navLinkActive = isDarkTheme
    ? 'bg-emerald-600 text-white shadow'
    : 'bg-emerald-100 text-emerald-900 shadow-sm';
  const navLinkInactive = 'text-emerald-50/80 hover:bg-emerald-900/30 hover:text-white';

  const mainClasses = [
    'flex-1 p-4 md:p-6',
    isDarkTheme ? 'bg-slate-900 text-slate-100' : 'bg-slate-50 text-slate-900',
  ].join(' ');

  return (
    <div className={rootClasses}>
      {isMobile && isMobileMenuOpen && (
        <div className="fixed inset-0 z-10 bg-black/50" onClick={closeMobileMenu} />
      )}

      <aside
        className={sidebarClasses}
        onMouseEnter={handleSidebarMouseEnter}
        onMouseLeave={handleSidebarMouseLeave}
      >
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-2xl bg-white/20 text-lg font-extrabold">
              OZ
            </span>
            {(isSidebarExpanded || isMobile) && (
              <div className="leading-tight">
                <p className="font-bold">{t('admin.brand.title')}</p>
                <small className="text-emerald-100/80">{t('admin.brand.subtitle')}</small>
              </div>
            )}
          </div>

          {(isSidebarExpanded || isMobile) && (
            <div className="flex items-center gap-3 rounded-2xl bg-white/10 px-3 py-2">
              <div className="grid h-10 w-10 place-items-center rounded-full bg-white/20 text-base font-bold">
                {(profile?.first_name || 'A').slice(0, 1)}
              </div>
              <div className="leading-tight">
                <p className="font-semibold">{profile?.first_name || 'Admin'}</p>
                <small className="text-emerald-100/80">
                  {t(`admin.roles.${normalizedRole}`, normalizedRole)}
                </small>
              </div>
            </div>
          )}
        </div>

        <nav className="flex-1 space-y-1">
          {navigation.map((item) => {
            const Icon = NAV_ICON_MAP[item.icon];
            const isParentActive = item.subItems ? pathname.startsWith(item.to) : undefined;
            return (
              <div key={item.to} className="space-y-0.5">
                <NavLink
                  to={item.to}
                  end={item.to === '/admin' || !item.subItems}
                  className={({ isActive }) =>
                    [navLinkBase, (isParentActive ?? isActive) ? navLinkActive : navLinkInactive].join(' ')
                  }
                  title={!isSidebarExpanded ? t(item.labelKey) : undefined}
                  onClick={() => {
                    if (isMobile) {
                      closeMobileMenu();
                    }
                  }}
                >
                  <span className="grid h-9 w-9 place-items-center rounded-xl bg-white/10 text-white">
                    <Icon />
                  </span>
                  {(isSidebarExpanded || isMobile) && <span>{t(item.labelKey)}</span>}
                </NavLink>
                {item.subItems && isParentActive && (isSidebarExpanded || isMobile) && (
                  <div className="ml-12 flex flex-col gap-0.5 py-1">
                    {item.subItems.map((sub) => (
                      <NavLink
                        key={sub.to}
                        to={sub.to}
                        className={({ isActive }) =>
                          [
                            'rounded-lg py-1.5 pl-3 text-sm font-medium transition-colors',
                            isActive ? 'bg-white/20 text-white' : 'text-emerald-50/90 hover:bg-white/10 hover:text-white',
                          ].join(' ')
                        }
                        onClick={() => {
                          if (isMobile) closeMobileMenu();
                        }}
                      >
                        {t(sub.labelKey, {
                          defaultValue:
                            sub.labelKey === 'admin.warehouse.nav.orders'
                              ? 'Заказы'
                              : sub.labelKey === 'admin.warehouse.nav.add'
                                ? 'Добавить на склад'
                                : 'Склады',
                        })}
                      </NavLink>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        {(isSidebarExpanded || isMobile) && (
          <div className="space-y-3 rounded-2xl bg-white/10 px-3 py-3 text-sm">
            <div className="flex items-center justify-between">
              <p>{t('admin.sidebar.processing')}</p>
              <strong className="text-white">{t('admin.sidebar.processingCount', { count: 12 })}</strong>
            </div>
            <div className="flex items-center justify-between">
              <p>{t('admin.sidebar.newProducts')}</p>
              <strong className="text-white">{t('admin.sidebar.newProductsCount', { count: 8 })}</strong>
            </div>
            <button
              className="w-full rounded-xl bg-white/15 px-3 py-2 text-left font-semibold text-white transition hover:bg-white/25"
              onClick={logout}
            >
              {t('admin.sidebar.logout')}
            </button>
          </div>
        )}
      </aside>

      <div className="flex min-h-screen flex-col bg-white/70 backdrop-blur">
        <header
          className={`sticky top-0 z-10 flex items-center justify-between gap-3 border-b px-4 py-3 ${
            isDarkTheme ? 'bg-slate-900/80 border-slate-800 text-slate-100' : 'bg-white/80 border-slate-200'
          }`}
        >
          <div className="flex items-center gap-3 flex-1">
            {isMobile && (
              <button
                className="grid h-10 w-10 place-items-center rounded-xl border border-slate-200 bg-white text-slate-700 shadow-sm"
                onClick={toggleMobileMenu}
                aria-label="Toggle menu"
              >
                <BurgerIcon />
              </button>
            )}
            <div
              className={`flex items-center gap-2 rounded-xl border px-3 py-2 flex-1 max-w-xl ${
                isDarkTheme ? 'bg-slate-900/70 border-slate-700 text-slate-100' : 'bg-white border-slate-200 text-slate-700'
              }`}
            >
              <SearchIcon />
              <input
                type="search"
                placeholder={t('admin.toolbar.searchPlaceholder')}
                className="w-full bg-transparent outline-none placeholder:text-slate-400 text-sm"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <AdminLanguageSwitcher />
            <button
              className="grid h-10 w-10 place-items-center rounded-xl border border-slate-200 bg-white text-slate-700 shadow-sm"
              type="button"
              title={isDarkTheme ? t('admin.toolbar.themeLight') : t('admin.toolbar.themeDark')}
              aria-pressed={isDarkTheme}
              onClick={toggleTheme}
            >
              <ThemeIcon />
            </button>
            <button
              className="relative grid h-10 w-10 place-items-center rounded-xl border border-slate-200 bg-white text-slate-700 shadow-sm"
              type="button"
              title={t('admin.toolbar.notifications')}
            >
              <BellIcon />
              <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-orange-500" />
            </button>
            <button
              className="grid h-10 w-10 place-items-center rounded-xl border border-slate-200 bg-white text-slate-700 shadow-sm"
              type="button"
              title={t('admin.toolbar.quickAdd')}
            >
              <AddIcon />
            </button>
          </div>
        </header>

        <main className={mainClasses}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}

