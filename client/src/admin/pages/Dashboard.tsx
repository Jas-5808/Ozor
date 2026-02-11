import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { shopAPI, orderAPI } from '../../services/api';

export default function Dashboard() {
  const { t } = useTranslation();
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
    Array<{ id: string | number; name: string; client: string; status: string; sum: number; date: string }>
  >([]);
  const getToday = () => {
    const d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
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

  // helper: normalize orders like in Orders.tsx
  const normalizeOrders = (data: any[]) => data.map((o:any)=> {
    const first = (o.buyer_firstname ?? '').trim();
    const last = (o.buyer_lastname ?? '').trim();
    const full = (o.full_name ?? '').trim();
    const byNames = (first || last) ? `${first} ${last}`.trim() : '';
    const customer = byNames || full || (o.order_comment || '').trim() || 'Guest';
    const totalPrice = Number(o.total_price || o.total || 0) || 0;
    const created = o.created_at || o.created || o.order_date || o.date || o.createdAt || null;
    return {
      id: o.order_id || o.id,
      customer,
      total: totalPrice,
      status: String(o.status || 'pending').toLowerCase(),
      order_number: o.order_number || o.number || o.code || '',
      created_at: created,
      name: (o.product_name || o.title || '—') as string,
    };
  });

  useEffect(()=>{
    let ignore = false;
    const load = async ()=>{
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
            shopAPI.getAllOrders().catch(()=> ({ data: [] } as any)),
            shopAPI.getProducts({ limit: 1000 }).catch(()=> ({ data: [] } as any)),
            shopAPI.getCategories().catch(()=> ({ data: [] } as any)),
          ]);

          if (!hasOrdersStats) {
            const ordersRaw = Array.isArray(ordersRes.data) ? ordersRes.data : (ordersRes.data?.results || ordersRes.data?.data || []);
            const orders = normalizeOrders(ordersRaw || []);
            const total = orders.length;
            const sum = orders.reduce((acc, o:any)=> acc + (Number(o.total)||0), 0);
            const pending = orders.filter((o:any)=> o.status === 'pending').length;
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
              const sortedRecent = [...orders].sort((a:any,b:any)=>{
                const ta = a.created_at ? new Date(a.created_at).getTime() : 0;
                const tb = b.created_at ? new Date(b.created_at).getTime() : 0;
                return tb - ta;
              }).slice(0, 5).map(o=> ({
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
            const out = (productsRaw || []).filter((p:any)=> Number(p.stock||0) <= 0).length;
            const low = (productsRaw || []).filter((p:any)=> Number(p.stock||0) > 0 && Number(p.stock||0) <= 5).length;
            const amount = (productsRaw || []).reduce((acc:number, p:any)=> acc + (Number(p.price||0) * Number(p.stock||0)), 0);
            if (!ignore) setWarehouseStats({ total: totalProducts, low, out, amount });
          }

          void categoriesRes;
        }
      } finally {
        if (!ignore) setLoading(false);
      }
    };
    load();
    return ()=>{ ignore = true; };
  }, []);

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
      cancelled: `${base} bg-rose-100 text-rose-700`,
      delivered: `${base} bg-emerald-100 text-emerald-700`,
      confirmed: `${base} bg-blue-100 text-blue-700`,
      packing: `${base} bg-indigo-100 text-indigo-700`,
      packed: `${base} bg-violet-100 text-violet-700`,
      default: `${base} bg-slate-100 text-slate-700`,
    } as Record<string, string>;
  }, []);

  const statusBoard = [
    { label: t('admin.dashboard.orderStatuses.pending'), value: ordersStats.pending, color: '#f97316', accent: '#ffedd5' },
    { label: t('admin.dashboard.orderStatuses.ready'), value: Math.max(ordersStats.total - ordersStats.pending, 0), color: '#0ea5e9', accent: '#e0f2fe' },
    { label: t('admin.dashboard.orderStatuses.issues'), value: warehouseStats.out, color: '#ef4444', accent: '#fee2e2' },
  ];

  return (
    <div className="space-y-4 p-4 md:p-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-semibold text-emerald-700">{t('admin.dashboard.hero.eyebrow')}</p>
            <h1 className="text-2xl font-extrabold text-slate-900">{t('admin.dashboard.hero.title')}</h1>
            <p className="text-slate-500">{t('admin.dashboard.hero.subtitle')}</p>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 w-full md:w-auto">
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm">
              <p className="text-slate-500">{t('admin.dashboard.hero.orders')}</p>
              <strong className="text-lg text-slate-900">{ordersStats.total}</strong>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm">
              <p className="text-slate-500">{t('admin.dashboard.hero.avg')}</p>
              <strong className="text-lg text-slate-900">{ordersStats.avg.toLocaleString()} {t('common.currency')}</strong>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm">
              <p className="text-slate-500">{t('admin.dashboard.hero.inventory')}</p>
              <strong className="text-lg text-slate-900">{warehouseStats.amount.toLocaleString()} {t('common.currency')}</strong>
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
            <div className="rounded-xl bg-slate-50 p-3">
              <p className="text-slate-500 text-sm">{t('admin.dashboard.warehouse.low')}</p>
              <strong className="text-xl">{warehouseStats.low}</strong>
            </div>
            <div className="rounded-xl bg-slate-50 p-3">
              <p className="text-slate-500 text-sm">{t('admin.dashboard.warehouse.outOfStock')}</p>
              <strong className="text-xl">{warehouseStats.out}</strong>
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
                <th className="px-3 py-2">{t('admin.dashboard.recent.table.order')}</th>
                <th className="px-3 py-2">{t('admin.dashboard.recent.table.client')}</th>
                <th className="px-3 py-2">{t('admin.dashboard.recent.table.status')}</th>
                <th className="px-3 py-2">{t('admin.dashboard.recent.table.amount')}</th>
                <th className="px-3 py-2">{t('admin.dashboard.recent.table.date')}</th>
              </tr>
            </thead>
            <tbody>
              {recent.map((r) => (
                <tr key={r.id} className="border-t border-slate-200">
                  <td className="px-3 py-2">
                    <div className="font-semibold text-slate-900">#{r.id}</div>
                    <div className="text-[12px] text-slate-500">{r.name}</div>
                  </td>
                  <td className="px-3 py-2">{r.client}</td>
                  <td className="px-3 py-2">
                    <span className={badgeClass[r.statusCode] || badgeClass.default}>{r.status}</span>
                  </td>
                  <td className="px-3 py-2">{r.sum.toLocaleString()}</td>
                  <td className="px-3 py-2">{r.date}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <span className="block text-sm font-semibold text-slate-900">{t('admin.dashboard.packedByUpdated.title')}</span>
            <small className="text-slate-500">{t('admin.dashboard.packedByUpdated.subtitle')}</small>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <label className="flex items-center gap-1 text-sm">
              <span className="text-slate-600">{t('admin.dashboard.packedByUpdated.dateFrom')}</span>
              <input
                type="date"
                value={packedDateFrom}
                onChange={(e) => setPackedDateFrom(e.target.value)}
                className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
              />
            </label>
            <label className="flex items-center gap-1 text-sm">
              <span className="text-slate-600">{t('admin.dashboard.packedByUpdated.dateTo')}</span>
              <input
                type="date"
                value={packedDateTo}
                onChange={(e) => setPackedDateTo(e.target.value)}
                className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
              />
            </label>
          </div>
        </div>
        {packedError && (
          <p className="mb-2 text-sm text-rose-600">{packedError}</p>
        )}
        {packedLoading && (
          <p className="mb-2 text-sm text-slate-500">{t('admin.dashboard.packedByUpdated.loading')}</p>
        )}
        <div className="overflow-hidden rounded-xl border border-slate-200">
          <table className="w-full border-collapse text-left text-sm">
            <thead className="bg-slate-100 text-slate-600">
              <tr>
                <th className="px-3 py-2">{t('admin.dashboard.packedByUpdated.table.order')}</th>
                <th className="px-3 py-2">{t('admin.dashboard.packedByUpdated.table.client')}</th>
                <th className="px-3 py-2">{t('admin.dashboard.packedByUpdated.table.status')}</th>
                <th className="px-3 py-2">{t('admin.dashboard.packedByUpdated.table.amount')}</th>
                <th className="px-3 py-2">{t('admin.dashboard.packedByUpdated.table.updatedAt')}</th>
              </tr>
            </thead>
            <tbody>
              {packedList.length === 0 && !packedLoading && (
                <tr>
                  <td colSpan={5} className="px-3 py-4 text-center text-slate-500">
                    {t('admin.dashboard.packedByUpdated.empty')}
                  </td>
                </tr>
              )}
              {packedList.map((row) => (
                <tr key={row.id} className="border-t border-slate-200">
                  <td className="px-3 py-2">
                    <div className="font-semibold text-slate-900">#{row.id}</div>
                    <div className="text-[12px] text-slate-500">{row.order_number}</div>
                  </td>
                  <td className="px-3 py-2">{row.client}</td>
                  <td className="px-3 py-2">
                    <select
                      value={row.status}
                      onChange={(e) => handlePackedStatusChange(row.id, e.target.value)}
                      disabled={updatingOrderId === row.id}
                      className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-sm font-medium disabled:opacity-50"
                    >
                      {orderStatuses.map((st) => (
                        <option key={st} value={st}>
                          {t(`admin.ordersPage.statuses.${st}`, {
                            defaultValue:
                              st === 'pending'
                                ? 'В ожидании'
                                : st === 'accepted'
                                  ? 'Принят'
                                  : st === 'packing'
                                    ? 'Упаковывается'
                                    : st === 'packed'
                                      ? 'Упакован'
                                      : st === 'processing'
                                        ? 'В обработке'
                                        : st === 'shipped'
                                          ? 'Отправлен'
                                          : st === 'delivered'
                                            ? 'Доставлен'
                                            : st === 'cancelled'
                                              ? 'Отменён'
                                              : st === 'refunded'
                                                ? 'Возврат средств'
                                                : st,
                          })}
                        </option>
                      ))}
                    </select>
                    {updatingOrderId === row.id && (
                      <span className="ml-1 text-xs text-slate-500">...</span>
                    )}
                  </td>
                  <td className="px-3 py-2">{row.total_price.toLocaleString()}</td>
                  <td className="px-3 py-2">
                    {row.updated_at ? new Date(row.updated_at).toLocaleString('ru-RU') : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}


