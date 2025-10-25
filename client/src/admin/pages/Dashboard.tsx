import React, { useMemo } from 'react';
// @ts-ignore
import s from '../AdminLayout.module.scss';

export default function Dashboard() {
  // мок-статы для карточек
  const warehouseStats = useMemo(()=> ({ total: 25, low: 1, out: 0, amount: 5489801 }), []);
  const ordersStats = useMemo(()=> ({ total: 316, avg: 51987, sum: 16427956, pending: 99 }), []);
  const recent = useMemo(()=> (
    [
      { id: 333, name: 'Комплектующие', client: 'jasur sadicov', status:'Ожидает', sum: 55998, date: '27 сент. 2025 г.' },
      { id: 330, name: 'Комплектующие', client: 'jasur sadicov', status:'Отменен', sum: 151995, date: '15 сент. 2025 г.' },
      { id: 329, name: 'Комплектующие', client: 'jasur sadicov', status:'Отменен', sum: 49999, date: '13 сент. 2025 г.' },
      { id: 328, name: 'Комплектующие', client: 'jasur sadicov', status:'Доставлен', sum: 443986, date: '28 авг. 2025 г.' },
      { id: 327, name: 'Комплектующие', client: 'Жасур Садыков', status:'Отменен', sum: 144993, date: '28 авг. 2025 г.' },
    ]
  ), []);

  const badge = (status: string) => {
    const map: Record<string, string> = {
      'Ожидает': `${s.badge} ${s.badgeInfo}`,
      'Отменен': `${s.badge} ${s.badgeCancelled}`,
      'Доставлен': `${s.badge} ${s.badgePaid}`,
      'Подтвержден': `${s.badge} ${s.badgeActive}`,
      'Сборка': `${s.badge} ${s.badgePending}`,
    };
    return map[status] || s.badge;
  };

  return (
    <div>
      {/* Верхние карточки управления */}
      <div className={s.cardGrid} style={{marginBottom:12}}>
        <div className={s.kpi}>
          <div style={{display:'flex', alignItems:'center', gap:10}}>
            <div style={{width:32, height:32, borderRadius:10, background:'#e0e7ff', display:'grid', placeItems:'center'}}>📦</div>
            <div style={{fontWeight:700}}>Управление складом</div>
          </div>
          <div style={{opacity:.65, fontSize:12, marginTop:6}}>Товары, остатки, движения</div>
        </div>
        <div className={s.kpi}>
          <div style={{display:'flex', alignItems:'center', gap:10}}>
            <div style={{width:32, height:32, borderRadius:10, background:'#dcfce7', display:'grid', placeItems:'center'}}>📑</div>
            <div style={{fontWeight:700}}>Управление заказами</div>
          </div>
          <div style={{opacity:.65, fontSize:12, marginTop:6}}>Заказы, статусы, клиенты</div>
        </div>
        <div className={s.kpi}>
          <div style={{display:'flex', alignItems:'center', gap:10}}>
            <div style={{width:32, height:32, borderRadius:10, background:'#fee2e2', display:'grid', placeItems:'center'}}>🛒</div>
            <div style={{fontWeight:700}}>Управление товарами</div>
          </div>
          <div style={{opacity:.65, fontSize:12, marginTop:6}}>Каталог, категории, цены</div>
        </div>
        <div className={s.kpi}>
          <div style={{display:'flex', alignItems:'center', gap:10}}>
            <div style={{width:32, height:32, borderRadius:10, background:'#fff7ed', display:'grid', placeItems:'center'}}>🏷️</div>
            <div style={{fontWeight:700}}>Управление категориями</div>
          </div>
          <div style={{opacity:.65, fontSize:12, marginTop:6}}>Создание и редактирование</div>
        </div>
      </div>

      {/* Блоки статистики */}
      <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:12}}>
        <div className={s.panel}>
          <div style={{fontWeight:700, marginBottom:8}}>Статистика склада</div>
          <div style={{display:'grid', gridTemplateColumns:'repeat(4,1fr)', textAlign:'center'}}>
            <div>
              <div style={{color:'#2563eb', fontSize:18, fontWeight:800}}>{warehouseStats.total}</div>
              <div style={{opacity:.7, fontSize:12}}>Всего товаров</div>
            </div>
            <div>
              <div style={{color:'#059669', fontSize:18, fontWeight:800}}>{warehouseStats.amount.toLocaleString()} ₽</div>
              <div style={{opacity:.7, fontSize:12}}>Общая стоимость</div>
            </div>
            <div>
              <div style={{color:'#d97706', fontSize:18, fontWeight:800}}>{warehouseStats.low}</div>
              <div style={{opacity:.7, fontSize:12}}>Низкий остаток</div>
            </div>
            <div>
              <div style={{color:'#ef4444', fontSize:18, fontWeight:800}}>{warehouseStats.out}</div>
              <div style={{opacity:.7, fontSize:12}}>Нет в наличии</div>
            </div>
          </div>
        </div>
        <div className={s.panel}>
          <div style={{fontWeight:700, marginBottom:8}}>Статистика заказов</div>
          <div style={{display:'grid', gridTemplateColumns:'repeat(3,1fr) 1fr', textAlign:'center'}}>
            <div>
              <div style={{color:'#2563eb', fontSize:18, fontWeight:800}}>{ordersStats.total}</div>
              <div style={{opacity:.7, fontSize:12}}>Всего заказов</div>
            </div>
            <div>
              <div style={{color:'#059669', fontSize:18, fontWeight:800}}>{ordersStats.avg.toLocaleString()} ₽</div>
              <div style={{opacity:.7, fontSize:12}}>Средний чек</div>
            </div>
            <div>
              <div style={{color:'#16a34a', fontSize:18, fontWeight:800}}>{ordersStats.sum.toLocaleString()} ₽</div>
              <div style={{opacity:.7, fontSize:12}}>Общая сумма</div>
            </div>
            <div>
              <div style={{color:'#ef4444', fontSize:18, fontWeight:800}}>{ordersStats.pending}</div>
              <div style={{opacity:.7, fontSize:12}}>Ожидают</div>
            </div>
          </div>
        </div>
      </div>

      {/* Последние заказы */}
      <div className={s.panel}>
        <div style={{fontWeight:700, marginBottom:8}}>Последние заказы</div>
        <table className={s.table}>
          <thead>
            <tr>
              <th>ЗАКАЗ</th>
              <th>КЛИЕНТ</th>
              <th>СТАТУС</th>
              <th>СУММА</th>
              <th>ДАТА</th>
            </tr>
          </thead>
          <tbody>
            {recent.map(r=> (
              <tr key={r.id}>
                <td>#{r.id}<div style={{opacity:.65, fontSize:12}}>{r.name}</div></td>
                <td>{r.client}</td>
                <td><span className={badge(r.status)}>{r.status}</span></td>
                <td>{r.sum.toLocaleString()} ₽</td>
                <td>{r.date}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

