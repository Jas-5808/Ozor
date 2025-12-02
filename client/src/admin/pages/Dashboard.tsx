import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
// @ts-ignore
import s from '../AdminLayout.module.scss';
import { shopAPI } from '../../services/api';

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
        const [ordersRes, productsRes, categoriesRes] = await Promise.all([
          shopAPI.getAllOrders().catch(()=> ({ data: [] } as any)),
          shopAPI.getProducts({ limit: 1000 }).catch(()=> ({ data: [] } as any)),
          shopAPI.getCategories().catch(()=> ({ data: [] } as any)),
        ]);

        // Orders
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

        // Products / Warehouse
        const productsRaw = Array.isArray(productsRes.data) ? productsRes.data : (productsRes.data?.results || productsRes.data?.data || []);
        const totalProducts = (productsRaw || []).length;
        const out = (productsRaw || []).filter((p:any)=> Number(p.stock||0) <= 0).length;
        const low = (productsRaw || []).filter((p:any)=> Number(p.stock||0) > 0 && Number(p.stock||0) <= 5).length;
        const amount = (productsRaw || []).reduce((acc:number, p:any)=> acc + (Number(p.price||0) * Number(p.stock||0)), 0);
        if (!ignore) setWarehouseStats({ total: totalProducts, low, out, amount });

        // Categories are not shown numerically here, but fetched to warm cache
        void categoriesRes;
      } finally {
        if (!ignore) setLoading(false);
      }
    };
    load();
    return ()=>{ ignore = true; };
  }, []);

  const badge = (status: string) => {
    const map: Record<string, string> = {
      pending: `${s.badge} ${s.badgeInfo}`,
      cancelled: `${s.badge} ${s.badgeCancelled}`,
      delivered: `${s.badge} ${s.badgePaid}`,
      confirmed: `${s.badge} ${s.badgeActive}`,
      packing: `${s.badge} ${s.badgePending}`,
    };
    return map[status] || s.badge;
  };

  const statusBoard = [
    { label: t('admin.dashboard.orderStatuses.pending'), value: ordersStats.pending, color: '#f97316', accent: '#ffedd5' },
    { label: t('admin.dashboard.orderStatuses.ready'), value: Math.max(ordersStats.total - ordersStats.pending, 0), color: '#0ea5e9', accent: '#e0f2fe' },
    { label: t('admin.dashboard.orderStatuses.issues'), value: warehouseStats.out, color: '#ef4444', accent: '#fee2e2' },
  ];

  return (
    <div className={s.dashboard}>
      <section className={s.hero}>
        <div>
          <p className={s.heroEyebrow}>{t('admin.dashboard.hero.eyebrow')}</p>
          <h1>{t('admin.dashboard.hero.title')}</h1>
          <p>{t('admin.dashboard.hero.subtitle')}</p>
        </div>
        <div className={s.heroStats}>
          <div>
            <span>{t('admin.dashboard.hero.orders')} </span>
            <strong>{ordersStats.total}</strong>
          </div>
          <div>
            <span>{t('admin.dashboard.hero.avg')} </span>
            <strong>{ordersStats.avg.toLocaleString()} {t('common.currency')}</strong>
          </div>
          <div>
            <span>{t('admin.dashboard.hero.inventory')} </span>
            <strong>{warehouseStats.amount.toLocaleString()} {t('common.currency')}</strong>
          </div>
        </div>
      </section>

      <section className={s.panelRow}>
        <div className={s.panel}>
          <div className={s.panelHeader}>
            <span>{t('admin.dashboard.warehouse.title')}</span>
            <small>{t('admin.dashboard.warehouse.subtitle')}</small>
          </div>
          <div className={s.statusBoard}>
            <div>
              <p>{t('admin.dashboard.warehouse.total')}</p>
              <strong>{warehouseStats.total}</strong>
            </div>
            <div>
              <p>{t('admin.dashboard.warehouse.low')}</p>
              <strong>{warehouseStats.low}</strong>
            </div>
            <div>
              <p>{t('admin.dashboard.warehouse.outOfStock')}</p>
              <strong>{warehouseStats.out}</strong>
            </div>
          </div>
        </div>
      </section>

      <section className={s.panelRow}>
        <div className={`${s.panel} ${s.splitPanel}`}>
          <div className={s.panelHeader}>
            <span>{t('admin.dashboard.orders.title')}</span>
            <small>{t('admin.dashboard.orders.subtitle')}</small>
          </div>
          <div className={s.statusList}>
            {statusBoard.map((card) => (
              <article
                key={card.label}
                style={{ background: card.accent }}
                className={s.statusCard}
              >
                <p>{card.label}</p>
                <strong>{card.value}</strong>
              </article>
            ))}
          </div>
        </div>
        <div className={`${s.panel} ${s.splitPanel}`}>
          <div className={s.panelHeader}>
            <span>{t('admin.dashboard.sales.title')}</span>
            <small>{t('admin.dashboard.sales.subtitle')}</small>
          </div>
          <div className={s.chartPlaceholder}>{t('admin.dashboard.sales.placeholder')}</div>
        </div>
      </section>

      <section className={s.panel}>
        <div className={s.panelHeader}>
          <span>{t('admin.dashboard.recent.title')}</span>
          {loading && <small>{t('admin.dashboard.recent.loading')}</small>}
        </div>
        <table className={s.table}>
          <thead>
            <tr>
              <th>{t('admin.dashboard.recent.table.order')}</th>
              <th>{t('admin.dashboard.recent.table.client')}</th>
              <th>{t('admin.dashboard.recent.table.status')}</th>
              <th>{t('admin.dashboard.recent.table.amount')}</th>
              <th>{t('admin.dashboard.recent.table.date')}</th>
            </tr>
          </thead>
          <tbody>
            {recent.map((r) => (
              <tr key={r.id}>
                <td>
                  #{r.id}
                  <div style={{ opacity: 0.65, fontSize: 12 }}>{r.name}</div>
                </td>
                <td>{r.client}</td>
                <td>
                  <span className={badge(r.statusCode)}>{r.status}</span>
                </td>
                <td>{r.sum.toLocaleString()}</td>
                <td>{r.date}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}


