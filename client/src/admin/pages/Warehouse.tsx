import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
// @ts-ignore
import s from '../AdminLayout.module.scss';
import { warehouseAPI } from '../../services/api';

type WarehouseStatus = 'all' | 'accepted' | 'packing' | 'ready_to_ship';

interface WarehouseOrderItem {
  id: string;
  variant_id: string;
  variant_name: string;
  variant_sku: string;
  quantity: number;
}

interface WarehouseOrder {
  id: string;
  order_number: string | null;
  status: string;
  city: string;
  order_region: string;
  order_comment: string;
  created_at: string;
  client_phone?: string;
  total_price?: number;
  items: WarehouseOrderItem[];
}

interface WarehouseLocation {
  id: string;
  code: string;
  description?: string;
  total_stock?: number;
}

const STATUS_TABS: Array<{ key: WarehouseStatus; labelKey: string }> = [
  { key: 'all', labelKey: 'admin.warehouse.tabs.all' },
  { key: 'accepted', labelKey: 'admin.warehouse.tabs.accepted' },
  { key: 'packing', labelKey: 'admin.warehouse.tabs.packing' },
  { key: 'ready_to_ship', labelKey: 'admin.warehouse.tabs.ready' },
];

export default function Warehouse() {
  const { t } = useTranslation();
  const [statusFilter, setStatusFilter] = useState<WarehouseStatus>('all');
  const [query, setQuery] = useState('');
  const [location, setLocation] = useState('all');
  const [orders, setOrders] = useState<WarehouseOrder[]>([]);
  const [myOrders, setMyOrders] = useState<WarehouseOrder[]>([]);
  const [locations, setLocations] = useState<WarehouseLocation[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const kpis = useMemo(
    () => [
      { label: t('admin.warehouse.kpis.sku'), value: 128, accent: '#e0e7ff' },
      { label: t('admin.warehouse.kpis.totalStock'), value: 4521, accent: '#dcfce7' },
      { label: t('admin.warehouse.kpis.lowStock'), value: 14, accent: '#fee2e2' },
      { label: t('admin.warehouse.kpis.reserved'), value: 236, accent: '#fff7ed' },
    ],
    [t]
  );

  const STATUS_LABELS = useMemo(
    () => ({
      accepted: t('admin.warehouse.status.accepted', { defaultValue: 'Принят' }),
      packing: t('admin.warehouse.status.packing', { defaultValue: 'Упаковка' }),
      ready_to_ship: t('admin.warehouse.status.ready', { defaultValue: 'Готов к отправке' }),
      completed: t('admin.warehouse.status.completed', { defaultValue: 'Завершен' }),
      pending: t('admin.warehouse.status.pending', { defaultValue: 'В обработке' }),
    }),
    [t]
  );

  useEffect(() => {
    let ignore = false;
    const loadOrders = async () => {
      setLoading(true);
      setError(null);
      try {
        const [queueRes, myRes, locationsRes] = await Promise.all([
          warehouseAPI.getOrders({
            offset: 0,
            limit: 20,
            status: statusFilter === 'all' ? undefined : statusFilter,
          }),
          warehouseAPI.getMyOrders({ offset: 0, limit: 10 }),
          warehouseAPI.getLocations({ filter: 'all' }),
        ]);

        const queueData = queueRes.data as any;
        const myData = myRes.data as any;
        const locData = locationsRes.data as any;
        const queuePayload =
          (Array.isArray(queueData) && queueData) ||
          queueData?.results ||
          queueData?.data ||
          [];
        const myPayload =
          (Array.isArray(myData) && myData) || myData?.results || myData?.data || [];
        const locationPayload =
          (Array.isArray(locData) && locData) || locData?.results || locData?.data || [];

        if (!ignore) {
          setOrders(queuePayload as WarehouseOrder[]);
          setMyOrders(myPayload as WarehouseOrder[]);
          setLocations(locationPayload as WarehouseLocation[]);
        }
      } catch (err) {
        if (!ignore) {
          setError(t('admin.warehouse.errors.loadFailed'));
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    };
    loadOrders();
    return () => {
      ignore = true;
    };
  }, [statusFilter]);

  const filteredOrders = useMemo(() => {
    const q = query.trim().toLowerCase();
    const normalizedLocation = location.toLowerCase();
    return orders.filter((order) => {
      const matchesLocation =
        location === 'all' ||
        order.city?.toLowerCase() === normalizedLocation ||
        order.order_region?.toLowerCase() === normalizedLocation;
      const matchesQuery =
        !q ||
        order.order_number?.toLowerCase().includes(q) ||
        order.items.some(
          (item) =>
            item.variant_name.toLowerCase().includes(q) ||
            item.variant_sku.toLowerCase().includes(q)
        );
      return matchesLocation && matchesQuery;
    });
  }, [orders, location, query]);

  const nextStatus = (status: string) => {
    switch (status) {
      case 'accepted':
        return 'packing';
      case 'packing':
        return 'ready_to_ship';
      default:
        return null;
    }
  };

  const handleAdvance = async (order: WarehouseOrder) => {
    const fallback = nextStatus(order.status);
    if (!fallback) return;
    setUpdatingId(order.id);
    try {
      const response = await warehouseAPI.submitOrder(order.id);
      const apiData = response.data as any;
      const serverStatus = apiData?.new_status || fallback;
      setOrders((prev) =>
        prev.map((item) =>
          item.id === order.id ? { ...item, status: serverStatus } : item
        )
      );
      setMyOrders((prev) =>
        prev.map((item) =>
          item.id === order.id ? { ...item, status: serverStatus } : item
        )
      );
    } catch (err) {
      setError(t('admin.warehouse.errors.updateFailed'));
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className={s.dashboard}>
      <section className={s.hero}>
        <div>
          <p className={s.heroEyebrow}>{t('admin.warehouse.hero.eyebrow')}</p>
          <h1>{t('admin.warehouse.hero.title')}</h1>
          <p>{t('admin.warehouse.hero.subtitle')}</p>
        </div>
        <div className={s.heroStats}>
          {kpis.slice(0, 3).map((item) => (
            <div key={item.label}>
              <span>{item.label}</span>
              <strong>{item.value.toLocaleString()}</strong>
            </div>
          ))}
        </div>
      </section>

      <section className={s.cardGrid} style={{ marginBottom: 18 }}>
        {kpis.map((kpi) => (
          <div key={kpi.label} className={s.kpi}>
            <div style={{ opacity: 0.65, fontSize: 12 }}>{kpi.label}</div>
            <div style={{ fontSize: 24, fontWeight: 800 }}>{kpi.value.toLocaleString()}</div>
          </div>
        ))}
      </section>

      <section className={s.panel}>
          <div className={s.panelHeader}>
            <span>{t('admin.warehouse.queue.title')}</span>
            <small>{t('admin.warehouse.queue.subtitle')}</small>
          </div>
        <div className={s.warehouseFilters}>
          <div className={s.tabChips}>
            {STATUS_TABS.map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => setStatusFilter(item.key)}
                className={
                  statusFilter === item.key
                    ? `${s.filterChip} ${s.filterChipActive}`
                    : s.filterChip
                }
              >
                {t(item.labelKey)}
              </button>
            ))}
          </div>
          <div className={s.filterInputs}>
            <div className={s.search}>
              <span>🔎</span>
              <input
                type="search"
                placeholder={t('admin.warehouse.filters.search')}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            <select className={s.input} value={location} onChange={(e) => setLocation(e.target.value)}>
              <option value="all">{t('admin.warehouse.filters.allLocations')}</option>
              <option value="tashkent">{t('admin.warehouse.filters.tashkent')}</option>
              <option value="navoiy">{t('admin.warehouse.filters.navoiy')}</option>
              <option value="karshi">{t('admin.warehouse.filters.karshi')}</option>
            </select>
            <button className={`${s.btn} ${s.primary}`} type="button">
              {t('common.actions.apply')}
            </button>
          </div>
        </div>
      </section>

      <section className={s.panel}>
          <div className={s.panelHeader}>
            <span>{t('admin.warehouse.queue.boardTitle')}</span>
            <small>
              {t('admin.warehouse.queue.currentStatus', {
                status: t(STATUS_TABS.find((t) => t.key === statusFilter)?.labelKey ?? ''),
              })}
            </small>
          </div>
        <div className={s.ordersBoard}>
          {loading && <p>{t('admin.warehouse.queue.loading')}</p>}
          {error && !loading && <p style={{ color: '#b91c1c' }}>{error}</p>}
          {!loading && !error && filteredOrders.length === 0 && (
            <p>{t('admin.warehouse.queue.empty')}</p>
          )}
          {!loading &&
            !error &&
            filteredOrders.map((order) => (
              <article key={order.id} className={s.orderCard}>
                <header>
                  <div>
                    <strong>{order.order_number ?? order.id.slice(0, 8)}</strong>
                    <span>{new Date(order.created_at).toLocaleString()}</span>
                  </div>
                  <span className={`${s.badge} ${s.badgeInfo}`}>
                    {t(`admin.warehouse.status.${order.status}`, order.status)}
                  </span>
                </header>
                <div className={s.orderMeta}>
                  <span>{t('admin.warehouse.order.city')}: {order.city || '—'}</span>
                  <span>{t('admin.warehouse.order.region')}: {order.order_region || '—'}</span>
                  {order.order_comment && <p>{order.order_comment}</p>}
                </div>
                <ul className={s.orderItems}>
                  {order.items.map((item) => (
                    <li key={item.id}>
                      <div>
                        <p>{item.variant_name}</p>
                        <small>{item.variant_sku}</small>
                      </div>
                      <span className={s.qty}>×{item.quantity}</span>
                    </li>
                  ))}
                </ul>
                <footer>
                  <button
                    className={`${s.btn} ${s.primary}`}
                    type="button"
                    disabled={!nextStatus(order.status) || updatingId === order.id}
                    onClick={() => handleAdvance(order)}
                  >
                    {updatingId === order.id
                      ? t('admin.warehouse.actions.updating')
                      : order.status === 'accepted'
                      ? t('admin.warehouse.actions.startPacking')
                      : t('admin.warehouse.actions.readyToShip')}
                  </button>
                  <button className={`${s.btn} ${s.muted}`} type="button">
                    {t('admin.warehouse.actions.details')}
                  </button>
                </footer>
              </article>
            ))}
        </div>
      </section>

      {myOrders.length > 0 && (
        <section className={s.panel}>
          <div className={s.panelHeader}>
            <span>{t('admin.warehouse.myOrders.title')}</span>
            <small>{t('admin.warehouse.myOrders.subtitle')}</small>
          </div>
          <div className={s.myOrdersWrapper}>
            {myOrders.map((order) => (
              <article key={order.id} className={s.myOrderCard}>
                <header>
                  <div>
                    <strong>{order.order_number ?? order.id.slice(0, 8)}</strong>
                    <span>{new Date(order.created_at).toLocaleString()}</span>
                  </div>
                  <span className={`${s.badge} ${s.badgeInfo}`}>
                    {STATUS_LABELS[order.status] || order.status}
                  </span>
                </header>
                <div className={s.orderMeta}>
                  <span>{t('admin.warehouse.order.phone')}: {order.client_phone || '—'}</span>
                  <span>{t('admin.warehouse.order.total')}: {order.total_price?.toLocaleString() || '—'}</span>
                </div>
                <ul className={s.orderItems}>
                  {order.items.map((item) => (
                    <li key={item.id}>
                      <div>
                        <p>{item.variant_name}</p>
                        <small>{item.variant_sku}</small>
                      </div>
                      <span className={s.qty}>×{item.quantity}</span>
                    </li>
                  ))}
                </ul>
                <footer>
                  <button
                    className={`${s.btn} ${s.primary}`}
                    type="button"
                    disabled={updatingId === order.id}
                    onClick={() => handleAdvance(order)}
                  >
                    {updatingId === order.id ? t('admin.warehouse.actions.submitting') : t('admin.warehouse.actions.readyToShip')}
                  </button>
                </footer>
              </article>
            ))}
          </div>
        </section>
      )}

      {locations.length > 0 && (
        <section className={s.panel}>
          <div className={s.panelHeader}>
            <span>{t('admin.warehouse.locations.title')}</span>
            <small>{t('admin.warehouse.locations.subtitle')}</small>
          </div>
          <div className={s.locationsGrid}>
            {locations.map((loc) => (
              <article key={loc.id} className={s.locationCard}>
                <div className={s.locationCode}>{loc.code || '—'}</div>
                <p>{loc.description || t('admin.warehouse.locations.noDescription')}</p>
                <strong>
                  {loc.total_stock?.toLocaleString() ?? '—'} {t('admin.warehouse.locations.units')}
                </strong>
              </article>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}



