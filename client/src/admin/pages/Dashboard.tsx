import React, { useMemo, useState } from 'react';
// @ts-ignore
import s from '../AdminLayout.module.scss';
import DateRange from '../components/DateRange';
import CalendarHeatmap from '../components/CalendarHeatmap';
import LineChart from '../components/LineChart';
import PieChart from '../components/PieChart';

export default function Dashboard() {
  const [range, setRange] = useState<{from: string; to: string}>(()=>({ from: new Date(Date.now()-29*86400000).toISOString().slice(0,10), to: new Date().toISOString().slice(0,10) }));
  const days = useMemo(()=>{
    const out: string[] = []; const from = new Date(range.from); const to = new Date(range.to);
    for (let d=new Date(from); d<=to; d.setDate(d.getDate()+1)) out.push(new Date(d).toISOString().slice(0,10));
    return out;
  }, [range]);
  const revenue = days.map(()=> Math.floor(10 + Math.random()*40));
  const processedCount = revenue.reduce((a,b)=>a+(b>20?1:0),0);
  const processedSum = revenue.filter(v=>v>20).reduce((a,b)=>a+b,0) * 100000; // mock to sum
  const values = useMemo(()=> Object.fromEntries(days.map((d,i)=> [d, revenue[i]])), [days, revenue]);

  return (
    <div>
      <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12}}>
        <div style={{fontWeight:800, fontSize:18}}>Dashboard</div>
        <DateRange value={range} onChange={setRange} />
      </div>
      <div className={s.cardGrid}>
        <div className={s.kpi}><div style={{opacity:.7, fontSize:12}}>Обработано заявок</div><div style={{fontSize:24, fontWeight:800}}>{processedCount}</div></div>
        <div className={s.kpi}><div style={{opacity:.7, fontSize:12}}>Сумма обработанных</div><div style={{fontSize:24, fontWeight:800}}>{processedSum.toLocaleString()}</div></div>
        <div className={s.kpi}><div style={{opacity:.7, fontSize:12}}>Всего дней</div><div style={{fontSize:24, fontWeight:800}}>{days.length}</div></div>
        <div className={s.kpi}><div style={{opacity:.7, fontSize:12}}>Средний чек</div><div style={{fontSize:24, fontWeight:800}}>{(processedSum/Math.max(processedCount,1)).toLocaleString()}</div></div>
      </div>
      <div style={{marginTop:12}} className={s.panel}>
        <div style={{fontWeight:700, marginBottom:8}}>Календарь доходов (по дням)</div>
        <CalendarHeatmap
          from={range.from}
          to={range.to}
          values={values}
          cellSize={34}
          showDayNumbers={false}
          display="value"
          valueFormatter={(v)=> v.toLocaleString()}
          labelColWidth={48}
        />
        <div style={{marginTop:8, fontSize:12, color:'#64748b'}}>Сумма дохода за период: <strong>{processedSum.toLocaleString()}</strong></div>
      </div>
      <div style={{display:'grid', gridTemplateColumns:'1fr 360px', gap:12, marginTop:12}}>
        <div className={s.panel}>
          <div style={{fontWeight:700, marginBottom:8}}>Линейный график доходов</div>
          <LineChart series={[{ label:'Revenue', points: revenue, color:'#2563eb' }]} width={Math.max(640, days.length*16)} height={160} animate />
        </div>
        <div className={s.panel}>
          <div style={{fontWeight:700, marginBottom:8}}>Структура продаж</div>
          <PieChart animate innerRadius={60} data={[
            { label:'Категория A', value: 45 },
            { label:'Категория B', value: 25 },
            { label:'Категория C', value: 18 },
            { label:'Прочее', value: 12 },
          ]} />
        </div>
      </div>
    </div>
  );
}

