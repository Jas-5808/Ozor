import React, { useEffect, useState } from 'react';
// @ts-ignore
import s from '../AdminLayout.module.scss';
import { adminStore } from '../storage';

type Category = { id: string; name: string; parentId?: string };

export default function Categories() {
  const [items, setItems] = useState<Category[]>(adminStore.load<Category[]>('admin_categories', []));
  const [name, setName] = useState('');
  const [parentId, setParentId] = useState('');

  const addItem = () => {
    if (!name.trim()) return;
    const c: Category = { id: Math.random().toString(36).slice(2), name: name.trim(), parentId: parentId || undefined };
    setItems([c, ...items]);
    setName(''); setParentId('');
  };
  const removeItem = (id: string) => setItems(items.filter(i=>i.id!==id));

  useEffect(()=>{ adminStore.save('admin_categories', items); }, [items]);

  return (
    <div className={s.panel}>
      <div style={{fontWeight:700, marginBottom:12}}>Categories</div>
      <div className={s.form} style={{marginBottom:12}}>
        <input className={s.input} placeholder="Name" value={name} onChange={(e)=>setName(e.target.value)} />
        <input className={s.input} placeholder="Parent ID (optional)" value={parentId} onChange={(e)=>setParentId(e.target.value)} />
        <button className={`${s.btn} ${s.primary}`} onClick={addItem}>Add category</button>
      </div>
      <table className={s.table}>
        <thead>
          <tr><th>Name</th><th>Parent</th><th></th></tr>
        </thead>
        <tbody>
          {items.map(i=> (
            <tr key={i.id}>
              <td>{i.name}</td>
              <td>{i.parentId || '-'}</td>
              <td><div className={s.actions}><button className={`${s.btn} ${s.danger}`} onClick={()=>removeItem(i.id)}>Delete</button></div></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

