import React, { useMemo, useState } from 'react';
// @ts-ignore
import s from '../AdminLayout.module.scss';

type Tab = 'stock' | 'inbound' | 'outbound' | 'transfers';

export default function Warehouse(){
  const [tab, setTab] = useState<Tab>('stock');
  const [query, setQuery] = useState('');
  const [location, setLocation] = useState('all');

  const kpis = useMemo(()=>([
    { label: 'SKU', value: 128 },
    { label: 'Всего остатков', value: 4521 },
    { label: 'Товаров < min', value: 14 },
    { label: 'Зарезервировано', value: 236 },
  ]),[]);

  return (
    <div>
      {/* Header */}
      <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12}}>
        <div style={{fontWeight:800, fontSize:18}}>Warehouse</div>
        <div style={{display:'flex', gap:8}}>
          <button className={`${s.btn} ${s.primary}`}>Приход</button>
          <button className={`${s.btn} ${s.info}`}>Перемещение</button>
          <button className={`${s.btn} ${s.warning}`}>Списание/Корректировка</button>
        </div>
      </div>

      {/* KPI */}
      <div className={s.cardGrid} style={{marginBottom:12}}>
        {kpis.map((k)=> (
          <div key={k.label} className={s.kpi}>
            <div style={{opacity:.7, fontSize:12}}>{k.label}</div>
            <div style={{fontSize:24, fontWeight:800}}>{k.value.toLocaleString()}</div>
          </div>
        ))}
      </div>

      {/* Tabs + Filters */}
      <div className={s.panel} style={{marginBottom:12}}>
        <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', gap:8, flexWrap:'wrap'}}>
          <div style={{display:'inline-flex', gap:6, background:'#fff', border:'1px solid #e5e7eb', borderRadius:999, padding:4}}>
            {([
              {key:'stock', label:'Stock'},
              {key:'inbound', label:'Inbound'},
              {key:'outbound', label:'Outbound'},
              {key:'transfers', label:'Transfers'},
            ] as Array<{key:Tab; label:string}>).map(t=> (
              <button key={t.key}
                onClick={()=>setTab(t.key)}
                className={tab===t.key? s.topnavActive:undefined}
                style={{
                  padding:'6px 12px', borderRadius:999, border:0,
                  background: tab===t.key? '#e8f0ff':'transparent', color: tab===t.key? '#1d4ed8':'#475569',
                  cursor:'pointer'
                }}
              >{t.label}</button>
            ))}
          </div>
          <div style={{display:'flex', gap:8}}>
            <input className={s.input} placeholder="Поиск SKU/названия" value={query} onChange={(e)=>setQuery(e.target.value)} />
            <select className={s.input} value={location} onChange={(e)=>setLocation(e.target.value)}>
              <option value="all">Все локации</option>
              <option value="main">Главный склад</option>
              <option value="store-1">Магазин #1</option>
            </select>
          </div>
        </div>
      </div>

      {/* Table placeholder */}
      <div className={s.panel}>
        <div style={{fontWeight:700, marginBottom:8}}>Остатки</div>
        <table className={s.table}>
          <thead>
            <tr>
              <th>SKU</th>
              <th>Название</th>
              <th>Локация</th>
              <th>Доступно</th>
              <th>Резерв</th>
              <th>Min</th>
              <th>Статус</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {Array.from({length:8}).map((_,i)=> (
              <tr key={i}>
                <td>SKU-00{i+1}</td>
                <td style={{textAlign:'left'}}>Пример товара #{i+1}</td>
                <td>{i%2===0?'Главный склад':'Магазин #1'}</td>
                <td>{Math.floor(5+Math.random()*50)}</td>
                <td>{Math.floor(Math.random()*5)}</td>
                <td>{Math.floor(3+Math.random()*7)}</td>
                <td>
                  {i%3===0? <span className={`${s.badge} ${s.badgePending}`}>Ниже min</span> : <span className={`${s.badge} ${s.badgeActive}`}>OK</span>}
                </td>
                <td>
                  <div className={s.actions}>
                    <button className={`${s.btn} ${s.info}`}>Приход</button>
                    <button className={`${s.btn} ${s.warning}`}>Переместить</button>
                    <button className={`${s.btn} ${s.muted}`}>Списать</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}



