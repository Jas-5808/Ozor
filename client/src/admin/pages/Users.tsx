import React, { useEffect, useMemo, useState } from 'react';
// @ts-ignore
import s from '../AdminLayout.module.scss';
import { adminStore } from '../storage';
import { userAPI } from '../../services/api';

type User = { id: string; name: string; phone: string; role: string; email?: string; date_joined?: string; is_active?: boolean };

const ROLE_OPTIONS: Array<{ value: string; label: string }> = [
  { value: 'ceo', label: 'Chief Executive Officer' },
  { value: 'sale_manager', label: 'Sale Manager' },
  { value: 'driver_manager', label: 'Driver Manager' },
  { value: 'client', label: 'Client' },
  { value: 'driver', label: 'Driver' },
  { value: 'sale', label: 'Sale' },
  { value: 'warehouse_manager', label: 'Warehouse Manager' },
  // legacy/fallback option to avoid breaking select when existing users have admin
  { value: 'admin', label: 'Admin' },
];

const apiRoleToUiRole = (role: string): string => {
  const r = String(role || '').toLowerCase();
  if (['admin','staff'].includes(r)) return 'admin';
  if (r === 'sale_operator') return 'sale';
  return r;
};

const uiRoleToApiRole = (role: string): string => {
  const r = String(role || '').toLowerCase();
  if (r === 'sale') return 'sale';
  if (r === 'admin') return 'admin';
  return r;
};

export default function Users() {
  const [items, setItems] = useState<User[]>(adminStore.load<User[]>('admin_users', []));
  const [q, setQ] = useState('');
  const [role, setRole] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [debouncedQ, setDebouncedQ] = useState('');
  const [loading, setLoading] = useState(false);
  const [updatingRoleId, setUpdatingRoleId] = useState<string | null>(null);
  const [forbidden, setForbidden] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const filtered = items;

  const addUser = () => {
    const u: User = { id: Math.random().toString(36).slice(2), name: `User ${items.length+1}`, phone: '+998', role: 'customer' };
    setItems([u, ...items]);
  };

  useEffect(()=>{ adminStore.save('admin_users', items); }, [items]);

  useEffect(()=>{
    const id = setTimeout(()=> setDebouncedQ(q), 1000);
    return ()=> clearTimeout(id);
  }, [q]);

  useEffect(()=>{
    let ignore = false;
    const fetchUsers = async ()=>{
      try {
        setLoading(true);
        const params:any = { page, limit };
        if (role) params.role = uiRoleToApiRole(role);
        if (debouncedQ) params.search = debouncedQ;
        const res = await userAPI.listUsers(params);
        if (ignore) return;
        const payload = res.data || {};
        const data = payload.users || [];
        const normalized: User[] = data.map((u:any)=> {
          const apiRole = String(u.role || '').toLowerCase();
          const mappedRole = apiRoleToUiRole(apiRole);
          return {
            id: u.id,
            name: `${u.first_name || ''} ${u.last_name || ''}`.trim() || (u.username || u.email || u.phone_number || 'User'),
            phone: u.phone_number || '',
            role: mappedRole,
            email: u.email || '',
            date_joined: u.date_joined,
            is_active: u.is_active,
          };
        });
        setForbidden(false);
        setErrorMsg(null);
        setItems(normalized);
        setTotalPages(payload.total_pages || 1);
      } catch (e:any) {
        // Обработка 403: доступ только для CEO
        if (!ignore && e?.response?.status === 403) {
          setForbidden(true);
          const msg = e?.response?.data?.detail || e?.response?.data?.message || 'Доступ разрешён только для CEO';
          setErrorMsg(msg);
          setItems([]);
          setTotalPages(1);
        }
      } finally { setLoading(false); }
    };
    fetchUsers();
    return ()=>{ ignore = true; };
  }, [debouncedQ, role, page, limit]);

  return (
    <div className={s.panel}>
      <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12}}>
        <div style={{fontWeight:700}}>Users</div>
        <div style={{display:'flex', gap:8}}>
          <input className={s.input} placeholder="Search name/email/username" value={q} onChange={(e)=>{ setPage(1); setQ(e.target.value); }} disabled={forbidden} />
          <select className={s.input} value={role} onChange={(e)=>{ setPage(1); setRole(e.target.value); }} disabled={forbidden}>
            <option value="">All roles</option>
            {ROLE_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          <select className={s.input} value={limit} onChange={(e)=>{ setPage(1); setLimit(Number(e.target.value)||10); }} disabled={forbidden}>
            <option value={10}>10</option>
            <option value={20}>20</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
        </div>
      </div>
      {errorMsg && (
        <div style={{
          marginBottom: 12,
          padding: '10px 12px',
          border: '1px solid #fecaca',
          background: '#fef2f2',
          color: '#7f1d1d',
          borderRadius: 12,
          fontWeight: 600,
        }}>
          {errorMsg}
        </div>
      )}
      {loading && <div style={{fontSize:12, color:'#64748b', marginBottom:8}}>Loading…</div>}
      <table className={s.table}>
        <thead>
          <tr><th>Name</th><th>Phone</th><th>Email</th><th>Joined</th><th>Status</th><th>Role</th><th></th></tr>
        </thead>
        <tbody>
          {filtered.map(u => (
            <tr key={u.id}>
              <td>{u.name}</td>
              <td>{u.phone}</td>
              <td>{u.email || '-'}</td>
              <td>{u.date_joined ? new Date(u.date_joined).toLocaleString() : '-'}</td>
              <td>{u.is_active ? <span className={`${s.badge} ${s.badgeActive}`}>Active</span> : <span className={`${s.badge} ${s.badgeInactive}`}>Inactive</span>}</td>
              <td>
                {ROLE_OPTIONS.find(r => r.value === u.role)?.label || u.role}
              </td>
              <td>
                <div style={{display:'flex', gap:8, justifyContent:'flex-end'}}>
                  <select
                    className={s.input}
                    value={u.role}
                    onChange={async (e)=>{
                      const newRole = e.target.value;
                      try {
                        setUpdatingRoleId(u.id);
                        await userAPI.updateUserRole(u.id, uiRoleToApiRole(newRole));
                        setItems(prev => prev.map(p => p.id===u.id ? { ...p, role: newRole } : p));
                      } catch {}
                      finally { setUpdatingRoleId(null); }
                    }}
                    disabled={updatingRoleId === u.id}
                    style={{minWidth:160}}
                  >
                    {ROLE_OPTIONS.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginTop:12}}>
        <div style={{fontSize:12, color:'#64748b'}}>Page {page} of {totalPages}</div>
        <div className={s.actions}>
          <button className={`${s.btn} ${s.muted}`} disabled={page<=1} onClick={()=>setPage(p=>Math.max(1,p-1))}>Prev</button>
          <button className={`${s.btn} ${s.muted}`} disabled={page>=totalPages} onClick={()=>setPage(p=>Math.min(totalPages,p+1))}>Next</button>
        </div>
      </div>
    </div>
  );
}

