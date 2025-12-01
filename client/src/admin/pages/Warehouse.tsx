import { useEffect, useMemo, useState } from 'react';
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

const STATUS_TABS: Array<{ key: WarehouseStatus; label: string }> = [
  { key: 'all', label: 'Все' },
  { key: 'accepted', label: 'Ожидают' },
  { key: 'packing', label: 'Сборка' },
  { key: 'ready_to_ship', label: 'К отгрузке' },
];

const STATUS_LABELS: Record<string, string> = {
  accepted: 'Ожидает',
  packing: 'Сборка',
  ready_to_ship: 'К отгрузке',
  shipped: 'Отправлен',
};

export default function Warehouse() {
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
      { label: 'SKU', value: 128, accent: '#e0e7ff' },
      { label: 'Всего остатков', value: 4521, accent: '#dcfce7' },
      { label: 'Товаров < min', value: 14, accent: '#fee2e2' },
      { label: 'Зарезервировано', value: 236, accent: '#fff7ed' },
    ],
    []
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
          setError('Не удалось загрузить данные склада');
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
      setError('Не удалось обновить статус заказа');
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className={s.dashboard}>
      <section className={s.hero}>
        <div>
          <p className={s.heroEyebrow}>Склад</p>
          <h1>Управление запасами</h1>
          <p>Контролируйте остатки, движения и дефицит по всем локациям.</p>
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
          <span>Заказы для комплектации</span>
          <small>Обновлено 5 минут назад</small>
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
                {item.label}
              </button>
            ))}
          </div>
          <div className={s.filterInputs}>
            <div className={s.search}>
              <span>🔎</span>
              <input
                type="search"
                placeholder="Поиск заказа или SKU"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            <select className={s.input} value={location} onChange={(e) => setLocation(e.target.value)}>
              <option value="all">Все локации</option>
              <option value="tashkent">Ташкент</option>
              <option value="navoiy">Навои</option>
              <option value="karshi">Карши</option>
            </select>
            <button className={`${s.btn} ${s.primary}`} type="button">
              Применить
            </button>
          </div>
        </div>
      </section>

      <section className={s.panel}>
        <div className={s.panelHeader}>
          <span>Очередь заказов</span>
          <small>
            Статус: {STATUS_TABS.find((t) => t.key === statusFilter)?.label}
          </small>
        </div>
        <div className={s.ordersBoard}>
          {loading && <p>Загружаем заказы...</p>}
          {error && !loading && <p style={{ color: '#b91c1c' }}>{error}</p>}
          {!loading && !error && filteredOrders.length === 0 && (
            <p>Заказы по текущим фильтрам не найдены.</p>
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
                    {STATUS_LABELS[order.status] || order.status}
                  </span>
                </header>
                <div className={s.orderMeta}>
                  <span>Город: {order.city || '—'}</span>
                  <span>Регион: {order.order_region || '—'}</span>
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
                      ? 'Обновляем...'
                      : order.status === 'accepted'
                      ? 'Начать сборку'
                      : 'Готов к отгрузке'}
                  </button>
                  <button className={`${s.btn} ${s.muted}`} type="button">
                    Детали
                  </button>
                </footer>
              </article>
            ))}
        </div>
      </section>

      {myOrders.length > 0 && (
        <section className={s.panel}>
          <div className={s.panelHeader}>
            <span>Мои сборки</span>
            <small>Заказы, над которыми вы работаете</small>
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
                  <span>Телефон: {order.client_phone || '—'}</span>
                  <span>Сумма: {order.total_price?.toLocaleString() || '—'}</span>
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
                    {updatingId === order.id ? 'Отправляем...' : 'Готово к отгрузке'}
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
            <span>Локации склада</span>
            <small>Ячейки и остатки</small>
          </div>
          <div className={s.locationsGrid}>
            {locations.map((loc) => (
              <article key={loc.id} className={s.locationCard}>
                <div className={s.locationCode}>{loc.code || '—'}</div>
                <p>{loc.description || 'Без описания'}</p>
                <strong>{loc.total_stock?.toLocaleString() ?? '—'} шт.</strong>
              </article>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}



