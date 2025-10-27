import { useEffect, useMemo, useState } from 'react';
// @ts-ignore
import s from '../AdminLayout.module.scss';
import { adminStore } from '../storage';
import { userAPI } from '../../services/api';

type User = { 
  id: string; 
  name: string; 
  phone: string; 
  role: 'ceo'|'sale_manager'|'driver_manager'|'client'|'driver'|'sale_operator'|'warehouse_manager'; 
  email?: string; 
  date_joined?: string; 
  is_active?: boolean 
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
  const filtered = items;

  const addUser = () => {
    const u: User = { id: Math.random().toString(36).slice(2), name: `User ${items.length+1}`, phone: '+998', role: 'client' };
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
          let mappedRole: 'ceo'|'sale_manager'|'driver_manager'|'client'|'driver'|'sale_operator'|'warehouse_manager';
          
          // Маппинг ролей из API в новые роли
          switch (apiRole) {
            case 'ceo':
            case 'chief executive officer':
              mappedRole = 'ceo';
              break;
            case 'sale_manager':
            case 'sale manager':
              mappedRole = 'sale_manager';
              break;
            case 'driver_manager':
            case 'driver manager':
              mappedRole = 'driver_manager';
              break;
            case 'client':
            case 'customer':
              mappedRole = 'client';
              break;
            case 'driver':
              mappedRole = 'driver';
              break;
            case 'sale_operator':
            case 'sale operator':
              mappedRole = 'sale_operator';
              break;
            case 'warehouse_manager':
            case 'warehouse manager':
              mappedRole = 'warehouse_manager';
              break;
            default:
              // Для старых ролей или неизвестных
              if (apiRole === 'admin' || apiRole === 'staff') mappedRole = 'ceo';
              else if (apiRole === 'manager') mappedRole = 'sale_manager';
              else mappedRole = 'client';
              break;
          }
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
            <option value="ceo">CEO</option>
            <option value="sale_manager">Sale Manager</option>
            <option value="driver_manager">Driver Manager</option>
            <option value="client">Client</option>
            <option value="driver">Driver</option>
            <option value="sale_operator">Sale Operator</option>
            <option value="warehouse_manager">Warehouse Manager</option>
          </select>
        </div>
      </div>
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
                {u.role === 'ceo' && <span className={`${s.badge} ${s.badgeShipped}`}>CEO</span>}
                {u.role === 'sale_manager' && <span className={`${s.badge} ${s.badgeInfo || ''}`}>Sale Manager</span>}
                {u.role === 'driver_manager' && <span className={`${s.badge} ${s.badgeInfo || ''}`}>Driver Manager</span>}
                {u.role === 'client' && <span className={`${s.badge} ${s.badgePaid}`}>Client</span>}
                {u.role === 'driver' && <span className={`${s.badge} ${s.badgeInfo || ''}`}>Driver</span>}
                {u.role === 'sale_operator' && <span className={`${s.badge} ${s.badgeInfo || ''}`}>Sale Operator</span>}
                {u.role === 'warehouse_manager' && <span className={`${s.badge} ${s.badgeInfo || ''}`}>Warehouse Manager</span>}
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

