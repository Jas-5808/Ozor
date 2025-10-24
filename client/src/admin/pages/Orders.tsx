import React, { useEffect, useMemo, useState } from 'react';
// @ts-ignore
import s from '../AdminLayout.module.scss';
import { adminStore } from '../storage';
import { shopAPI } from '../../services/api';

type Order = { id: string; customer: string; total: number; status: 'pending'|'paid'|'shipped'|'cancelled'; city?: string };

export default function Orders() {
  const [items, setItems] = useState<Order[]>(adminStore.load<Order[]>('admin_orders', []));
  const [q, setQ] = useState('');
  const [status, setStatus] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const filtered = useMemo(()=> items.filter(o =>
    (q ? (o.id.includes(q) || o.customer.toLowerCase().includes(q.toLowerCase())) : true)
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
          city: o.city || '',
        }));
        setItems(normalized);
      } catch (e) {
        // keep local
      } finally { setLoading(false); }
    };
    fetchOrders();
    return ()=>{ ignore = true; };
  }, []);

  return (
    <div className={s.panel}>
      <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12}}>
        <div style={{fontWeight:700}}>Orders</div>
        <div style={{display:'flex', gap:8}}>
          <input className={s.input} placeholder="Search by ID/Customer" value={q} onChange={(e)=>setQ(e.target.value)} />
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
          <tr><th>ID</th><th>Customer</th><th>Total</th><th>Status</th><th>City</th></tr>
        </thead>
        <tbody>
          {filtered.map(o => (
            <tr key={o.id}>
              <td>{o.id}</td>
              <td>{o.customer}</td>
              <td>{o.total.toLocaleString()}</td>
              <td>
                {o.status === 'pending' && <span className={`${s.badge} ${s.badgePending}`}>Pending</span>}
                {o.status === 'paid' && <span className={`${s.badge} ${s.badgePaid}`}>Paid</span>}
                {o.status === 'shipped' && <span className={`${s.badge} ${s.badgeShipped}`}>Shipped</span>}
                {o.status === 'cancelled' && <span className={`${s.badge} ${s.badgeCancelled}`}>Cancelled</span>}
              </td>
              <td>{o.city || '-'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

