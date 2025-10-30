import React, { useEffect, useMemo, useState } from 'react';
// @ts-ignore
import s from '../AdminLayout.module.scss';
import { shopAPI, userAPI } from '../../services/api';

export default function Dashboard() {
  const [loading, setLoading] = useState(false);
  const [warehouseStats, setWarehouseStats] = useState(()=> ({ total: 0, low: 0, out: 0, amount: 0 }));
  const [ordersStats, setOrdersStats] = useState(()=> ({ total: 0, avg: 0, sum: 0, pending: 0 }));
  const [recent, setRecent] = useState<Array<{ id: string | number; name: string; client: string; status: string; sum: number; date: string }>>([]);

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
          const sortedRecent = [...orders].sort((a:any,b:any)=>{
            const ta = a.created_at ? new Date(a.created_at).getTime() : 0;
            const tb = b.created_at ? new Date(b.created_at).getTime() : 0;
            return tb - ta;
          }).slice(0, 5).map(o=> ({
            id: o.id,
            name: o.order_number || o.name || '—',
            client: o.customer,
            status: o.status === 'pending' ? 'Ожидает' : (o.status === 'cancelled' ? 'Отменен' : (o.status === 'delivered' ? 'Доставлен' : 'Подтвержден')),
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
      'Ожидает': `${s.badge} ${s.badgeInfo}`,
      'Отменен': `${s.badge} ${s.badgeCancelled}`,
      'Доставлен': `${s.badge} ${s.badgePaid}`,
      'Подтвержден': `${s.badge} ${s.badgeActive}`,
      'Сборка': `${s.badge} ${s.badgePending}`,
    };
    return map[status] || s.badge;
  };

  return (
    <div>
      {/* Верхние карточки управления */}
      <div className={s.cardGrid} style={{marginBottom:12}}>
        <div className={s.kpi}>
          <div style={{display:'flex', alignItems:'center', gap:10}}>
            <div style={{width:32, height:32, borderRadius:10, background:'#e0e7ff', display:'grid', placeItems:'center'}}>📦</div>
            <div style={{fontWeight:700}}>Управление складом</div>
          </div>
          <div style={{opacity:.65, fontSize:12, marginTop:6}}>Товары, остатки, движения</div>
        </div>
        <div className={s.kpi}>
          <div style={{display:'flex', alignItems:'center', gap:10}}>
            <div style={{width:32, height:32, borderRadius:10, background:'#dcfce7', display:'grid', placeItems:'center'}}>📑</div>
            <div style={{fontWeight:700}}>Управление заказами</div>
          </div>
          <div style={{opacity:.65, fontSize:12, marginTop:6}}>Заказы, статусы, клиенты</div>
        </div>
        <div className={s.kpi}>
          <div style={{display:'flex', alignItems:'center', gap:10}}>
            <div style={{width:32, height:32, borderRadius:10, background:'#fee2e2', display:'grid', placeItems:'center'}}>🛒</div>
            <div style={{fontWeight:700}}>Управление товарами</div>
          </div>
          <div style={{opacity:.65, fontSize:12, marginTop:6}}>Каталог, категории, цены</div>
        </div>
        <div className={s.kpi}>
          <div style={{display:'flex', alignItems:'center', gap:10}}>
            <div style={{width:32, height:32, borderRadius:10, background:'#fff7ed', display:'grid', placeItems:'center'}}>🏷️</div>
            <div style={{fontWeight:700}}>Управление категориями</div>
          </div>
          <div style={{opacity:.65, fontSize:12, marginTop:6}}>Создание и редактирование</div>
        </div>
      </div>

      {/* Блоки статистики */}
      <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:12}}>
        <div className={s.panel}>
          <div style={{fontWeight:700, marginBottom:8}}>Статистика склада</div>
          <div style={{display:'grid', gridTemplateColumns:'repeat(4,1fr)', textAlign:'center'}}>
            <div>
              <div style={{color:'#2563eb', fontSize:18, fontWeight:800}}>{warehouseStats.total}</div>
              <div style={{opacity:.7, fontSize:12}}>Всего товаров</div>
            </div>
            <div>
              <div style={{color:'#059669', fontSize:18, fontWeight:800}}>{warehouseStats.amount.toLocaleString()} so`m</div>
              <div style={{opacity:.7, fontSize:12}}>Общая стоимость</div>
            </div>
            <div>
              <div style={{color:'#d97706', fontSize:18, fontWeight:800}}>{warehouseStats.low}</div>
              <div style={{opacity:.7, fontSize:12}}>Низкий остаток</div>
            </div>
            <div>
              <div style={{color:'#ef4444', fontSize:18, fontWeight:800}}>{warehouseStats.out}</div>
              <div style={{opacity:.7, fontSize:12}}>Нет в наличии</div>
            </div>
          </div>
        </div>
        <div className={s.panel}>
          <div style={{fontWeight:700, marginBottom:8}}>Статистика заказов</div>
          <div style={{display:'grid', gridTemplateColumns:'repeat(3,1fr) 1fr', textAlign:'center'}}>
            <div>
              <div style={{color:'#2563eb', fontSize:18, fontWeight:800}}>{ordersStats.total}</div>
              <div style={{opacity:.7, fontSize:12}}>Всего заказов</div>
            </div>
            <div>
              <div style={{color:'#059669', fontSize:18, fontWeight:800}}>{ordersStats.avg.toLocaleString()} so`m</div>
              <div style={{opacity:.7, fontSize:12}}>Средний чек</div>
            </div>
            <div>
              <div style={{color:'#16a34a', fontSize:18, fontWeight:800}}>{ordersStats.sum.toLocaleString()} so`m</div>
              <div style={{opacity:.7, fontSize:12}}>Общая сумма</div>
            </div>
            <div>
              <div style={{color:'#ef4444', fontSize:18, fontWeight:800}}>{ordersStats.pending}</div>
              <div style={{opacity:.7, fontSize:12}}>Ожидают</div>
            </div>
          </div>
        </div>
      </div>

      {/* Последние заказы */}
      <div className={s.panel}>
        <div style={{fontWeight:700, marginBottom:8}}>Последние заказы</div>
        <table className={s.table}>
          <thead>
            <tr>
              <th>ЗАКАЗ</th>
              <th>КЛИЕНТ</th>
              <th>СТАТУС</th>
              <th>СУММА</th>
              <th>ДАТА</th>
            </tr>
          </thead>
          <tbody>
            {recent.map(r=> (
              <tr key={r.id}>
                <td>#{r.id}<div style={{opacity:.65, fontSize:12}}>{r.name}</div></td>
                <td>{r.client}</td>
                <td><span className={badge(r.status)}>{r.status}</span></td>
                <td>{r.sum.toLocaleString()} so`m</td>
                <td>{r.date}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

