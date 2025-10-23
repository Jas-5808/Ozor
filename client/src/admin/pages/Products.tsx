import React, { useEffect, useState } from 'react';
// @ts-ignore
import s from '../AdminLayout.module.scss';
import { adminStore } from '../storage';

type Product = { id: string; name: string; price: number; stock: number; categoryId?: string; };

export default function Products() {
  const [items, setItems] = useState<Product[]>(adminStore.load<Product[]>('admin_products', []));
  const [name, setName] = useState('');
  const [price, setPrice] = useState<number>(0);
  const [stock, setStock] = useState<number>(0);
  const [categoryId, setCategoryId] = useState<string>('');

  const addItem = () => {
    if (!name.trim()) return;
    const p: Product = {
      id: Math.random().toString(36).slice(2),
      name: name.trim(),
      price: Number(price) || 0,
      stock: Number(stock) || 0,
      categoryId: categoryId || undefined,
    };
    setItems([p, ...items]);
    setName(''); setPrice(0); setStock(0); setCategoryId('');
  };

  const removeItem = (id: string) => setItems(items.filter(i=>i.id!==id));

  useEffect(()=>{ adminStore.save('admin_products', items); }, [items]);

  return (
    <div className={s.panel}>
      <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12}}>
        <div style={{fontWeight:700}}>Products</div>
      </div>
      <div className={s.form} style={{marginBottom:12}}>
        <input className={s.input} placeholder="Name" value={name} onChange={(e)=>setName(e.target.value)} />
        <input className={s.input} placeholder="Price" type="number" value={price} onChange={(e)=>setPrice(Number(e.target.value))} />
        <input className={s.input} placeholder="Stock" type="number" value={stock} onChange={(e)=>setStock(Number(e.target.value))} />
        <input className={s.input} placeholder="Category ID" value={categoryId} onChange={(e)=>setCategoryId(e.target.value)} />
        <div className={s.actions}>
          <button className={`${s.btn} ${s.primary}`} onClick={addItem}>Add product</button>
        </div>
      </div>
      <table className={s.table}>
        <thead>
          <tr><th>Name</th><th>Price</th><th>Stock</th><th>Category</th><th></th></tr>
        </thead>
        <tbody>
          {items.map(i=> (
            <tr key={i.id}>
              <td>{i.name}</td>
              <td>{i.price}</td>
              <td>{i.stock}</td>
              <td>{i.categoryId || '-'}</td>
              <td><div className={s.actions}><button className={`${s.btn} ${s.danger}`} onClick={()=>removeItem(i.id)}>Delete</button></div></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

