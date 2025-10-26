import React, { useEffect, useMemo, useState } from 'react';
// @ts-ignore
import s from '../AdminLayout.module.scss';
import { adminStore } from '../storage';
import { userAPI } from '../../services/api';

type User = { id: string; name: string; phone: string; role: 'admin'|'manager'|'customer'|'ceo'|'client'; email?: string; date_joined?: string; is_active?: boolean };

export default function Users() {
  const [items, setItems] = useState<User[]>(adminStore.load<User[]>('admin_users', []));
  const [q, setQ] = useState('');
  const [role, setRole] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [debouncedQ, setDebouncedQ] = useState('');
  const [loading, setLoading] = useState(false);
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
        if (role) params.role = role;
        if (debouncedQ) params.search = debouncedQ;
        const res = await userAPI.listUsers(params);
        if (ignore) return;
        const payload = res.data || {};
        const data = payload.users || [];
        const normalized: User[] = data.map((u:any)=> {
          const apiRole = String(u.role || '').toLowerCase();
          let mappedRole: User['role'];
          if (['admin','staff'].includes(apiRole)) mappedRole = 'admin';
          else if (apiRole === 'manager') mappedRole = 'manager';
          else if (apiRole === 'ceo') mappedRole = 'ceo';
          else mappedRole = (u.is_staff ? 'admin' : 'client');
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
        setItems(normalized);
        setTotalPages(payload.total_pages || 1);
      } catch (e) {
        // keep local
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
          <input className={s.input} placeholder="Search name/email/username" value={q} onChange={(e)=>{ setPage(1); setQ(e.target.value); }} />
          <select className={s.input} value={role} onChange={(e)=>{ setPage(1); setRole(e.target.value); }}>
            <option value="">All roles</option>
            <option value="client">Client</option>
            <option value="manager">Manager</option>
            <option value="admin">Admin</option>
            <option value="ceo">CEO</option>
          </select>
          <select className={s.input} value={limit} onChange={(e)=>{ setPage(1); setLimit(Number(e.target.value)||10); }}>
            <option value={10}>10</option>
            <option value={20}>20</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
        </div>
      </div>
      {loading && <div style={{fontSize:12, color:'#64748b', marginBottom:8}}>Loading…</div>}
      <table className={s.table}>
        <thead>
          <tr><th>Name</th><th>Phone</th><th>Email</th><th>Joined</th><th>Status</th><th>Role</th></tr>
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
                {u.role === 'admin' && <span className={`${s.badge} ${s.badgeShipped}`}>Admin</span>}
                {u.role === 'manager' && <span className={`${s.badge} ${s.badgeInfo || ''}`}>Manager</span>}
                {u.role === 'client' && <span className={`${s.badge} ${s.badgePaid}`}>Client</span>}
                {u.role === 'ceo' && <span className={`${s.badge} ${s.badgePending}`}>CEO</span>}
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

