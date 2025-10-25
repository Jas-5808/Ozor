import React, { useEffect, useMemo, useState } from 'react';
// @ts-ignore
import s from '../AdminLayout.module.scss';
import { shopAPI } from '../../services/api';

type ApiCategory = {
  id: string;
  name: string;
  parent_id: string | null;
  parent_name: string | null;
  subcategories_count: number;
  products_count: number;
};

export default function Categories() {
  const [items, setItems] = useState<ApiCategory[]>([]);
  const [name, setName] = useState('');
  const [parentId, setParentId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const canSubmit = useMemo(() => name.trim().length > 0, [name]);

  const load = async () => {
    try {
      setLoading(true); setError(null);
      const res = await shopAPI.getCategories(); // GET /shop/categories
      setItems(res.data?.data || res.data || []);
    } catch (e: any) {
      setError(e?.response?.data?.message || e?.message || 'Load error');
    } finally {
      setLoading(false);
    }
  };

  const addItem = async () => {
    if (!canSubmit) return;
    try {
      setLoading(true); setError(null);
      await shopAPI.createCategory({ name: name.trim(), parent_id: parentId || null }); // POST /shop/category
      setName(''); setParentId('');
      await load();
    } catch (e: any) {
      setError(e?.response?.data?.message || e?.message || 'Create error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(()=>{ load(); }, []);

  const copyId = async (id: string) => {
    try {
      await navigator.clipboard.writeText(id);
      setCopied(id);
      setTimeout(()=> setCopied(null), 2000);
    } catch {}
  };

  return (
    <div className={s.panel}>
      <div style={{fontWeight:700, marginBottom:12}}>Categories</div>
      <div className={s.form} style={{marginBottom:12}}>
        <input className={s.input} placeholder="Name" value={name} onChange={(e)=>setName(e.target.value)} />
        <input className={s.input} placeholder="Parent ID (optional)" value={parentId} onChange={(e)=>setParentId(e.target.value)} />
        <button className={`${s.btn} ${s.primary}`} disabled={!canSubmit || loading} onClick={addItem}>
          {loading ? 'Please wait...' : 'Add category'}
        </button>
      </div>
      {error && <div style={{ color: '#b91c1c', marginBottom: 10 }}>{error}</div>}
      <table className={s.table}>
        <thead>
          <tr><th>Name</th><th>Parent</th><th>Subcats</th><th>Products</th><th>ID</th></tr>
        </thead>
        <tbody>
          {items.map(i=> (
            <tr key={i.id}>
              <td>{i.name}</td>
              <td>{i.parent_name || i.parent_id || '-'}</td>
              <td>{i.subcategories_count}</td>
              <td>{i.products_count}</td>
              <td>
                <div style={{ display: 'grid', gap: 6 }}>
                  
                  {copied === i.id ? (
                    <div
                      style={{ width: 30, height: 30, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
                      aria-live="polite"
                    >
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <circle cx="12" cy="12" r="10" stroke="#16a34a" strokeWidth="2" fill="#ecfdf5" />
                        <path d="M7 12l3 3 7-7" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <animate attributeName="stroke-dasharray" from="0,30" to="30,0" dur="0.25s" fill="freeze" />
                        </path>
                        <animateTransform attributeName="transform" attributeType="XML" type="scale" from="0.8" to="1" dur="0.18s" fill="freeze" />
                      </svg>
                    </div>
                  ) : (
                    <button
                      className={`${s.btn} ${s.muted}`}
                      title="Копировать ID"
                      onClick={()=>copyId(i.id)}
                      aria-label="Копировать ID"
                      style={{ height: 30, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <rect x="9" y="9" width="12" height="12" rx="2" stroke="#334155" strokeWidth="2"/>
                        <rect x="3" y="3" width="12" height="12" rx="2" stroke="#334155" strokeWidth="2"/>
                      </svg>
                    </button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

