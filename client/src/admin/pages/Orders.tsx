import React, { useEffect, useMemo, useState } from 'react';
// @ts-ignore
import s from '../AdminLayout.module.scss';
import { adminStore } from '../storage';
import { shopAPI } from '../../services/api';
import apiClient from '../../services/api';

type Order = { id: string; customer: string; total: number; status: 'pending'|'paid'|'shipped'|'cancelled'; order_number?: string; created_at?: string };

export default function Orders() {
  const [items, setItems] = useState<Order[]>(adminStore.load<Order[]>('admin_orders', []));
  const [q, setQ] = useState('');
  const [status, setStatus] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [serverNow, setServerNow] = useState<Date | null>(null);

  const filtered = useMemo(()=> items.filter(o =>
    (q ? (o.id.includes(q) || o.customer.toLowerCase().includes(q.toLowerCase()) || (o.order_number||'').includes(q)) : true)
    && (status ? o.status === status : true)
  ), [items, q, status]);

  useEffect(()=>{ adminStore.save('admin_orders', items); }, [items]);

  useEffect(()=>{
    let ignore = false;
    const fetchOrders = async ()=>{
      try {
        setLoading(true);
        const res = await shopAPI.getAllOrders();
        if (ignore) return;
        const data = Array.isArray(res.data) ? res.data : (res.data?.results || []);
        const normalized: Order[] = data.map((o:any)=> ({
          id: o.order_id || o.id,
          customer: o.order_comment || `${o.buyer_firstname||''} ${o.buyer_lastname||''}`.trim() || 'Guest',
          total: o.total_price || 0,
          status: o.status || 'pending',
          order_number: o.order_number || o.number || o.code || '',
          created_at: o.created_at || o.created || o.order_date || o.date || o.createdAt || null,
        }));
        setItems(normalized);
      } catch (e) {
        // keep local
      } finally { setLoading(false); }
    };
    fetchOrders();
    return ()=>{ ignore = true; };
  }, []);

  useEffect(()=>{
    let ignore = false;
    const loadServerTime = async ()=>{
      try {
        const res = await apiClient.get('/course/time/now');
        if (ignore) return;
        const payload = res?.data;
        const iso = typeof payload === 'string' ? payload : (payload?.now || payload?.data || payload?.time);
        if (iso) setServerNow(new Date(iso));
      } catch {
        // ignore
      }
    };
    loadServerTime();
    const t = setInterval(loadServerTime, 60000);
    return ()=>{ ignore = true; clearInterval(t); };
  }, []);

  const formatDateTime = (iso?: string) => {
    if (!iso) return '—';
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleString('ru-RU', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
  };

  const timeColor = (iso?: string) => {
    if (!iso || !serverNow) return '#475569';
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '#475569';
    const diffMin = Math.abs((serverNow.getTime() - d.getTime()) / 60000);
    if (diffMin <= 10) return '#16a34a';
    if (diffMin <= 20) return '#f59e0b';
    if (diffMin > 20) return '#dc2626';
    return '#475569';
  };

  return (
    <div className={s.panel}>
      <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12}}>
        <div style={{fontWeight:700}}>Orders</div>
        <div style={{display:'flex', gap:8}}>
          <input className={s.input} placeholder="Search by ID/Order #/Customer" value={q} onChange={(e)=>setQ(e.target.value)} />
          <select className={s.input} value={status} onChange={(e)=>setStatus(e.target.value)}>
            <option value="">All statuses</option>
            <option value="pending">Pending</option>
            <option value="paid">Paid</option>
            <option value="shipped">Shipped</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      </div>
      {loading && <div style={{fontSize:12, color:'#64748b', marginBottom:8}}>Loading…</div>}
      <table className={s.table}>
        <thead>
          <tr><th>Order #</th><th>Customer</th><th>Total</th><th>Status</th><th>Time</th></tr>
        </thead>
        <tbody>
          {filtered.map(o => (
            <tr key={o.id}>
              <td>
                <div style={{display:'inline-flex', alignItems:'center', gap:8}}>
                  <span style={{fontWeight:700}}>{o.order_number || '—'}</span>
                  <button
                    className={`${s.btn} ${s.muted}`}
                    title="Скопировать ID"
                    onClick={async ()=>{
                      try {
                        await navigator.clipboard.writeText(o.id);
                        setCopiedId(o.id);
                        setTimeout(()=> setCopiedId(null), 1500);
                      } catch {}
                    }}
                    style={{height:28, padding:'0 8px'}}
                    aria-label="Скопировать ID"
                  >
                    {copiedId === o.id ? 'Скопировано' : 'ID'}
                  </button>
                </div>
              </td>
              <td>{o.customer}</td>
              <td>{o.total.toLocaleString()}</td>
              <td>
                {o.status === 'pending' && <span className={`${s.badge} ${s.badgePending}`}>Pending</span>}
                {o.status === 'paid' && <span className={`${s.badge} ${s.badgePaid}`}>Paid</span>}
                {o.status === 'shipped' && <span className={`${s.badge} ${s.badgeShipped}`}>Shipped</span>}
                {o.status === 'cancelled' && <span className={`${s.badge} ${s.badgeCancelled}`}>Cancelled</span>}
              </td>
              <td style={{textAlign:'right', color: timeColor(o.created_at), fontVariantNumeric: 'tabular-nums'}}>{formatDateTime(o.created_at)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

