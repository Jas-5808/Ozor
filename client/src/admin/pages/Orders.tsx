import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
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

const LOCATION_OPTIONS: Array<{ value: string; labelKey: string }> = [
  { value: 'tashkent', labelKey: 'profileUpdate.regions.tashkent' },
  { value: 'tashkent_region', labelKey: 'profileUpdate.regions.tashkentRegion' },
  { value: 'samarkand', labelKey: 'profileUpdate.regions.samarkand' },
  { value: 'bukhara', labelKey: 'profileUpdate.regions.bukhara' },
  { value: 'andijan', labelKey: 'profileUpdate.regions.andijan' },
  { value: 'fergana', labelKey: 'profileUpdate.regions.fergana' },
  { value: 'namangan', labelKey: 'profileUpdate.regions.namangan' },
  { value: 'navoiy', labelKey: 'profileUpdate.regions.navoiy' },
  { value: 'kashkadarya', labelKey: 'profileUpdate.regions.kashkadarya' },
  { value: 'surkhandarya', labelKey: 'profileUpdate.regions.surkhandarya' },
  { value: 'sirdarya', labelKey: 'profileUpdate.regions.sirdarya' },
  { value: 'jizzakh', labelKey: 'profileUpdate.regions.jizzakh' },
  { value: 'khorezm', labelKey: 'profileUpdate.regions.khorezm' },
  { value: 'karakalpakstan', labelKey: 'profileUpdate.regions.karakalpakstan' },
];

