import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { shopAPI, orderAPI } from '../../services/api';
import { useAuth } from '../../hooks/useAuth';

export default function Dashboard() {
  const { t } = useTranslation();
  const { profile } = useAuth() as any;
  const [loading, setLoading] = useState(false);
  const [warehouseStats, setWarehouseStats] = useState(() => ({
    total: 0,
    low: 0,
    out: 0,
    amount: 0,
  }));
  const [ordersStats, setOrdersStats] = useState(() => ({
    total: 0,
    avg: 0,
    sum: 0,
    pending: 0,
  }));
  const [recent, setRecent] = useState<
    Array<{ id: string | number; name: string; client: string; status: string; statusCode?: string; sum: number; date: string }>
  >([]);
  const getToday = () => {
    const d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  };
  const getFirstOfMonth = () => {
    const d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-01';
  };
  const [packedDateFrom, setPackedDateFrom] = useState(getToday);
  const [packedDateTo, setPackedDateTo] = useState(getToday);
  const [packedList, setPackedList] = useState<Array<{
    id: string;
    order_number: string;
    status: string;
    updated_at: string | null;
    client: string;
    total_price: number;
  }>>([]);
  const [packedLoading, setPackedLoading] = useState(false);
  const [packedError, setPackedError] = useState<string | null>(null);
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null);

  // SEO: all orders table
  const [allOrders, setAllOrders] = useState<any[]>([]);
  const [allOrdersLoading, setAllOrdersLoading] = useState(false);
  const [oSearch, setOSearch] = useState('');
  const [oStatus, setOStatus] = useState('');
  const [updatingAllOrderId, setUpdatingAllOrderId] = useState<string | null>(null);

  // SEO: operator stats
  const [opsStats, setOpsStats] = useState<any[]>([]);
  const [opsLoading, setOpsLoading] = useState(false);
  const [opsPeriod, setOpsPeriod] = useState<'month' | 'alltime'>('month');

  // CEO: Изменения статусов — все заказы с фильтрацией и поиском
  const [ceoOrders, setCeoOrders] = useState<Array<{
    id: string;
    order_number: string;
    client: string;
    phone: string;
    order_region: string;
    product_names: string;
    status: string;
    total_price: number;
    created_at: string | null;
    updated_at: string | null;
  }>>([]);
  const [ceoOrdersLoading, setCeoOrdersLoading] = useState(false);
  const [ceoOrdersError, setCeoOrdersError] = useState<string | null>(null);
  const [ceoStatusFilter, setCeoStatusFilter] = useState('');
  const [ceoDateFrom, setCeoDateFrom] = useState('');
  const [ceoDateTo, setCeoDateTo] = useState('');
  const [ceoSearch, setCeoSearch] = useState('');
  const [updatingCeoOrderId, setUpdatingCeoOrderId] = useState<string | null>(null);

  // Role detection (must be before loadCeoOrders / useEffect that use isSeoOrHigher)
  const roleRaw = String(profile?.role ?? profile?.user_role ?? profile?.data?.role ?? '').toLowerCase().trim();
  const normalizedRole = roleRaw === 'sale_operator' ? 'sale' : roleRaw;
  const isSeoOrHigher = [
    'seo', 'admin', 'ceo', 'manager',
    'sale_manager', 'driver_manager', 'warehouse_manager',
  ].includes(normalizedRole);

  // Для поиска по телефону: если введены только цифры (напр. последние 4), отправляем только цифры — так бэкенд найдёт по подстроке в номере
  const getSearchParam = useCallback((raw: string) => {
    const s = raw.trim();
    if (!s) return undefined;
    const digitsOnly = s.replace(/\D/g, '');
    if (digitsOnly.length >= 4 && /^[\d\s]+$/.test(s)) return digitsOnly;
    return s;
  }, []);

  const loadCeoOrders = useCallback(async () => {
    setCeoOrdersLoading(true);
    setCeoOrdersError(null);
    try {
      const res = await shopAPI.getDashboardOrdersCeo({
        status: ceoStatusFilter || undefined,
        date_from: ceoDateFrom || undefined,
        date_to: ceoDateTo || undefined,
        search: getSearchParam(ceoSearch),
        limit: 500,
      });
      setCeoOrders(Array.isArray(res.data) ? res.data : []);
    } catch (e: any) {
      setCeoOrdersError(e?.response?.data?.detail || e?.message || 'Ошибка загрузки');
      setCeoOrders([]);
    } finally {
      setCeoOrdersLoading(false);
    }
  }, [ceoStatusFilter, ceoDateFrom, ceoDateTo, ceoSearch, getSearchParam]);

  // Первая загрузка заказов при открытии дашборда (по умолчанию — текущий месяц)
  useEffect(() => {
    let ignore = false;
    (async () => {
      setCeoOrdersLoading(true);
      setCeoOrdersError(null);
      try {
        const res = await shopAPI.getDashboardOrdersCeo({
          date_from: getFirstOfMonth(),
          date_to: getToday(),
          limit: 500,
        });
        if (!ignore) setCeoOrders(Array.isArray(res.data) ? res.data : []);
      } catch (e: any) {
        if (!ignore) {
          setCeoOrdersError(e?.response?.data?.detail || e?.message || 'Ошибка загрузки');
          setCeoOrders([]);
        }
      } finally {
        if (!ignore) setCeoOrdersLoading(false);
      }
    })();
    return () => { ignore = true; };
  }, []);

  /** Все статусы заказа (то же API, что у операторов) */
  const orderStatuses = useMemo(
    () =>
      [
        'pending',
        'accepted',
        'packing',
        'packed',
        'processing',
        'shipped',
        'delivered',
        'cancelled',
        'refunded',
      ] as const,
    []
  );

  const handlePackedStatusChange = useCallback(async (orderId: string, newStatus: string) => {
    if (newStatus === 'packed') return;
    try {
      setUpdatingOrderId(orderId);
      setPackedError(null);
      await orderAPI.updateStatus(orderId, newStatus);
      setPackedList((prev) => prev.filter((r) => r.id !== orderId));
    } catch (e: any) {
      setPackedError(e?.response?.data?.detail || e?.message || 'Ошибка смены статуса');
    } finally {
      setUpdatingOrderId(null);
    }
  }, []);

  const handleAllOrderStatusChange = useCallback(async (orderId: string, newStatus: string) => {
    try {
      setUpdatingAllOrderId(orderId);
      await orderAPI.updateStatus(orderId, newStatus);
      setAllOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, status: newStatus } : o))
      );
    } catch {
      // ignore
    } finally {
      setUpdatingAllOrderId(null);
    }
  }, []);

  const handleCeoOrderStatusChange = useCallback(async (orderId: string, newStatus: string) => {
    try {
      setUpdatingCeoOrderId(orderId);
      setCeoOrdersError(null);
      await orderAPI.updateStatus(orderId, newStatus);
      setCeoOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, status: newStatus } : o))
      );
    } catch (e: any) {
      setCeoOrdersError(e?.response?.data?.detail || e?.message || 'Ошибка смены статуса');
    } finally {
      setUpdatingCeoOrderId(null);
    }
  }, []);

  // helper: normalize orders like in Orders.tsx
  const normalizeOrders = (data: any[]) => data.map((o: any) => {
    const first = (o.buyer_firstname ?? '').trim();
    const last = (o.buyer_lastname ?? '').trim();
    const full = (o.full_name ?? '').trim();
    const byNames = (first || last) ? `${first} ${last}`.trim() : '';
    const customer = byNames || full || (o.order_comment || '').trim() || 'Guest';
    const totalPrice = Number(o.total_price || o.total || 0) || 0;
    const created = o.created_at || o.created || o.order_date || o.date || o.createdAt || null;
    const phone = o.guest_user_number || o.phone || o.buyer_phone || o.user_phone || '';
    return {
      id: o.order_id || o.id,
      customer,
      phone,
      total: totalPrice,
      status: String(o.status || 'pending').toLowerCase(),
      order_number: o.order_number || o.number || o.code || '',
      created_at: created,
      name: (o.product_name || o.title || '—') as string,
    };
  });

  useEffect(() => {
    let ignore = false;
    const load = async () => {
      try {
        setLoading(true);
        // fetch in parallel
        const [ordersStatsRes, warehouseStatsRes] = await Promise.allSettled([
          shopAPI.getOrdersStats(),
          shopAPI.getWarehouseStats(),
        ]);

        const hasOrdersStats = ordersStatsRes.status === "fulfilled";
        const hasWarehouseStats = warehouseStatsRes.status === "fulfilled";

        if (hasOrdersStats) {
          const statsPayload: any = (ordersStatsRes as any).value?.data ?? (ordersStatsRes as any).value;
          const stats = statsPayload?.data ?? statsPayload;
          if (!ignore) {
            setOrdersStats({
              total: Number(stats?.total || 0),
              avg: Number(stats?.avg || 0),
              sum: Number(stats?.sum || 0),
              pending: Number(stats?.pending || 0),
            });
            if (Array.isArray(stats?.recent)) {
              setRecent(stats.recent);
            }
          }
        }

        if (hasWarehouseStats) {
          const statsPayload: any = (warehouseStatsRes as any).value?.data ?? (warehouseStatsRes as any).value;
          const stats = statsPayload?.data ?? statsPayload;
          if (!ignore) {
            setWarehouseStats({
              total: Number(stats?.total || 0),
              low: Number(stats?.low || 0),
              out: Number(stats?.out || 0),
              amount: Number(stats?.amount || 0),
            });
          }
        }

        if (!hasOrdersStats || !hasWarehouseStats) {
          const [ordersRes, productsRes, categoriesRes] = await Promise.all([
            shopAPI.getAllOrders().catch(() => ({ data: [] } as any)),
            shopAPI.getProducts({ limit: 1000 }).catch(() => ({ data: [] } as any)),
            shopAPI.getCategories().catch(() => ({ data: [] } as any)),
          ]);

          if (!hasOrdersStats) {
            const ordersRaw = Array.isArray(ordersRes.data) ? ordersRes.data : (ordersRes.data?.results || ordersRes.data?.data || []);
            const orders = normalizeOrders(ordersRaw || []);
            const total = orders.length;
            const sum = orders.reduce((acc, o: any) => acc + (Number(o.total) || 0), 0);
            const pending = orders.filter((o: any) => o.status === 'pending').length;
            const avg = total ? Math.round(sum / total) : 0;
            if (!ignore) {
              setOrdersStats({ total, avg, sum, pending });
              const statusLabels: Record<string, string> = {
                pending: t('admin.dashboard.recent.status.pending'),
                cancelled: t('admin.dashboard.recent.status.cancelled'),
                delivered: t('admin.dashboard.recent.status.delivered'),
                confirmed: t('admin.dashboard.recent.status.confirmed'),
                packing: t('admin.dashboard.recent.status.packing'),
              };
              const sortedRecent = [...orders].sort((a: any, b: any) => {
                const ta = a.created_at ? new Date(a.created_at).getTime() : 0;
                const tb = b.created_at ? new Date(b.created_at).getTime() : 0;
                return tb - ta;
              }).slice(0, 5).map((o) => ({
                id: o.id,
                name: o.order_number || o.name || '—',
                client: o.customer,
                statusCode: o.status,
                status: statusLabels[o.status] || statusLabels.confirmed,
                sum: o.total || 0,
                date: o.created_at ? new Date(o.created_at).toLocaleString('ru-RU') : '—'
              }));
              setRecent(sortedRecent);
            }
          }

          if (!hasWarehouseStats) {
            const productsRaw = Array.isArray(productsRes.data) ? productsRes.data : (productsRes.data?.results || productsRes.data?.data || []);
            const totalProducts = (productsRaw || []).length;
            const out = (productsRaw || []).filter((p: any) => Number(p.stock || 0) <= 0).length;
            const low = (productsRaw || []).filter((p: any) => Number(p.stock || 0) > 0 && Number(p.stock || 0) <= 5).length;
            const amount = (productsRaw || []).reduce((acc: number, p: any) => acc + (Number(p.price || 0) * Number(p.stock || 0)), 0);
            if (!ignore) setWarehouseStats({ total: totalProducts, low, out, amount });
          }

          void categoriesRes;
        }
      } finally {
        if (!ignore) setLoading(false);
      }
    };
    load();
    return () => { ignore = true; };
  }, []);

  // SEO: load all orders
  useEffect(() => {
    if (!isSeoOrHigher) return;
    let ignore = false;
    const load = async () => {
      try {
        setAllOrdersLoading(true);
        const res = await shopAPI.getAllOrders();
        if (ignore) return;
        const raw = Array.isArray(res.data) ? res.data : (res.data as any)?.results ?? (res.data as any)?.data ?? [];
        setAllOrders(normalizeOrders(raw));
      } catch {
        // ignore
      } finally {
        if (!ignore) setAllOrdersLoading(false);
      }
    };
    load();
    return () => { ignore = true; };
  }, [isSeoOrHigher]);

  // SEO: load operator stats
  useEffect(() => {
    if (!isSeoOrHigher) return;
    let ignore = false;
    const load = async () => {
      try {
        setOpsLoading(true);
        const params =
          opsPeriod === 'month'
            ? { date_from: getFirstOfMonth(), date_to: getToday() }
            : undefined;
        const res = await shopAPI.getOperatorsStats(params);
        if (ignore) return;
        const data = Array.isArray(res.data) ? res.data : (res.data as any)?.data ?? [];
        setOpsStats(data);
      } catch {
        // ignore
      } finally {
        if (!ignore) setOpsLoading(false);
      }
    };
    load();
    return () => { ignore = true; };
  }, [isSeoOrHigher, opsPeriod]);

  useEffect(() => {
    let ignore = false;
    const loadPacked = async () => {
      if (!packedDateFrom || !packedDateTo) return;
      try {
        setPackedLoading(true);
        setPackedError(null);
        const res = await shopAPI.getPackedOrdersByUpdatedAt({
          date_from: packedDateFrom,
          date_to: packedDateTo,
        });
        if (ignore) return;
        const data = Array.isArray(res.data) ? res.data : (res.data as any)?.results ?? [];
        setPackedList(data);
      } catch (e: any) {
        if (!ignore) {
          setPackedError(e?.response?.data?.detail || e?.message || t('admin.dashboard.packedByUpdated.error'));
          setPackedList([]);
        }
      } finally {
        if (!ignore) setPackedLoading(false);
      }
    };
    loadPacked();
    return () => { ignore = true; };
  }, [packedDateFrom, packedDateTo, t]);

  const badgeClass = useMemo(() => {
    const base = 'inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold';
    return {
      pending: `${base} bg-amber-100 text-amber-800`,
      accepted: `${base} bg-blue-100 text-blue-700`,
      cancelled: `${base} bg-rose-100 text-rose-700`,
      delivered: `${base} bg-emerald-100 text-emerald-700`,
      confirmed: `${base} bg-blue-100 text-blue-700`,
      packing: `${base} bg-indigo-100 text-indigo-700`,
      packed: `${base} bg-violet-100 text-violet-700`,
      shipped: `${base} bg-sky-100 text-sky-700`,
      processing: `${base} bg-orange-100 text-orange-700`,
      refunded: `${base} bg-pink-100 text-pink-700`,
      default: `${base} bg-slate-100 text-slate-700`,
    } as Record<string, string>;
  }, []);

  const statusBoard = [
    { label: t('admin.dashboard.orderStatuses.pending'), value: ordersStats.pending, color: '#f97316', accent: '#ffedd5' },
    { label: t('admin.dashboard.orderStatuses.ready'), value: Math.max(ordersStats.total - ordersStats.pending, 0), color: '#0ea5e9', accent: '#e0f2fe' },
    { label: t('admin.dashboard.orderStatuses.issues'), value: warehouseStats.out, color: '#ef4444', accent: '#fee2e2' },
  ];

  const filteredAllOrders = useMemo(() => {
    const q = oSearch.trim().toLowerCase();
    return allOrders.filter((o) => {
      const matchSearch =
        !q ||
        o.customer?.toLowerCase().includes(q) ||
        o.phone?.toLowerCase().includes(q) ||
        String(o.order_number || '').toLowerCase().includes(q) ||
        String(o.id || '').toLowerCase().includes(q);
      const matchStatus = !oStatus || o.status === oStatus;
      return matchSearch && matchStatus;
    });
  }, [allOrders, oSearch, oStatus]);

  const statusSelectCls = 'rounded-lg border border-slate-300 bg-white px-2 py-1 text-sm font-medium disabled:opacity-50';

  return (
    <div className="space-y-4 p-4 md:p-6">
      {/* Hero metric cards */}
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-semibold text-emerald-700">{t('admin.dashboard.hero.eyebrow')}</p>
            <h1 className="text-2xl font-extrabold text-slate-900">{t('admin.dashboard.hero.title')}</h1>
            <p className="text-slate-500">{t('admin.dashboard.hero.subtitle')}</p>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 w-full md:w-auto">
            {/* Orders card — emerald */}
            <div className="rounded-xl border border-emerald-100 bg-linear-to-br from-emerald-50 to-emerald-100/60 px-4 py-3 text-sm shadow-sm">
              <div className="mb-1 flex items-center gap-2">
                <svg className="h-4 w-4 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                <p className="text-emerald-700 font-medium">{t('admin.dashboard.hero.orders')}</p>
              </div>
              <strong className="text-2xl text-emerald-900">{ordersStats.total}</strong>
            </div>
            {/* Avg card — blue */}
            <div className="rounded-xl border border-blue-100 bg-linear-to-br from-blue-50 to-blue-100/60 px-4 py-3 text-sm shadow-sm">
              <div className="mb-1 flex items-center gap-2">
                <svg className="h-4 w-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                <p className="text-blue-700 font-medium">{t('admin.dashboard.hero.avg')}</p>
              </div>
              <strong className="text-2xl text-blue-900">{ordersStats.avg.toLocaleString()} {t('common.currency')}</strong>
            </div>
            {/* Inventory card — violet */}
            <div className="rounded-xl border border-violet-100 bg-linear-to-br from-violet-50 to-violet-100/60 px-4 py-3 text-sm shadow-sm">
              <div className="mb-1 flex items-center gap-2">
                <svg className="h-4 w-4 text-violet-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
                <p className="text-violet-700 font-medium">{t('admin.dashboard.hero.inventory')}</p>
              </div>
              <strong className="text-2xl text-violet-900">{warehouseStats.amount.toLocaleString()} {t('common.currency')}</strong>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <span className="block text-sm font-semibold text-slate-900">{t('admin.dashboard.warehouse.title')}</span>
              <small className="text-slate-500">{t('admin.dashboard.warehouse.subtitle')}</small>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="rounded-xl bg-slate-50 p-3">
              <p className="text-slate-500 text-sm">{t('admin.dashboard.warehouse.total')}</p>
              <strong className="text-xl">{warehouseStats.total}</strong>
            </div>
            <div className="rounded-xl bg-amber-50 p-3">
              <p className="text-amber-700 text-sm">{t('admin.dashboard.warehouse.low')}</p>
              <strong className="text-xl text-amber-800">{warehouseStats.low}</strong>
            </div>
            <div className="rounded-xl bg-red-50 p-3">
              <p className="text-red-700 text-sm">{t('admin.dashboard.warehouse.outOfStock')}</p>
              <strong className="text-xl text-red-800">{warehouseStats.out}</strong>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <span className="block text-sm font-semibold text-slate-900">{t('admin.dashboard.orders.title')}</span>
              <small className="text-slate-500">{t('admin.dashboard.orders.subtitle')}</small>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {statusBoard.map((card) => (
              <article
                key={card.label}
                className="rounded-xl p-3 text-sm font-semibold shadow-sm"
                style={{ background: card.accent, color: card.color }}
              >
                <p className="text-slate-700">{card.label}</p>
                <strong className="text-lg" style={{ color: card.color }}>{card.value}</strong>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Recent orders table */}
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <span className="block text-sm font-semibold text-slate-900">{t('admin.dashboard.recent.title')}</span>
            {loading && <small className="text-slate-500">{t('admin.dashboard.recent.loading')}</small>}
          </div>
        </div>
        <div className="overflow-hidden rounded-xl border border-slate-200">
          <table className="w-full border-collapse text-left text-sm">
            <thead className="bg-slate-100 text-slate-600">
              <tr>
                <th className="px-3 py-3 font-semibold">{t('admin.dashboard.recent.table.order')}</th>
                <th className="px-3 py-3 font-semibold">{t('admin.dashboard.recent.table.client')}</th>
                <th className="px-3 py-3 font-semibold">{t('admin.dashboard.recent.table.status')}</th>
                <th className="px-3 py-3 font-semibold">{t('admin.dashboard.recent.table.amount')}</th>
                <th className="px-3 py-3 font-semibold">{t('admin.dashboard.recent.table.date')}</th>
              </tr>
            </thead>
            <tbody>
              {recent.map((r) => (
                <tr key={r.id} className="border-t border-slate-200 hover:bg-slate-50 transition-colors">
                  <td className="px-3 py-3">
                    <div className="font-semibold text-slate-900">#{r.id}</div>
                    <div className="text-[12px] text-slate-500">{r.name}</div>
                  </td>
                  <td className="px-3 py-3">{r.client}</td>
                  <td className="px-3 py-3">
                    <span className={badgeClass[(r as any).statusCode || r.status] || badgeClass.default}>{r.status}</span>
                  </td>
                  <td className="px-3 py-3">{r.sum.toLocaleString()}</td>
                  <td className="px-3 py-3">{r.date}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Изменения статусов: поиск, фильтр по статусу, даты, таблица с телефоном/регионом/товаром */}
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="mb-3 flex flex-col gap-3">
          <div>
            <span className="block text-sm font-semibold text-slate-900">{t('admin.dashboard.statusChangesCeo.title')}</span>
            <small className="text-slate-500">{t('admin.dashboard.statusChangesCeo.subtitle')}</small>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="text"
              placeholder={t('admin.dashboard.statusChangesCeo.searchPlaceholder')}
              value={ceoSearch}
              onChange={(e) => setCeoSearch(e.target.value)}
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm min-w-[180px]"
            />
            <select
              value={ceoStatusFilter}
              onChange={(e) => setCeoStatusFilter(e.target.value)}
              className="rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm"
            >
              <option value="">{t('admin.dashboard.seoSection.allStatuses')}</option>
              {orderStatuses.map((st) => (
                <option key={st} value={st}>
                  {t(`admin.ordersPage.statuses.${st}`, { defaultValue: st })}
                </option>
              ))}
            </select>
            <label className="flex items-center gap-1 text-sm">
              <span className="text-slate-600">{t('admin.dashboard.packedByUpdated.dateFrom')}</span>
              <input
                type="date"
                value={ceoDateFrom}
                onChange={(e) => setCeoDateFrom(e.target.value)}
                className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
              />
            </label>
            <label className="flex items-center gap-1 text-sm">
              <span className="text-slate-600">{t('admin.dashboard.packedByUpdated.dateTo')}</span>
              <input
                type="date"
                value={ceoDateTo}
                onChange={(e) => setCeoDateTo(e.target.value)}
                className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
              />
            </label>
            <button
              type="button"
              onClick={loadCeoOrders}
              disabled={ceoOrdersLoading}
              className="rounded-lg bg-emerald-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              {t('admin.dashboard.statusChangesCeo.apply')}
            </button>
          </div>
        </div>
        {ceoOrdersError && (
          <p className="mb-2 text-sm text-rose-600">{ceoOrdersError}</p>
        )}
        {ceoOrdersLoading && (
          <p className="mb-2 text-sm text-slate-500">{t('admin.dashboard.packedByUpdated.loading')}</p>
        )}
        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full border-collapse text-left text-sm">
            <thead className="bg-slate-100 text-slate-600">
              <tr>
                <th className="px-3 py-3 font-semibold">{t('admin.dashboard.packedByUpdated.table.order')}</th>
                <th className="px-3 py-3 font-semibold">{t('admin.dashboard.packedByUpdated.table.client')}</th>
                <th className="px-3 py-3 font-semibold">{t('admin.dashboard.seoSection.phone')}</th>
                <th className="px-3 py-3 font-semibold">{t('admin.dashboard.statusChangesCeo.region')}</th>
                <th className="px-3 py-3 font-semibold">{t('admin.dashboard.statusChangesCeo.product')}</th>
                <th className="px-3 py-3 font-semibold">{t('admin.dashboard.packedByUpdated.table.status')}</th>
                <th className="px-3 py-3 font-semibold">{t('admin.dashboard.packedByUpdated.table.amount')}</th>
                <th className="px-3 py-3 font-semibold">{t('admin.dashboard.packedByUpdated.table.updatedAt')}</th>
              </tr>
            </thead>
            <tbody>
              {ceoOrders.length === 0 && !ceoOrdersLoading && (
                <tr>
                  <td colSpan={8} className="px-3 py-4 text-center text-slate-500">
                    {t('admin.dashboard.packedByUpdated.empty')}
                  </td>
                </tr>
              )}
              {ceoOrders.map((row) => (
                <tr key={row.id} className="border-t border-slate-200 hover:bg-slate-50 transition-colors">
                  <td className="px-3 py-3">
                    <div className="font-semibold text-slate-900">#{row.id}</div>
                    <div className="text-[12px] text-slate-500">{row.order_number}</div>
                  </td>
                  <td className="px-3 py-3">{row.client}</td>
                  <td className="px-3 py-3 text-slate-600">{row.phone}</td>
                  <td className="px-3 py-3 text-slate-600">{row.order_region}</td>
                  <td className="px-3 py-3 max-w-[200px] truncate" title={row.product_names}>{row.product_names}</td>
                  <td className="px-3 py-3">
                    <select
                      value={row.status}
                      onChange={(e) => handleCeoOrderStatusChange(row.id, e.target.value)}
                      disabled={updatingCeoOrderId === row.id}
                      className={statusSelectCls}
                    >
                      {orderStatuses.map((st) => (
                        <option key={st} value={st}>
                          {t(`admin.ordersPage.statuses.${st}`, { defaultValue: st })}
                        </option>
                      ))}
                    </select>
                    {updatingCeoOrderId === row.id && (
                      <span className="ml-1 text-xs text-slate-500">...</span>
                    )}
                  </td>
                  <td className="px-3 py-3">{row.total_price.toLocaleString()}</td>
                  <td className="px-3 py-3">
                    {row.updated_at ? new Date(row.updated_at).toLocaleString('ru-RU') : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* SEO SECTION: All Orders */}
      {isSeoOrHigher && (
        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <span className="block text-sm font-semibold text-slate-900">{t('admin.dashboard.seoSection.ordersTitle')}</span>
              {allOrdersLoading && <small className="text-slate-500">{t('admin.dashboard.packedByUpdated.loading')}</small>}
            </div>
            <div className="flex flex-wrap gap-2">
              <input
                className="h-9 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-900 outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 sm:w-52"
                placeholder={t('admin.dashboard.seoSection.searchPlaceholder')}
                value={oSearch}
                onChange={(e) => setOSearch(e.target.value)}
              />
              <select
                className="h-9 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-900 outline-none"
                value={oStatus}
                onChange={(e) => setOStatus(e.target.value)}
              >
                <option value="">{t('admin.dashboard.seoSection.allStatuses')}</option>
                {orderStatuses.map((st) => (
                  <option key={st} value={st}>
                    {t(`admin.ordersPage.statuses.${st}`, { defaultValue: st })}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="overflow-hidden rounded-xl border border-slate-200">
            <table className="w-full border-collapse text-left text-sm">
              <thead className="bg-slate-100 text-slate-600">
                <tr>
                  <th className="px-3 py-3 font-semibold">{t('admin.dashboard.recent.table.order')}</th>
                  <th className="px-3 py-3 font-semibold">{t('admin.dashboard.recent.table.client')}</th>
                  <th className="px-3 py-3 font-semibold">{t('admin.dashboard.seoSection.phone')}</th>
                  <th className="px-3 py-3 font-semibold">{t('admin.dashboard.recent.table.status')}</th>
                  <th className="px-3 py-3 font-semibold">{t('admin.dashboard.recent.table.amount')}</th>
                  <th className="px-3 py-3 font-semibold">{t('admin.dashboard.recent.table.date')}</th>
                </tr>
              </thead>
              <tbody>
                {filteredAllOrders.length === 0 && !allOrdersLoading && (
                  <tr>
                    <td colSpan={6} className="px-3 py-4 text-center text-slate-500">—</td>
                  </tr>
                )}
                {filteredAllOrders.map((o) => (
                  <tr key={o.id} className="border-t border-slate-200 hover:bg-slate-50 transition-colors">
                    <td className="px-3 py-3">
                      <div className="font-semibold text-slate-900">#{o.order_number || o.id}</div>
                    </td>
                    <td className="px-3 py-3">{o.customer}</td>
                    <td className="px-3 py-3 text-slate-600">{o.phone || '—'}</td>
                    <td className="px-3 py-3">
                      <select
                        value={o.status}
                        onChange={(e) => handleAllOrderStatusChange(String(o.id), e.target.value)}
                        disabled={updatingAllOrderId === String(o.id)}
                        className={statusSelectCls}
                      >
                        {orderStatuses.map((st) => (
                          <option key={st} value={st}>
                            {t(`admin.ordersPage.statuses.${st}`, { defaultValue: st })}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-3 py-3">{Number(o.total || 0).toLocaleString()}</td>
                    <td className="px-3 py-3">
                      {o.created_at ? new Date(o.created_at).toLocaleString('ru-RU') : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* SEO SECTION: Operator Stats */}
      {isSeoOrHigher && (
        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <span className="block text-sm font-semibold text-slate-900">{t('admin.dashboard.seoSection.opsTitle')}</span>
              {opsLoading && <small className="text-slate-500">{t('admin.dashboard.packedByUpdated.loading')}</small>}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setOpsPeriod('month')}
                className={`rounded-xl px-4 py-1.5 text-sm font-semibold transition ${opsPeriod === 'month' ? 'bg-emerald-600 text-white' : 'border border-slate-200 text-slate-700 hover:border-emerald-500 hover:text-emerald-700'}`}
              >
                {t('admin.dashboard.seoSection.thisMonth')}
              </button>
              <button
                onClick={() => setOpsPeriod('alltime')}
                className={`rounded-xl px-4 py-1.5 text-sm font-semibold transition ${opsPeriod === 'alltime' ? 'bg-emerald-600 text-white' : 'border border-slate-200 text-slate-700 hover:border-emerald-500 hover:text-emerald-700'}`}
              >
                {t('admin.dashboard.seoSection.allTime')}
              </button>
            </div>
          </div>
          <div className="overflow-hidden rounded-xl border border-slate-200">
            <table className="w-full border-collapse text-left text-sm">
              <thead className="bg-slate-100 text-slate-600">
                <tr>
                  <th className="px-3 py-3 font-semibold">{t('admin.dashboard.seoSection.operator')}</th>
                  <th className="px-3 py-3 font-semibold text-center">{t('admin.dashboard.seoSection.acceptedPeriod')}</th>
                  <th className="px-3 py-3 font-semibold text-center">{t('admin.dashboard.seoSection.cancelledPeriod')}</th>
                  <th className="px-3 py-3 font-semibold text-center">{t('admin.dashboard.seoSection.acceptedTotal')}</th>
                  <th className="px-3 py-3 font-semibold text-center">{t('admin.dashboard.seoSection.cancelledTotal')}</th>
                </tr>
              </thead>
              <tbody>
                {opsStats.length === 0 && !opsLoading && (
                  <tr>
                    <td colSpan={5} className="px-3 py-4 text-center text-slate-500">—</td>
                  </tr>
                )}
                {opsStats.map((op, idx) => (
                  <tr key={op.operator_id || idx} className="border-t border-slate-200 hover:bg-slate-50 transition-colors">
                    <td className="px-3 py-3 font-medium text-slate-900">
                      {op.first_name || ''} {op.last_name || ''}
                    </td>
                    <td className="px-3 py-3 text-center">
                      <span className="inline-flex items-center rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-800">
                        {op.accepted_in_period ?? op.period_orders ?? 0}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-center">
                      <span className="inline-flex items-center rounded-full bg-rose-100 px-2.5 py-0.5 text-xs font-semibold text-rose-700">
                        {op.cancelled_in_period ?? 0}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-center">
                      <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
                        {op.accepted_count ?? op.total_orders ?? 0}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-center">
                      <span className="inline-flex items-center rounded-full bg-rose-50 px-2.5 py-0.5 text-xs font-semibold text-rose-600">
                        {op.cancelled_count ?? 0}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
