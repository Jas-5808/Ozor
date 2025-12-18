import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { warehouseAPI, orderAPI } from '../../services/api';

type SectionKey = 'orders' | 'add' | 'warehouses';

export default function Warehouse() {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const ordersRef = useRef<HTMLDivElement>(null);
  const addRef = useRef<HTMLDivElement>(null);
  const warehousesRef = useRef<HTMLDivElement>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [ordersError, setOrdersError] = useState<string | null>(null);
  const [ordersActionId, setOrdersActionId] = useState<string | null>(null);
  const [myOrders, setMyOrders] = useState<any[]>([]);
  const [myOrdersLoading, setMyOrdersLoading] = useState(false);
  const [myOrdersError, setMyOrdersError] = useState<string | null>(null);
  const [myOffset, setMyOffset] = useState(0);
  const [myLimit, setMyLimit] = useState(10);
  const [myActionId, setMyActionId] = useState<string | null>(null);
  const [locations, setLocations] = useState<any[]>([]);
  const [locationsLoading, setLocationsLoading] = useState(false);
  const [locationsError, setLocationsError] = useState<string | null>(null);
  const [locationFilter, setLocationFilter] = useState<'all' | 'free' | 'full'>('all');
  const statusLabels = useMemo(
    () => ({
      pending: t('admin.ordersPage.statuses.pending', { defaultValue: 'В ожидании' }),
      accepted: t('admin.ordersPage.statuses.accepted', { defaultValue: 'Принят' }),
      packing: t('admin.ordersPage.statuses.packing', { defaultValue: 'Упаковывается' }),
      packed: t('admin.ordersPage.statuses.packed', { defaultValue: 'Упакован' }),
      processing: t('admin.ordersPage.statuses.processing', { defaultValue: 'В обработке' }),
      shipped: t('admin.ordersPage.statuses.shipped', { defaultValue: 'Отправлен' }),
      delivered: t('admin.ordersPage.statuses.delivered', { defaultValue: 'Доставлен' }),
      cancelled: t('admin.ordersPage.statuses.cancelled', { defaultValue: 'Отменён' }),
      refunded: t('admin.ordersPage.statuses.refunded', { defaultValue: 'Возврат' }),
      paid: t('admin.ordersPage.statuses.paid', { defaultValue: 'Оплачен' }),
    }),
    [t]
  );
  const statusTone: Record<string, string> = {
    pending: 'bg-amber-100 text-amber-800',
    accepted: 'bg-emerald-100 text-emerald-700',
    packing: 'bg-blue-100 text-blue-700',
    packed: 'bg-blue-100 text-blue-700',
    processing: 'bg-sky-100 text-sky-700',
    shipped: 'bg-cyan-100 text-cyan-700',
    delivered: 'bg-emerald-100 text-emerald-700',
    cancelled: 'bg-rose-100 text-rose-700',
    refunded: 'bg-amber-100 text-amber-800',
    paid: 'bg-emerald-100 text-emerald-700',
  };
  const renderStatus = (code?: string) => {
    const key = String(code || '').toLowerCase();
    return (
      <span
        className={[
          'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold',
          statusTone[key] || 'bg-slate-100 text-slate-700',
        ].join(' ')}
      >
        {statusLabels[key] || code || '—'}
      </span>
    );
  };

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
    'rounded-xl px-5 py-2.5 text-sm md:text-base font-semibold border border-emerald-200 bg-emerald-500 text-white shadow-sm transition hover:-translate-y-[1px] hover:bg-emerald-600 hover:border-emerald-300';
  const navLinkActive = 'bg-emerald-700 text-white border-emerald-700 shadow-md';

  const fetchWarehouseOrders = useCallback(async () => {
    if (activeKey !== 'orders') return;
    let ignore = false;
    try {
      setOrdersLoading(true);
      setOrdersError(null);
      const res = await warehouseAPI.getOrders({ offset: 0, limit: 20 });
      if (ignore) return;
      const data = Array.isArray(res.data) ? res.data : res.data?.results || res.data?.items || res.data?.data || [];
      const sorted = [...data].sort((a: any, b: any) => {
        const ta = a?.created_at ? new Date(a.created_at).getTime() : 0;
        const tb = b?.created_at ? new Date(b.created_at).getTime() : 0;
        return tb - ta;
      });
      setOrders(sorted);
    } catch (e: any) {
      setOrdersError(e?.response?.data?.detail || e?.message || 'Ошибка загрузки заказов склада');
    } finally {
      setOrdersLoading(false);
    }
    return () => {
      ignore = true;
    };
  }, [activeKey]);

  const fetchMyOrders = useCallback(async () => {
    if (activeKey !== 'orders') return;
    let ignore = false;
    try {
      setMyOrdersLoading(true);
      setMyOrdersError(null);
      const res = await warehouseAPI.getMyOrders({ offset: myOffset, limit: myLimit });
      if (ignore) return;
      const data = Array.isArray(res.data) ? res.data : res.data?.results || res.data?.items || res.data?.data || [];
      const sorted = [...data].sort((a: any, b: any) => {
        const ta = a?.created_at ? new Date(a.created_at).getTime() : 0;
        const tb = b?.created_at ? new Date(b.created_at).getTime() : 0;
        return tb - ta;
      });
      setMyOrders(sorted);
    } catch (e: any) {
      setMyOrdersError(e?.response?.data?.detail || e?.message || 'Ошибка загрузки моих заказов');
    } finally {
      setMyOrdersLoading(false);
    }
    return () => {
      ignore = true;
    };
  }, [activeKey, myOffset, myLimit]);

  useEffect(() => {
    fetchWarehouseOrders();
  }, [fetchWarehouseOrders]);

  useEffect(() => {
    fetchMyOrders();
  }, [fetchMyOrders]);

  useEffect(() => {
    if (activeKey !== 'warehouses') return;
    let ignore = false;
    const load = async () => {
      try {
        setLocationsLoading(true);
        setLocationsError(null);
        const res = await warehouseAPI.getLocations({ filter: locationFilter });
        if (ignore) return;
        const data = Array.isArray(res.data) ? res.data : res.data?.results || res.data?.data || [];
        setLocations(data);
      } catch (e: any) {
        if (ignore) return;
        setLocationsError(e?.response?.data?.detail || e?.message || 'Ошибка загрузки мест на складе');
      } finally {
        if (!ignore) setLocationsLoading(false);
      }
    };
    load();
    return () => {
      ignore = true;
    };
  }, [activeKey, locationFilter]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 p-4 md:p-6 space-y-6">
      <section className="sticky top-0 z-10 bg-emerald-50 backdrop-blur border border-emerald-200 rounded-2xl p-4 shadow-md">
        <div className="flex flex-wrap items-center justify-center gap-3">
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
          {ordersLoading && <p className="text-sm text-slate-500">{t('common.loading') || 'Загрузка...'}</p>}
          {ordersError && <p className="text-sm text-rose-600">{ordersError}</p>}
          {!ordersLoading && !ordersError && (
            <div className="overflow-x-auto mt-2">
              <table className="w-full overflow-hidden rounded-xl border border-slate-200 bg-white text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-3 py-2 text-left">#</th>
                    <th className="px-3 py-2 text-left">{t('admin.ordersPage.table.status') || 'Статус'}</th>
                    <th className="px-3 py-2 text-left">{t('admin.ordersPage.table.location', { defaultValue: 'Локация склада' }) || 'Локация склада'}</th>
                    <th className="px-3 py-2 text-left">{t('admin.ordersPage.table.date', { defaultValue: 'Дата' }) || 'Дата'}</th>
                    <th className="px-3 py-2 text-left">{t('admin.ordersPage.table.action') || 'Действие'}</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-3 py-3 text-center text-slate-500">
                        {t('common.empty') || 'Нет заказов'}
                      </td>
                    </tr>
                  )}
                  {orders.map((o, idx) => (
                    <tr key={o.id || idx} className="border-t border-slate-200 hover:bg-slate-50">
                      <td className="px-3 py-2 text-slate-700">{idx + 1}</td>
                      <td className="px-3 py-2">{renderStatus(o.status)}</td>
                      <td className="px-3 py-2 text-slate-700">
                        {[o.city, o.order_region].filter(Boolean).join(', ') || '—'}
                      </td>
                      <td className="px-3 py-2 text-slate-700">
                        {o.created_at ? new Date(o.created_at).toLocaleString('ru-RU') : '—'}
                      </td>
                      <td className="px-3 py-2">
                        <button
                          className="grid h-10 w-10 place-items-center rounded-lg bg-gradient-to-br from-emerald-500 to-emerald-600 text-white shadow cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                          title={t('admin.ordersPage.actions.start') || 'Принять'}
                          disabled={ordersActionId === o.id}
                          onClick={async () => {
                            try {
                              setOrdersActionId(o.id);
                              await warehouseAPI.submitOrder(o.id);
                              await fetchWarehouseOrders();
                            } catch (e) {
                              // ignore
                            } finally {
                              setOrdersActionId(null);
                            }
                          }}
                        >
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <div className="mt-6">
            <h3 className="mb-2 text-base font-bold text-slate-900">{t('admin.warehouse.nav.orders', { defaultValue: 'Мои заказы' })}</h3>
            {myOrdersLoading && <p className="text-sm text-slate-500">{t('common.loading') || 'Загрузка...'}</p>}
            {myOrdersError && <p className="text-sm text-rose-600">{myOrdersError}</p>}
            {!myOrdersLoading && !myOrdersError && (
              <div className="overflow-x-auto mt-2">
                <table className="w-full overflow-hidden rounded-xl border border-slate-200 bg-white text-sm">
                  <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-3 py-2 text-left">#</th>
                      <th className="px-3 py-2 text-left">{t('admin.ordersPage.table.order') || 'Заказ'}</th>
                      <th className="px-3 py-2 text-left">{t('admin.ordersPage.table.status') || 'Статус'}</th>
                      <th className="px-3 py-2 text-left">{t('admin.ordersPage.table.location', { defaultValue: 'Локация склада' }) || 'Локация склада'}</th>
                      <th className="px-3 py-2 text-left">{t('admin.ordersPage.table.comment', { defaultValue: 'Комментарий' }) || 'Комментарий'}</th>
                      <th className="px-3 py-2 text-left">{t('admin.ordersPage.table.total', { defaultValue: 'Кол-во позиций' }) || 'Кол-во позиций'}</th>
                      <th className="px-3 py-2 text-left">{t('admin.ordersPage.table.date', { defaultValue: 'Дата' }) || 'Дата'}</th>
                      <th className="px-3 py-2 text-left">{t('admin.ordersPage.table.action') || 'Действие'}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {myOrders.length === 0 && (
                      <tr>
                        <td colSpan={5} className="px-3 py-3 text-center text-slate-500">
                          {t('common.empty') || 'Нет заказов'}
                        </td>
                      </tr>
                    )}
                    {myOrders.map((o, idx) => (
                      <tr key={o.id || idx} className="border-t border-slate-200 hover:bg-slate-50">
                        <td className="px-3 py-2 text-slate-700">{idx + 1 + myOffset}</td>
                        <td className="px-3 py-2 text-slate-900 font-semibold">{o.order_number || o.id}</td>
                        <td className="px-3 py-2">{renderStatus(o.status)}</td>
                        <td className="px-3 py-2 text-slate-700">
                          {[o.city, o.order_region].filter(Boolean).join(', ') || '—'}
                        </td>
                        <td className="px-3 py-2 text-slate-700">
                          {o.order_comment || '—'}
                        </td>
                        <td className="px-3 py-2 text-slate-700">
                          {Array.isArray(o.items) ? o.items.reduce((sum: number, it: any) => sum + (it?.quantity || 0), 0) : 0}
                        </td>
                        <td className="px-3 py-2 text-slate-700">
                          {o.created_at ? new Date(o.created_at).toLocaleString('ru-RU') : '—'}
                        </td>
                        <td className="px-3 py-2">
                          <button
                            className="grid h-10 w-10 place-items-center rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                            title={t('admin.ordersPage.statuses.packed', { defaultValue: 'Упакован' })}
                            disabled={myActionId === o.id}
                            onClick={async () => {
                              try {
                                setMyActionId(o.id);
                                await orderAPI.updateStatus(o.id, 'packed');
                                await fetchMyOrders();
                              } catch {
                                // ignore
                              } finally {
                                setMyActionId(null);
                              }
                            }}
                          >
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                              <path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <button
                className="rounded-lg border border-slate-200 bg-white px-3 py-1 text-sm disabled:opacity-50"
                disabled={myOffset <= 0 || myOrdersLoading}
                onClick={() => setMyOffset((p) => Math.max(0, p - myLimit))}
              >
                {t('admin.ordersPage.pagination.prev') || 'Prev'}
              </button>
              <button
                className="rounded-lg border border-slate-200 bg-white px-3 py-1 text-sm disabled:opacity-50"
                disabled={myOrders.length < myLimit || myOrdersLoading}
                onClick={() => setMyOffset((p) => p + myLimit)}
              >
                {t('admin.ordersPage.pagination.next') || 'Next'}
              </button>
              <select
                className="rounded-lg border border-slate-200 bg-white px-3 py-1 text-sm text-slate-700 shadow-sm outline-none focus:border-emerald-500"
                value={myLimit}
                onChange={(e) => {
                  setMyOffset(0);
                  setMyLimit(Number(e.target.value) || 10);
                }}
              >
                {[10, 20, 50].map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </div>
          </div>
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
          <div className="mb-3 flex flex-wrap items-center gap-2">
            {(['all', 'free', 'full'] as const).map((opt) => (
              <button
                key={opt}
                className={[
                  'rounded-lg border px-3 py-1 text-sm font-semibold transition',
                  locationFilter === opt
                    ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                    : 'border-slate-200 bg-white text-slate-700 hover:border-emerald-400',
                ].join(' ')}
                onClick={() => setLocationFilter(opt)}
              >
                {opt === 'all' && (t('common.all') || 'Все')}
                {opt === 'free' && (t('admin.warehouse.filter.free', { defaultValue: 'Свободные' }) || 'Свободные')}
                {opt === 'full' && (t('admin.warehouse.filter.full', { defaultValue: 'Заполненные' }) || 'Заполненные')}
              </button>
            ))}
          </div>

          {locationsLoading && <p className="text-sm text-slate-500">{t('common.loading') || 'Загрузка...'}</p>}
          {locationsError && <p className="text-sm text-rose-600">{locationsError}</p>}
          {!locationsLoading && !locationsError && (
            <div className="overflow-x-auto">
              <table className="w-full overflow-hidden rounded-xl border border-slate-200 bg-white text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-3 py-2 text-left">#</th>
                    <th className="px-3 py-2 text-left">{t('admin.warehouse.locations.code', { defaultValue: 'Код' }) || 'Код'}</th>
                    <th className="px-3 py-2 text-left">{t('admin.warehouse.locations.desc', { defaultValue: 'Описание' }) || 'Описание'}</th>
                    <th className="px-3 py-2 text-left">{t('admin.warehouse.locations.stock', { defaultValue: 'Остаток' }) || 'Остаток'}</th>
                  </tr>
                </thead>
                <tbody>
                  {locations.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-3 py-3 text-center text-slate-500">
                        {t('common.empty') || 'Нет данных'}
                      </td>
                    </tr>
                  )}
                  {locations.map((loc, idx) => (
                    <tr key={loc.id || idx} className="border-t border-slate-200 hover:bg-slate-50">
                      <td className="px-3 py-2 text-slate-700">{idx + 1}</td>
                      <td className="px-3 py-2 text-slate-900 font-semibold">{loc.code || '—'}</td>
                      <td className="px-3 py-2 text-slate-700">{loc.description || '—'}</td>
                      <td className="px-3 py-2 text-slate-700">{loc.total_stock ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}
    </div>
  );
}