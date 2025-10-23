import React, { useEffect, useState } from 'react';
// @ts-ignore
import s from '../AdminLayout.module.scss';
import { adminStore } from '../storage';

type Banner = { id: string; title: string; imageUrl: string; link?: string };

export default function Banners() {
  const [items, setItems] = useState<Banner[]>(adminStore.load<Banner[]>('admin_banners', []));
  const [title, setTitle] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [link, setLink] = useState('');

  const addItem = () => {
    if (!title.trim() || !imageUrl.trim()) return;
    const b: Banner = { id: Math.random().toString(36).slice(2), title: title.trim(), imageUrl: imageUrl.trim(), link: link || undefined };
    setItems([b, ...items]);
    setTitle(''); setImageUrl(''); setLink('');
  };
  const removeItem = (id: string) => setItems(items.filter(i=>i.id!==id));

  useEffect(()=>{ adminStore.save('admin_banners', items); }, [items]);

  return (
    <div className={s.panel}>
      <div style={{fontWeight:700, marginBottom:12}}>Banners</div>
      <div className={s.form} style={{marginBottom:12}}>
        <input className={s.input} placeholder="Title" value={title} onChange={(e)=>setTitle(e.target.value)} />
        <input className={s.input} placeholder="Image URL" value={imageUrl} onChange={(e)=>setImageUrl(e.target.value)} />
        <input className={s.input} placeholder="Link (optional)" value={link} onChange={(e)=>setLink(e.target.value)} />
        <button className={`${s.btn} ${s.primary}`} onClick={addItem}>Add banner</button>
      </div>
      <table className={s.table}>
        <thead>
          <tr><th>Title</th><th>Image</th><th>Link</th><th></th></tr>
        </thead>
        <tbody>
          {items.map(i=> (
            <tr key={i.id}>
              <td>{i.title}</td>
              <td><a href={i.imageUrl} target="_blank" rel="noreferrer">Open</a></td>
              <td>{i.link || '-'}</td>
              <td><div className={s.actions}><button className={`${s.btn} ${s.danger}`} onClick={()=>removeItem(i.id)}>Delete</button></div></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