export default function Orders() {
  const { t } = useTranslation();
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

  const STATUS_CLASS_MAP: Record<string, string> = {
    pending: `${s.badge} ${s.badgePending}`,
    accepted: `${s.badge} ${s.badgeAccepted}`,
    packing: `${s.badge} ${s.badgePacking}`,
    packed: `${s.badge} ${s.badgePacked}`,
    processing: `${s.badge} ${s.badgeProcessing}`,
    shipped: `${s.badge} ${s.badgeShipped}`,
    delivered: `${s.badge} ${s.badgeDelivered}`,
    cancelled: `${s.badge} ${s.badgeCancelled}`,
    refunded: `${s.badge} ${s.badgeRefunded}`,
    paid: `${s.badge} ${s.badgePaid}`,
  };

  const statusLabel = (status?: string) => {
    const code = String(status || '').toLowerCase();
    return t(`admin.ordersPage.statuses.${code}`, code || '—');
  };

  const renderStatusBadge = (status?: string) => {
    const code = String(status || '').toLowerCase();
    return (
      <span className={STATUS_CLASS_MAP[code] || s.badge}>
        {statusLabel(code)}
      </span>
    );
  };

  const formatRemaining = (ms: number): string => {
    const total = Math.max(0, Math.floor(ms / 1000));
    const h = Math.floor(total / 3600).toString().padStart(2, '0');
    const m = Math.floor((total % 3600) / 60).toString().padStart(2, '0');
    const s = Math.floor(total % 60).toString().padStart(2, '0');
    return `${h}:${m}:${s}`;
  };

  const renderCcStatus = (status?: string) => renderStatusBadge(status);

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
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 14px',
          marginBottom: 12,
          borderRadius: 12,
          background: 'linear-gradient(135deg, #eef2ff 0%, #faf5ff 100%)',
          border: '1px solid #e9d5ff',
        }}
      >
        <div>
          <div style={{ fontWeight: 900, fontSize: 18, color: '#312e81' }}>
            {t('admin.ordersPage.hero.title')}
          </div>
          <div style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>
            {t('admin.ordersPage.hero.subtitle')}
          </div>
        </div>
        {isSale && (
          <span
            style={{
              padding: '6px 10px',
              borderRadius: 999,
              fontSize: 12,
              fontWeight: 800,
              background: '#ecfeff',
              color: '#155e75',
              border: '1px solid #a5f3fc',
            }}
          >
            {t('admin.ordersPage.hero.sale')}
          </span>
        )}
      </div>
      <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12, gap:12, flexWrap:'wrap'}}>
        <div style={{fontWeight:700}}>{t('admin.ordersPage.title')}</div>
        <div style={{display:'flex', gap:8, flexWrap:'wrap', alignItems:'center'}}>
          <select className={s.input} value={status} onChange={(e)=>setStatus(e.target.value)} style={{height:32, borderRadius:10}}>
            <option value="">{t('admin.ordersPage.filters.statusAll')}</option>
            <option value="pending">{t('admin.ordersPage.statuses.pending')}</option>
            <option value="accepted">{t('admin.ordersPage.statuses.accepted')}</option>
            <option value="packing">{t('admin.ordersPage.statuses.packing')}</option>
            <option value="packed">{t('admin.ordersPage.statuses.packed')}</option>
            <option value="processing">{t('admin.ordersPage.statuses.processing')}</option>
            <option value="shipped">{t('admin.ordersPage.statuses.shipped')}</option>
            <option value="delivered">{t('admin.ordersPage.statuses.delivered')}</option>
            <option value="cancelled">{t('admin.ordersPage.statuses.cancelled')}</option>
            <option value="refunded">{t('admin.ordersPage.statuses.refunded')}</option>
            <option value="paid">{t('admin.ordersPage.statuses.paid')}</option>
          </select>
          <input className={s.input} placeholder={t('admin.ordersPage.filters.searchPlaceholder')} value={q} onChange={(e)=>setQ(e.target.value)} style={{minWidth:240}} />
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
      {loading && (
        <div style={{ fontSize: 12, color: '#64748b', marginBottom: 8 }}>
          {t('admin.ordersPage.loading')}
        </div>
      )}
      <div style={{overflowX:'auto'}}>
      <table className={s.table}>
        <thead>
          <tr style={{background:'#f8fafc', position:'sticky', top:0, zIndex:1}}>
            <th>{t('admin.ordersPage.table.customer')}</th>
            <th>{t('admin.ordersPage.table.status')}</th>
            <th>{t('admin.ordersPage.table.city')}</th>
            <th>{t('admin.ordersPage.table.time')}</th>
            <th>{t('admin.ordersPage.table.action')}</th>
          </tr>
        </thead>
        <tbody>
          {loading && Array.from({length: Math.min(ordersLimit, 10)}).map((_, i)=> (
            <tr key={`sk-${i}`}>
              <td colSpan={5}>
                <div style={{display:'grid', gridTemplateColumns:'1fr 120px 140px 160px 140px', gap:12}}>
                  {Array.from({length:5}).map((__, j)=> (
                    <div key={j} style={{height:16, background:'#e5e7eb', borderRadius:8}} />
                  ))}
                </div>
              </td>
            </tr>
          ))}
          {!loading && pagedOrders.map(o => (
            <tr key={o.id}>
              <td>{o.customer}</td>
              <td>{renderStatusBadge(o.status)}</td>
              <td>{o.location || '-'}</td>
              <td style={{textAlign:'center', color: timeColor(o.created_at), fontVariantNumeric: 'tabular-nums'}}>
                {formatDateTime(o.created_at)}
              </td>
              <td style={{textAlign:'center'}}>
                {isSale && (o.status === 'pending' || !o.status) && (
                  <button
                    className={`${s.btn}`}
                    style={{
                      height:32, 
                      padding:'0 16px', 
                      borderRadius:12,
                      background:'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                      color:'#fff', 
                      border:'none', 
                      boxShadow:'0 4px 12px rgba(16, 185, 129, 0.3)',
                      display:'inline-flex', 
                      alignItems:'center', 
                      justifyContent:'center',
                      gap:8, 
                      fontWeight:700,
                      transition:'all 0.2s ease',
                      cursor:'pointer'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'translateY(-2px)';
                      e.currentTarget.style.boxShadow = '0 6px 16px rgba(16, 185, 129, 0.4)';
                      e.currentTarget.style.background = 'linear-gradient(135deg, #059669 0%, #047857 100%)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = '0 4px 12px rgba(16, 185, 129, 0.3)';
                      e.currentTarget.style.background = 'linear-gradient(135deg, #10b981 0%, #059669 100%)';
                    }}
                    onClick={async ()=>{
                      try {
                        await shopAPI.takeOrderCallCenter(o.id);
                        setNotice({ type: 'success', message: t('admin.ordersPage.cc.takeSuccess') });
                        setTimeout(()=> setNotice(null), 2000);
                      } catch (e:any) {
                        const msg = e?.response?.data?.detail || e?.message || t('common.forms.error');
                        setNotice({ type:'error', message: msg });
                        setTimeout(()=> setNotice(null), 3000);
                      }
                    }}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    {t('admin.ordersPage.cc.take')}
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
          <div style={{fontSize:12, color:'#64748b'}}>{t('admin.ordersPage.pagination.page', { page: ordersPage, total: Math.max(1, Math.ceil(filtered.length / ordersLimit)) })}</div>
          <div style={{display:'flex', gap:8, alignItems:'center'}}>
            <select className={s.input} value={ordersLimit} onChange={(e)=>{ setOrdersPage(1); setOrdersLimit(Number(e.target.value)||20); }}>
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
            <div className={s.actions}>
              <button className={`${s.btn} ${s.muted}`} disabled={ordersPage<=1} onClick={()=>setOrdersPage(p=>Math.max(1,p-1))}>{t('admin.ordersPage.pagination.prev')}</button>
              <button className={`${s.btn} ${s.muted}`} disabled={ordersPage>=Math.ceil(filtered.length/ordersLimit)} onClick={()=>setOrdersPage(p=>Math.min(Math.ceil(filtered.length/ordersLimit)||1,p+1))}>{t('admin.ordersPage.pagination.next')}</button>
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
            <div style={{fontWeight:900}}>{t('admin.ordersPage.cc.title')}</div>
            <div style={{display:'flex', gap:8, alignItems:'center'}}>
              <select
                className={s.input}
                value={ccStatus}
                onChange={(e)=>{ setCcPage(1); setCcStatus(e.target.value); }}
                style={{height:32, borderRadius:10}}
              >
                <option value="">{t('admin.ordersPage.cc.statusAll')}</option>
                <option value="pending">{t('admin.ordersPage.cc.statuses.pending')}</option>
                <option value="accepted">{t('admin.ordersPage.cc.statuses.accepted')}</option>
                <option value="packing">{t('admin.ordersPage.cc.statuses.packing')}</option>
                <option value="packed">{t('admin.ordersPage.cc.statuses.packed')}</option>
                <option value="processing">{t('admin.ordersPage.cc.statuses.processing')}</option>
                <option value="shipped">{t('admin.ordersPage.cc.statuses.shipped')}</option>
                <option value="delivered">{t('admin.ordersPage.cc.statuses.delivered')}</option>
                <option value="cancelled">{t('admin.ordersPage.cc.statuses.cancelled')}</option>
                <option value="refunded">{t('admin.ordersPage.cc.statuses.refunded')}</option>
                <option value="paid">{t('admin.ordersPage.cc.statuses.paid')}</option>
              </select>
            </div>
          </div>
          {ccLoading && (
            <div style={{ fontSize: 12, color: '#64748b', marginBottom: 8 }}>
              {t('admin.ordersPage.loading')}
            </div>
          )}
          <div style={{overflowX:'auto'}}>
          <table className={s.table}>
            <thead>
              <tr style={{background:'#f8fafc', position:'sticky', top:0, zIndex:1}}>
                <th>{t('admin.ordersPage.cc.table.order')}</th>
                <th>{t('admin.ordersPage.cc.table.fullName')}</th>
                <th>{t('admin.ordersPage.cc.table.phone')}</th>
                <th>{t('admin.ordersPage.cc.table.city')} / {t('admin.ordersPage.cc.table.region')}</th>
                <th>{t('admin.ordersPage.cc.table.total')}</th>
                <th>{t('admin.ordersPage.cc.table.status')}</th>
                <th>{t('admin.ordersPage.cc.table.time')}</th>
                <th>{t('admin.ordersPage.cc.table.comment')} / {t('admin.ordersPage.cc.table.schedule')}</th>
                <th>{t('admin.ordersPage.cc.table.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {ccLoading && Array.from({length: Math.min(ccLimit, 8)}).map((_, i)=> (
                <tr key={`cc-sk-${i}`}>
                  <td colSpan={9}>
                    <div style={{display:'grid', gridTemplateColumns:'140px 200px 160px 180px 100px 120px 140px 240px 320px', gap:12}}>
                      {Array.from({length:9}).map((__, j)=> (
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
                    <div style={{display:'flex', flexDirection:'column', gap:6}}>
                      <select
                        className={s.input}
                        value={(o.city || '').toLowerCase()}
                        onChange={(e)=> setCcOrders(prev => prev.map(x => x.id===o.id ? { ...x, city: e.target.value } : x))}
                        style={{height:32, borderRadius:10, width:'100%'}}
                      >
                        <option value="">—</option>
                        {LOCATION_OPTIONS.map(opt => (
                          <option key={opt.value} value={opt.value}>{t(opt.labelKey)}</option>
                        ))}
                      </select>
                      <input
                        className={s.input}
                        placeholder={t('admin.ordersPage.cc.regionPlaceholder')}
                        value={o.order_region || ''}
                        onChange={(e)=> setCcOrders(prev => prev.map(x => x.id===o.id ? { ...x, order_region: e.target.value } : x))}
                        style={{height:32, borderRadius:10, padding:'0 10px', border:'1px solid #e5e7eb', background:'#fff', width:'100%'}}
                      />
                    </div>
                  </td>
                  <td>{Number(o.total_price||0).toLocaleString()}</td>
                  <td>{renderCcStatus(o.status)}</td>
                  <td>{o.created_at ? new Date(o.created_at).toLocaleString() : '—'}</td>
                  <td>
                    <div style={{display:'flex', flexDirection:'column', gap:6}}>
                      <input
                        className={s.input}
                        placeholder={t('admin.ordersPage.cc.commentPlaceholder')}
                        value={ccComments[o.id] ?? (o.order_comment || '')}
                        onChange={(e)=> setCcComments(prev=> ({...prev, [o.id]: e.target.value}))}
                        style={{height:32, borderRadius:10, width:'100%'}}
                      />
                      <div style={{display:'flex', flexDirection:'column', gap:4}}>
                        <input
                          className={s.input}
                          type="datetime-local"
                          value={ccSchedule[o.id] || ''}
                          onChange={(e)=> setCcSchedule(prev=> ({...prev, [o.id]: e.target.value}))}
                          style={{height:32, borderRadius:10, width:'100%'}}
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
                              display:'inline-block', padding:'2px 8px',
                              borderRadius:999, fontSize:12, fontWeight:800,
                              background:'#f8fafc', border:'1px solid #e5e7eb', color,
                              alignSelf:'flex-start'
                            }} title={target.toLocaleString()}>
                              ⏳ {formatRemaining(diff)}
                            </span>
                          );
                        })()}
                      </div>
                    </div>
                  </td>
                  <td>
                    <div style={{display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap:8, minWidth:320}}>
                      <button
                        className={s.btn}
                        style={{
                          height:36, 
                          borderRadius:12,
                          background:'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                          color:'#fff', 
                          fontWeight:700,
                          border:'none',
                          boxShadow:'0 4px 12px rgba(16, 185, 129, 0.3)',
                          transition:'all 0.2s ease',
                          cursor:'pointer',
                          display:'inline-flex',
                          alignItems:'center',
                          justifyContent:'center',
                          gap:6,
                          padding:'0 16px'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.transform = 'translateY(-2px)';
                          e.currentTarget.style.boxShadow = '0 6px 16px rgba(16, 185, 129, 0.4)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.transform = 'translateY(0)';
                          e.currentTarget.style.boxShadow = '0 4px 12px rgba(16, 185, 129, 0.3)';
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
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                        Qabul qilish
                      </button>
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
                <tr><td colSpan={9} style={{textAlign:'center', color:'#64748b'}}>Hali buyurtmalar yo'q</td></tr>
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

