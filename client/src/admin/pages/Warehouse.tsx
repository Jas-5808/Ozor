import { useMemo, useRef } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

type SectionKey = 'orders' | 'add' | 'warehouses';

export default function Warehouse() {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const ordersRef = useRef<HTMLDivElement>(null);
  const addRef = useRef<HTMLDivElement>(null);
  const warehousesRef = useRef<HTMLDivElement>(null);

  const sections: Array<{ id: SectionKey; label: string; path: string; ref: React.RefObject<HTMLDivElement | null> }> = useMemo(
    () => [
      { id: 'orders', label: t('admin.warehouse.nav.orders', { defaultValue: 'Заказы' }), path: '/admin/warehouse/orders', ref: ordersRef },
      { id: 'add', label: t('admin.warehouse.nav.add', { defaultValue: 'Добавить на склад' }), path: '/admin/warehouse/add', ref: addRef },
      { id: 'warehouses', label: t('admin.warehouse.nav.locations', { defaultValue: 'Склады' }), path: '/admin/warehouse/locations', ref: warehousesRef },
    ],
    [t]
  );

  const handleScroll = (ref: React.RefObject<HTMLDivElement | null>) => {
    if (ref.current) {
      ref.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const activeKey: SectionKey = useMemo(() => {
    if (location.pathname.includes('/warehouse/add')) return 'add';
    if (location.pathname.includes('/warehouse/locations')) return 'warehouses';
    return 'orders';
  }, [location.pathname]);

  const navLinkBase =
    'rounded-xl px-4 py-2 text-sm font-semibold border border-slate-200 bg-white text-slate-700 transition hover:border-emerald-500 hover:text-emerald-700';
  const navLinkActive = 'bg-emerald-600 text-white border-emerald-600 shadow';

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 p-4 md:p-6 space-y-6">
      <section className="sticky top-0 z-10 bg-white/80 backdrop-blur border border-slate-200 rounded-2xl p-3 shadow-sm">
        <div className="flex flex-wrap items-center gap-2">
          {sections.map((item) => (
            <NavLink
              key={item.id}
              to={item.path}
              className={({ isActive }) =>
                [navLinkBase, isActive ? navLinkActive : ''].filter(Boolean).join(' ')
              }
              onClick={(e) => {
                e.preventDefault();
                navigate(item.path);
                handleScroll(item.ref);
              }}
            >
              {item.label}
            </NavLink>
          ))}
        </div>
      </section>

      {activeKey === 'orders' && (
        <section ref={ordersRef} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="mb-2 text-lg font-bold">
            {t('admin.warehouse.nav.orders', { defaultValue: 'Заказы' })}
          </h2>
          <p className="text-slate-500">
            {t('admin.warehouse.placeholder.section', { defaultValue: 'Секция для списка заказов.' })}
          </p>
        </section>
      )}

      {activeKey === 'add' && (
        <section ref={addRef} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="mb-2 text-lg font-bold">
            {t('admin.warehouse.nav.add', { defaultValue: 'Добавить на склад' })}
          </h2>
          <p className="text-slate-500">
            {t('admin.warehouse.placeholder.sectionAdd', { defaultValue: 'Секция для приёмки/пополнения.' })}
          </p>
        </section>
      )}

      {activeKey === 'warehouses' && (
        <section ref={warehousesRef} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="mb-2 text-lg font-bold">
            {t('admin.warehouse.nav.locations', { defaultValue: 'Склады' })}
          </h2>
          <p className="text-slate-500">
            {t('admin.warehouse.placeholder.sectionLocations', { defaultValue: 'Секция для списка локаций и остатков.' })}
          </p>
        </section>
      )}
    </div>
  );
}