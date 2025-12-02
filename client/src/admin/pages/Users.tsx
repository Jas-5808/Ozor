import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
// @ts-ignore
import s from '../AdminLayout.module.scss';
import { adminStore } from '../storage';
import { userAPI } from '../../services/api';

type User = { id: string; name: string; phone: string; role: string; email?: string; date_joined?: string; is_active?: boolean };

const ROLE_OPTIONS: Array<{ value: string; labelKey: string }> = [
  { value: 'ceo', labelKey: 'admin.usersPage.roles.ceo' },
  { value: 'sale_manager', labelKey: 'admin.usersPage.roles.sale_manager' },
  { value: 'driver_manager', labelKey: 'admin.usersPage.roles.driver_manager' },
  { value: 'client', labelKey: 'admin.usersPage.roles.client' },
  { value: 'driver', labelKey: 'admin.usersPage.roles.driver' },
  { value: 'sale', labelKey: 'admin.usersPage.roles.sale' },
  { value: 'warehouse_manager', labelKey: 'admin.usersPage.roles.warehouse_manager' },
  { value: 'admin', labelKey: 'admin.usersPage.roles.admin' },
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
  const { t } = useTranslation();
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

  const getRoleLabel = (value: string) => {
    const opt = ROLE_OPTIONS.find((r) => r.value === value);
    return opt ? t(opt.labelKey) : value;
  };

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
        // Handle 403 responses: access allowed only for CEO
        if (!ignore && e?.response?.status === 403) {
          setForbidden(true);
          const msg =
            e?.response?.data?.detail ||
            e?.response?.data?.message ||
            t('admin.usersPage.errors.ceoOnly');
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
        <div style={{fontWeight:700}}>{t('admin.usersPage.title')}</div>
        <div style={{display:'flex', gap:8}}>
          <input className={s.input} placeholder={t('admin.usersPage.filters.searchPlaceholder')} value={q} onChange={(e)=>{ setPage(1); setQ(e.target.value); }} disabled={forbidden} />
          <select className={s.input} value={role} onChange={(e)=>{ setPage(1); setRole(e.target.value); }} disabled={forbidden}>
            <option value="">{t('admin.usersPage.filters.roleAll')}</option>
            {ROLE_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>{t(opt.labelKey)}</option>
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
      {loading && (
        <div style={{ fontSize: 12, color: '#64748b', marginBottom: 8 }}>
          {t('common.loading')}
        </div>
      )}
      <table className={s.table}>
        <thead>
          <tr>
            <th>{t('admin.usersPage.table.name')}</th>
            <th>{t('admin.usersPage.table.phone')}</th>
            <th>{t('admin.usersPage.table.email')}</th>
            <th>{t('admin.usersPage.table.joined')}</th>
            <th>{t('admin.usersPage.table.status')}</th>
            <th>{t('admin.usersPage.table.role')}</th>
            <th>{t('admin.usersPage.table.actions')}</th>
          </tr>
        </thead>
        <tbody>
          {filtered.map(u => (
            <tr key={u.id}>
              <td>{u.name}</td>
              <td>{u.phone}</td>
              <td>{u.email || '-'}</td>
              <td>{u.date_joined ? new Date(u.date_joined).toLocaleString() : '-'}</td>
              <td>
                {u.is_active ? (
                  <span className={`${s.badge} ${s.badgeActive}`}>{t('admin.usersPage.status.active')}</span>
                ) : (
                  <span className={`${s.badge} ${s.badgeInactive}`}>{t('admin.usersPage.status.inactive')}</span>
                )}
              </td>
              <td>
                {getRoleLabel(u.role)}
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
                      <option key={opt.value} value={opt.value}>{t(opt.labelKey)}</option>
                    ))}
                  </select>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginTop:12}}>
        <div style={{fontSize:12, color:'#64748b'}}>{t('admin.usersPage.pagination.page', { page, total: totalPages })}</div>
        <div className={s.actions}>
          <button className={`${s.btn} ${s.muted}`} disabled={page<=1} onClick={()=>setPage(p=>Math.max(1,p-1))}>{t('admin.usersPage.pagination.prev')}</button>
          <button className={`${s.btn} ${s.muted}`} disabled={page>=totalPages} onClick={()=>setPage(p=>Math.min(totalPages,p+1))}>{t('admin.usersPage.pagination.next')}</button>
        </div>
      </div>
    </div>
  );
}

