import React, { useEffect, useMemo, useState } from 'react';
// @ts-ignore
import s from '../AdminLayout.module.scss';
import { adminStore } from '../storage';
import { shopAPI, userAPI } from '../../services/api';
import apiClient from '../../services/api';
import { useAuth } from '../../hooks/useAuth';

type OrderStatus =
  | 'pending'
  | 'accepted'
  | 'packing'
  | 'packed'
  | 'processing'
  | 'shipped'
  | 'delivered'
  | 'cancelled'
  | 'refunded'
  | 'paid'; // legacy support

type Order = { id: string; customer: string; total: number; status: OrderStatus; order_number?: string; created_at?: string; location?: string };

export default function Orders() {
  const { profile } = useAuth() as any;
  const roleRaw = String(profile?.role || profile?.user_role || profile?.data?.role || '').toLowerCase();
  const [roleState, setRoleState] = useState<string>(roleRaw || '');
  const normalizedRole = (roleState === 'sale_operator') ? 'sale' : roleState;
  const isSale = normalizedRole === 'sale';
  const [items, setItems] = useState<Order[]>(adminStore.load<Order[]>('admin_orders', []));
  const [q, setQ] = useState('');
  const [debouncedQ, setDebouncedQ] = useState('');
  const [status, setStatus] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [serverNow, setServerNow] = useState<Date | null>(null);
  const [ccOrders, setCcOrders] = useState<any[]>([]);
  const [ccLoading, setCcLoading] = useState(false);
  const [notice, setNotice] = useState<{ type: 'success'|'error'; message: string } | null>(null);
  const [ccComments, setCcComments] = useState<Record<string,string>>({});
  const [ccSchedule, setCcSchedule] = useState<Record<string,string>>({});
  const [ccTick, setCcTick] = useState<number>(0);
  const [ordersPage, setOrdersPage] = useState(1);
  const [ordersLimit, setOrdersLimit] = useState(20);
  const [ccPage, setCcPage] = useState(1);
  const [ccLimit, setCcLimit] = useState(20);
  const [ccStatus, setCcStatus] = useState<string>('');

  useEffect(()=>{
    const id = setInterval(()=> setCcTick(t=>t+1), 1000);
    return ()=> clearInterval(id);
  }, []);

  const getScheduleTarget = (o: any): Date | null => {
    const local = ccSchedule[o.id];
    if (local) {
      const d = new Date(local);
      return isNaN(d.getTime()) ? null : d;
    }
    const raw = String(o?.order_comment || "");
    const m = raw.match(/\[reja_at:([^\]]+)\]/i);
    if (m && m[1]) {
      const d = new Date(m[1]);
      return isNaN(d.getTime()) ? null : d;
    }
    return null;
  };

  const formatRemaining = (ms: number): string => {
    const total = Math.max(0, Math.floor(ms / 1000));
    const h = Math.floor(total / 3600).toString().padStart(2, '0');
    const m = Math.floor((total % 3600) / 60).toString().padStart(2, '0');
    const s = Math.floor(total % 60).toString().padStart(2, '0');
    return `${h}:${m}:${s}`;
  };

  const renderCcStatus = (status?: string) => {
    const st = String(status || '').toLowerCase();
    if (st === 'pending') return <span className={`${s.badge} ${s.badgePending}`}>В ожидании</span>;
    if (st === 'accepted') return <span className={`${s.badge} ${s.badgeAccepted}`}>Принят</span>;
    if (st === 'packing') return <span className={`${s.badge} ${s.badgePacking}`}>Упаковывается</span>;
    if (st === 'packed') return <span className={`${s.badge} ${s.badgePacked}`}>Упакован</span>;
    if (st === 'processing') return <span className={`${s.badge} ${s.badgeProcessing}`}>В обработке</span>;
    if (st === 'shipped') return <span className={`${s.badge} ${s.badgeShipped}`}>Отправлен</span>;
    if (st === 'delivered') return <span className={`${s.badge} ${s.badgeDelivered}`}>Доставлен</span>;
    if (st === 'cancelled') return <span className={`${s.badge} ${s.badgeCancelled}`}>Отменён</span>;
    if (st === 'refunded') return <span className={`${s.badge} ${s.badgeRefunded}`}>Возврат</span>;
    if (st === 'paid') return <span className={`${s.badge} ${s.badgePaid}`}>Оплачен</span>;
    return <span className={s.badge}>{st || '—'}</span>;
  };

  // City/Region options
  const LOCATION_OPTIONS: Array<{ value: string; label: string }> = [
    { value: 'tashkent', label: 'Ташкент' },
    { value: 'tashkent_region', label: 'Ташкентская область' },
    { value: 'samarkand', label: 'Самарканд' },
    { value: 'bukhara', label: 'Бухара' },
    { value: 'andijan', label: 'Андижан' },
    { value: 'fergana', label: 'Фергана' },
    { value: 'namangan', label: 'Наманган' },
    { value: 'navoiy', label: 'Навои' },
    { value: 'kashkadarya', label: 'Кашкадарья' },
    { value: 'surkhandarya', label: 'Сурхандарья' },
    { value: 'sirdarya', label: 'Сырдарья' },
    { value: 'jizzakh', label: 'Джизак' },
    { value: 'khorezm', label: 'Хорезм' },
    { value: 'karakalpakstan', label: 'Каракалпакстан' },
  ];

  const normalizeOrders = (data: any[]): Order[] => data.map((o:any)=> {
    const first = (o.buyer_firstname ?? '').trim();
    const last = (o.buyer_lastname ?? '').trim();
    const full = (o.full_name ?? '').trim();
    const byNames = (first || last) ? `${first} ${last}`.trim() : '';
    const customer = byNames || full || (o.order_comment || '').trim() || 'Guest';
    const userLoc = (o.user_location ?? '').trim();
    const cityApi = (o.city ?? '').trim();
    const location = userLoc || cityApi || '';
    return {
      id: o.order_id || o.id,
      customer,
      total: o.total_price || 0,
      status: o.status || 'pending',
      order_number: o.order_number || o.number || o.code || '',
      created_at: o.created_at || o.created || o.order_date || o.date || o.createdAt || null,
      location,
    };
  });

  const filtered = useMemo(()=> items.filter(o =>
    (debouncedQ ? (o.id.includes(debouncedQ) || o.customer.toLowerCase().includes(debouncedQ.toLowerCase()) || (o.order_number||'').includes(debouncedQ)) : true)
    && (status ? o.status === status : true)
  ), [items, debouncedQ, status]);

  const pagedOrders = useMemo(()=>{
    const start = (ordersPage - 1) * ordersLimit;
    return filtered.slice(start, start + ordersLimit);
  }, [filtered, ordersPage, ordersLimit]);

  const filteredCc = useMemo(()=>{
    const list = ccOrders || [];
    if (!ccStatus) return list;
    const st = ccStatus.toLowerCase();
    return list.filter((o:any)=> String(o?.status||'').toLowerCase() === st);
  }, [ccOrders, ccStatus]);

  useEffect(()=>{ adminStore.save('admin_orders', items); }, [items]);

  // debounce search input for large datasets
  useEffect(()=>{
    const id = setTimeout(()=> setDebouncedQ(q), 400);
    return ()=> clearTimeout(id);
  }, [q]);

  // Resolve role from API if missing in profile (try user-info, then users/{id})
  useEffect(()=>{
    let ignore = false;
    const load = async ()=>{
      if (roleState) return; // already known
      const uid = profile?.id || profile?.user_id || profile?.data?.id;
      if (!uid) return;
      try {
        const info = await userAPI.getUsersInfo();
        const roleFromInfo = String(info?.data?.role || '').toLowerCase();
        if (!ignore && roleFromInfo) {
          setRoleState(roleFromInfo);
          return;
        }
        const res = await userAPI.getUserById(String(uid));
        const apiRole = String(res?.data?.role || '').toLowerCase();
        if (!ignore) setRoleState(apiRole);
      } catch {
        if (!ignore) setRoleState('');
      }
    };
    load();
    return ()=>{ ignore = true; };
  }, [profile, roleState]);

  useEffect(()=>{
    let ignore = false;
    const fetchOrders = async ()=>{
      try {
        setLoading(true);
        const res = await shopAPI.getAllOrders();
        if (ignore) return;
        const data = Array.isArray(res.data) ? res.data : (res.data?.results || []);
        const normalized: Order[] = normalizeOrders(data);
        setItems(normalized);
      } catch (e) {
        // keep local
      } finally { setLoading(false); }
    };
    fetchOrders();
    return ()=>{ ignore = true; };
  }, []);

  // Load call-center orders for sale
  useEffect(()=>{
    if (!isSale) return;
    let ignore = false;
    const loadCc = async ()=>{
      try {
        setCcLoading(true);
        const res = await shopAPI.getCallCenterOrders();
        const data = Array.isArray(res.data) ? res.data : (res.data?.results || res.data?.data || []);
        if (!ignore) {
          setCcOrders(data);
          // Prefill comments from API if not yet set
          setCcComments((prev)=>{
            const next = { ...prev } as Record<string,string>;
            (data || []).forEach((o:any)=>{
              const id = o?.id;
              const apiComment = (o?.order_comment ?? '') as string;
              if (id && (next[id] === undefined) && apiComment) {
                next[id] = apiComment;
              }
            });
            return next;
          });
        }
      } catch (_) {
        if (!ignore) setCcOrders([]);
      } finally {
        if (!ignore) setCcLoading(false);
      }
    };
    loadCc();
    return ()=>{ ignore = true; };
  }, [isSale]);

  useEffect(()=>{
    let ignore = false;
    const tick = async ()=>{
      try {
        const res = await shopAPI.getAllOrders();
        if (ignore) return;
        const data = Array.isArray(res.data) ? res.data : (res.data?.results || []);
        const normalized: Order[] = normalizeOrders(data);
        setItems(normalized);
      } catch {}
    };
    const id = setInterval(tick, 10000);
    return ()=>{ ignore = true; clearInterval(id); };
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
      {/* Page header with modern styling */}
      <div style={{
        display:'flex', alignItems:'center', justifyContent:'space-between',
        padding:'12px 14px', marginBottom:12, borderRadius:12,
        background:'linear-gradient(135deg, #eef2ff 0%, #faf5ff 100%)',
        border:'1px solid #e9d5ff'
      }}>
        <div>
          <div style={{fontWeight:900, fontSize:18, color:'#312e81'}}>Buyurtmalar boshqaruvi</div>
          <div style={{fontSize:12, color:'#6b7280', marginTop:4}}>Yangi buyurtmalarni ko'rish va call-center uchun tanlash</div>
        </div>
        {isSale && (
          <span style={{
            padding:'6px 10px', borderRadius:999, fontSize:12, fontWeight:800,
            background:'#ecfeff', color:'#155e75', border:'1px solid #a5f3fc'
          }}>SALE</span>
        )}
      </div>
      <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12, gap:12, flexWrap:'wrap'}}>
        <div style={{fontWeight:700}}>Orders</div>
        <div style={{display:'flex', gap:8, flexWrap:'wrap', alignItems:'center'}}>
          <select className={s.input} value={status} onChange={(e)=>setStatus(e.target.value)} style={{height:32, borderRadius:10}}>
            <option value="">Все статусы</option>
            <option value="pending">В ожидании</option>
            <option value="accepted">Принят</option>
            <option value="packing">Упаковывается</option>
            <option value="packed">Упакован</option>
            <option value="processing">В обработке</option>
            <option value="shipped">Отправлен</option>
            <option value="delivered">Доставлен</option>
            <option value="cancelled">Отменён</option>
            <option value="refunded">Возврат средств</option>
            <option value="paid">Оплачен</option>
          </select>
          <input className={s.input} placeholder="Search by ID/Order #/Customer" value={q} onChange={(e)=>setQ(e.target.value)} style={{minWidth:240}} />
        </div>
      </div>
      {notice && (
        <div style={{
          marginBottom: 12,
          padding: '10px 12px',
          borderRadius: 12,
          border: notice.type==='success' ? '1px solid #86efac' : '1px solid #fecaca',
          background: notice.type==='success' ? '#ecfdf5' : '#fef2f2',
          color: notice.type==='success' ? '#065f46' : '#7f1d1d',
          fontWeight: 600
        }}>{notice.message}</div>
      )}
      {loading && <div style={{fontSize:12, color:'#64748b', marginBottom:8}}>Loading…</div>}
      <div style={{overflowX:'auto'}}>
      <table className={s.table}>
        <thead>
          <tr style={{background:'#f8fafc', position:'sticky', top:0, zIndex:1}}><th>Order #</th><th>Customer</th><th>Total</th><th>Status</th><th>City</th><th>Time</th><th>Action</th></tr>
        </thead>
        <tbody>
          {loading && Array.from({length: Math.min(ordersLimit, 10)}).map((_, i)=> (
            <tr key={`sk-${i}`}>
              <td colSpan={7}>
                <div style={{display:'grid', gridTemplateColumns:'160px 1fr 80px 120px 140px 160px 140px', gap:12}}>
                  {Array.from({length:7}).map((__, j)=> (
                    <div key={j} style={{height:16, background:'#e5e7eb', borderRadius:8}} />
                  ))}
                </div>
              </td>
            </tr>
          ))}
          {!loading && pagedOrders.map(o => (
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
                {o.status === 'pending' && <span className={`${s.badge} ${s.badgePending}`}>В ожидании</span>}
                {o.status === 'accepted' && <span className={`${s.badge} ${s.badgeAccepted}`}>Принят</span>}
                {o.status === 'packing' && <span className={`${s.badge} ${s.badgePacking}`}>Упаковывается</span>}
                {o.status === 'packed' && <span className={`${s.badge} ${s.badgePacked}`}>Упакован</span>}
                {o.status === 'processing' && <span className={`${s.badge} ${s.badgeProcessing}`}>В обработке</span>}
                {o.status === 'shipped' && <span className={`${s.badge} ${s.badgeShipped}`}>Отправлен</span>}
                {o.status === 'delivered' && <span className={`${s.badge} ${s.badgeDelivered}`}>Доставлен</span>}
                {o.status === 'cancelled' && <span className={`${s.badge} ${s.badgeCancelled}`}>Отменён</span>}
                {o.status === 'refunded' && <span className={`${s.badge} ${s.badgeRefunded}`}>Возврат средств</span>}
                {o.status === 'paid' && <span className={`${s.badge} ${s.badgePaid}`}>Оплачен</span>}
              </td>
              <td>{o.location || '-'}</td>
              <td style={{textAlign:'center', color: timeColor(o.created_at), fontVariantNumeric: 'tabular-nums'}}>
                {formatDateTime(o.created_at)}
              </td>
              <td style={{textAlign:'center'}}>
                {isSale && (o.status === 'pending' || !o.status) && (
                  <button
                    className={`${s.btn}`}
                    style={{
                      height:28, padding:'0 12px', borderRadius:10,
                      background:'linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)',
                      color:'#fff', border:'none', boxShadow:'0 4px 14px rgba(37,99,235,0.25)',
                      display:'inline-flex', alignItems:'center', gap:6, fontWeight:700
                    }}
                    onClick={async ()=>{
                      try {
                        await shopAPI.takeOrderCallCenter(o.id);
                        setNotice({ type:'success', message: 'Buyurtma tanlandi (call-center).'});
                        setTimeout(()=> setNotice(null), 2000);
                      } catch (e:any) {
                        const msg = e?.response?.data?.detail || e?.message || 'Xatolik yuz berdi';
                        setNotice({ type:'error', message: msg });
                        setTimeout(()=> setNotice(null), 3000);
                      }
                    }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.79 19.79 0 0 1 2.08 4.18 2 2 0 0 1 4.06 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    Tanlash
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>
      {!loading && (
        <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginTop:8}}>
          <div style={{fontSize:12, color:'#64748b'}}>Page {ordersPage} of {Math.max(1, Math.ceil(filtered.length / ordersLimit))}</div>
          <div style={{display:'flex', gap:8, alignItems:'center'}}>
            <select className={s.input} value={ordersLimit} onChange={(e)=>{ setOrdersPage(1); setOrdersLimit(Number(e.target.value)||20); }}>
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
            <div className={s.actions}>
              <button className={`${s.btn} ${s.muted}`} disabled={ordersPage<=1} onClick={()=>setOrdersPage(p=>Math.max(1,p-1))}>Prev</button>
              <button className={`${s.btn} ${s.muted}`} disabled={ordersPage>=Math.ceil(filtered.length/ordersLimit)} onClick={()=>setOrdersPage(p=>Math.min(Math.ceil(filtered.length/ordersLimit)||1,p+1))}>Next</button>
            </div>
          </div>
        </div>
      )}

      {isSale && (
        <div style={{marginTop:16}}>
          <div style={{
            display:'flex', alignItems:'center', justifyContent:'space-between',
            marginBottom:8
          }}>
            <div style={{fontWeight:900}}>Mening buyurtmalarim (Call-center)</div>
            <div style={{display:'flex', gap:8, alignItems:'center'}}>
              <select
                className={s.input}
                value={ccStatus}
                onChange={(e)=>{ setCcPage(1); setCcStatus(e.target.value); }}
                style={{height:32, borderRadius:10}}
              >
                <option value="">Barcha statuslar</option>
                <option value="pending">В ожидании</option>
                <option value="accepted">Принят</option>
                <option value="packing">Упаковывается</option>
                <option value="packed">Упакован</option>
                <option value="processing">В обработке</option>
                <option value="shipped">Отправлен</option>
                <option value="delivered">Доставлен</option>
                <option value="cancelled">Отменён</option>
                <option value="refunded">Возврат</option>
                <option value="paid">Оплачен</option>
              </select>
            </div>
          </div>
          {ccLoading && <div style={{fontSize:12, color:'#64748b', marginBottom:8}}>Loading…</div>}
          <div style={{overflowX:'auto'}}>
          <table className={s.table}>
            <thead>
              <tr style={{background:'#f8fafc', position:'sticky', top:0, zIndex:1}}>
                <th>Order #</th>
                <th>Full name</th>
                <th>Phone</th>
                <th>City</th>
                <th>Region</th>
                <th>Total</th>
                <th>Status</th>
                <th>Time</th>
                <th>Комментарий</th>
                <th>Reja (datetime)</th>
                <th>Amallar</th>
              </tr>
            </thead>
            <tbody>
              {ccLoading && Array.from({length: Math.min(ccLimit, 8)}).map((_, i)=> (
                <tr key={`cc-sk-${i}`}>
                  <td colSpan={11}>
                    <div style={{display:'grid', gridTemplateColumns:'140px 200px 160px 160px 160px 100px 120px 140px 200px 220px 320px', gap:12}}>
                      {Array.from({length:11}).map((__, j)=> (
                        <div key={j} style={{height:16, background:'#e5e7eb', borderRadius:8}} />
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
              {!ccLoading && (filteredCc || []).slice((ccPage-1)*ccLimit, (ccPage-1)*ccLimit + ccLimit).map((o:any)=> (
                <tr key={o.id}>
                  <td>{o.order_number || '—'}</td>
                  <td>{o.full_name || '—'}</td>
                  <td>{o.client_phone || '—'}</td>
                  <td>
                    <select
                      className={s.input}
                      value={(o.city || '').toLowerCase()}
                      onChange={(e)=> setCcOrders(prev => prev.map(x => x.id===o.id ? { ...x, city: e.target.value } : x))}
                      style={{height:32, borderRadius:10}}
                    >
                      <option value="">—</option>
                      {LOCATION_OPTIONS.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <input
                      className={s.input}
                      placeholder="Region"
                      value={o.order_region || ''}
                      onChange={(e)=> setCcOrders(prev => prev.map(x => x.id===o.id ? { ...x, order_region: e.target.value } : x))}
                      style={{height:32, borderRadius:10, padding:'0 10px', border:'1px solid #e5e7eb', background:'#fff'}}
                    />
                  </td>
                  <td>{Number(o.total_price||0).toLocaleString()}</td>
                  <td>{renderCcStatus(o.status)}</td>
                  <td>{o.created_at ? new Date(o.created_at).toLocaleString() : '—'}</td>
                  <td>
                    <input
                      className={s.input}
                      placeholder="Комментарий"
                      value={ccComments[o.id] ?? (o.order_comment || '')}
                      onChange={(e)=> setCcComments(prev=> ({...prev, [o.id]: e.target.value}))}
                      style={{height:32, borderRadius:10}}
                    />
                  </td>
                  <td>
                    <input
                      className={s.input}
                      type="datetime-local"
                      value={ccSchedule[o.id] || ''}
                      onChange={(e)=> setCcSchedule(prev=> ({...prev, [o.id]: e.target.value}))}
                      style={{height:32, borderRadius:10}}
                    />
                    {(() => {
                      const target = getScheduleTarget(o);
                      if (!target) return null;
                      const nowTs = Date.now();
                      const diff = target.getTime() - nowTs;
                      const overdue = diff <= 0;
                      const color = overdue ? '#dc2626' : (diff <= 5*60*1000 ? '#f59e0b' : '#16a34a');
                      return (
                        <span style={{
                          display:'inline-block', marginLeft:8, padding:'2px 8px',
                          borderRadius:999, fontSize:12, fontWeight:800,
                          background:'#f8fafc', border:'1px solid #e5e7eb', color
                        }} title={target.toLocaleString()}>
                          ⏳ {formatRemaining(diff)}
                        </span>
                      );
                    })()}
                  </td>
                  <td>
                    <div style={{display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap:8, minWidth:320}}>
                      <button
                        className={s.btn}
                        style={{
                          height:36, borderRadius:12,
                          background:'linear-gradient(135deg,#16a34a,#22c55e)', color:'#fff', fontWeight:800
                        }}
                        onClick={async ()=>{
                          try {
                            const payload = {
                              city: (o.city||'') || undefined,
                              region: (o.order_region||'') || undefined,
                              order_comment: (ccComments[o.id] || '').trim() || undefined,
                              status: 'accepted',
                            };
                            await shopAPI.updateOrderLocation(o.id, payload);
                            setNotice({ type:'success', message:'Qabul qilindi (accepted)'});
                            setCcOrders(prev => prev.map(x => x.id===o.id ? { ...x, status:'accepted' } : x));
                            setTimeout(()=> setNotice(null), 2000);
                          } catch(e:any) {
                            const msg = e?.response?.data?.detail || e?.message || 'Xatolik';
                            setNotice({ type:'error', message: msg });
                            setTimeout(()=> setNotice(null), 3000);
                          }
                        }}
                      >Qabul qilish</button>
                      <button
                        className={s.btn}
                        style={{
                          height:36, borderRadius:12,
                          background:'linear-gradient(135deg,#ef4444,#f97316)', color:'#fff', fontWeight:800
                        }}
                        onClick={async ()=>{
                          try {
                            const payload = {
                              city: (o.city||'') || undefined,
                              region: (o.order_region||'') || undefined,
                              order_comment: (ccComments[o.id] || '').trim() || undefined,
                              status: 'cancelled',
                            };
                            await shopAPI.updateOrderLocation(o.id, payload);
                            setNotice({ type:'success', message:'Rad etildi (cancelled)'});
                            setCcOrders(prev => prev.map(x => x.id===o.id ? { ...x, status:'cancelled' } : x));
                            setTimeout(()=> setNotice(null), 2000);
                          } catch(e:any) {
                            const msg = e?.response?.data?.detail || e?.message || 'Xatolik';
                            setNotice({ type:'error', message: msg });
                            setTimeout(()=> setNotice(null), 3000);
                          }
                        }}
                      >Rad etish</button>
                      <button
                        className={s.btn}
                        style={{
                          height:36, borderRadius:12,
                          background:'linear-gradient(135deg,#f59e0b,#fbbf24)', color:'#fff', fontWeight:800
                        }}
                        onClick={async ()=>{
                          try {
                            const schedule = (ccSchedule[o.id] || '').trim();
                            const baseComment = (ccComments[o.id] || '').trim();
                            const iso = schedule ? new Date(schedule).toISOString() : '';
                            const human = schedule ? new Date(schedule).toLocaleString() : '';
                            const composed = schedule
                              ? `${baseComment ? baseComment + ' | ' : ''}Reja: ${human} [reja_at:${iso}]`
                              : (baseComment || undefined);
                            const payload = {
                              city: (o.city||'') || undefined,
                              region: (o.order_region||'') || undefined,
                              order_comment: composed,
                              status: 'processing',
                            };
                            await shopAPI.updateOrderLocation(o.id, payload);
                            setNotice({ type:'success', message:'Kechiktirildi (processing)'});
                            setCcOrders(prev => prev.map(x => x.id===o.id ? { ...x, status:'processing' } : x));
                            setTimeout(()=> setNotice(null), 2000);
                          } catch(e:any) {
                            const msg = e?.response?.data?.detail || e?.message || 'Xatolik';
                            setNotice({ type:'error', message: msg });
                            setTimeout(()=> setNotice(null), 3000);
                          }
                        }}
                      >Kechiktirish</button>
                    </div>
                  </td>
                </tr>
              ))}
              {(!filteredCc || filteredCc.length===0) && (
                <tr><td colSpan={11} style={{textAlign:'center', color:'#64748b'}}>Hali buyurtmalar yo'q</td></tr>
              )}
            </tbody>
          </table>
          </div>
          {!ccLoading && filteredCc && filteredCc.length>0 && (
            <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginTop:8}}>
              <div style={{fontSize:12, color:'#64748b'}}>Page {ccPage} of {Math.max(1, Math.ceil(filteredCc.length / ccLimit))}</div>
              <div style={{display:'flex', gap:8, alignItems:'center'}}>
                <select className={s.input} value={ccLimit} onChange={(e)=>{ setCcPage(1); setCcLimit(Number(e.target.value)||20); }}>
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
                <div className={s.actions}>
                  <button className={`${s.btn} ${s.muted}`} disabled={ccPage<=1} onClick={()=>setCcPage(p=>Math.max(1,p-1))}>Prev</button>
                  <button className={`${s.btn} ${s.muted}`} disabled={ccPage>=Math.ceil((filteredCc.length||0)/ccLimit)} onClick={()=>setCcPage(p=>Math.min(Math.ceil((filteredCc.length||0)/ccLimit)||1,p+1))}>Next</button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

