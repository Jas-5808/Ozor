import React, { useEffect, useMemo, useState } from 'react';
// @ts-ignore
import s from '../AdminLayout.module.scss';
import { adminStore } from '../storage';
import { userAPI } from '../../services/api';

type User = { id: string; name: string; phone: string; role: 'admin'|'manager'|'customer'; email?: string; date_joined?: string; is_active?: boolean };

export default function Users() {
  const [items, setItems] = useState<User[]>(adminStore.load<User[]>('admin_users', []));
  const [q, setQ] = useState('');
  const [role, setRole] = useState('');
  const [loading, setLoading] = useState(false);
  const filtered = useMemo(()=> items.filter(u =>
    (q ? (u.name.toLowerCase().includes(q.toLowerCase()) || u.phone.includes(q)) : true)
    && (role ? u.role === role : true)
  ), [items, q, role]);

  const addUser = () => {
    const u: User = { id: Math.random().toString(36).slice(2), name: `User ${items.length+1}`, phone: '+998', role: 'customer' };
    setItems([u, ...items]);
  };

  useEffect(()=>{ adminStore.save('admin_users', items); }, [items]);

  useEffect(()=>{
    let ignore = false;
    const fetchUsers = async ()=>{
      try {
        setLoading(true);
        const res = await userAPI.getUsersInfo();
        if (ignore) return;
        const data = Array.isArray(res.data) ? res.data : (res.data?.results || [res.data]);
        const normalized: User[] = data.map((u:any)=> {
          const apiRole = String(u.role || '').toLowerCase();
          let mappedRole: 'admin'|'manager'|'customer';
          if (apiRole === 'admin' || apiRole === 'staff') mappedRole = 'admin';
          else if (apiRole === 'manager') mappedRole = 'manager';
          else if (apiRole === 'client' || apiRole === 'customer' || apiRole === '') mappedRole = (u.is_staff ? 'admin' : 'customer');
          else mappedRole = (u.is_staff ? 'admin' : 'customer');
          return {
            id: u.id,
            name: `${u.first_name || ''} ${u.last_name || ''}`.trim() || (u.email || u.phone_number || 'User'),
            phone: u.phone_number || '',
            role: mappedRole,
            email: u.email || '',
            date_joined: u.date_joined,
            is_active: u.is_active,
          };
        });
        setItems(normalized);
      } catch (e) {
        // keep local
      } finally { setLoading(false); }
    };
    fetchUsers();
    return ()=>{ ignore = true; };
  }, []);

  return (
    <div className={s.panel}>
      <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12}}>
        <div style={{fontWeight:700}}>Users</div>
        <div style={{display:'flex', gap:8}}>
          <input className={s.input} placeholder="Search name/phone" value={q} onChange={(e)=>setQ(e.target.value)} />
          <select className={s.input} value={role} onChange={(e)=>setRole(e.target.value)}>
            <option value="">All roles</option>
            <option value="admin">Admin</option>
            <option value="manager">Manager</option>
            <option value="customer">Customer</option>
          </select>
          <button className={`${s.btn} ${s.primary}`} onClick={addUser}>Add</button>
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
                {u.role === 'customer' && <span className={`${s.badge} ${s.badgePaid}`}>Customer</span>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

