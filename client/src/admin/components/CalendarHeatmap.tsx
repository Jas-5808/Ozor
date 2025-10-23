import React, { useMemo } from 'react';

interface Props {
  from: string; // YYYY-MM-DD
  to: string;   // YYYY-MM-DD
  values: Record<string, number>; // date -> value
  cellSize?: number;
  showDayNumbers?: boolean;
  display?: 'day' | 'value';
  valueFormatter?: (v: number) => string;
  labelColWidth?: number;
}

function getWeeks(from: Date, to: Date) {
  const start = new Date(from);
  start.setDate(start.getDate() - ((start.getDay()+6)%7)); // back to Monday
  const end = new Date(to);
  const weeks: Date[][] = [];
  for (let d = new Date(start); d <= end; d.setDate(d.getDate()+7)) {
    const week: Date[] = [];
    for (let i=0;i<7;i++) {
      const day = new Date(d); day.setDate(d.getDate()+i);
      week.push(new Date(day));
    }
    weeks.push(week);
  }
  return weeks;
}

function colorFor(v: number) {
  if (v <= 0) return '#e5e7eb';
  if (v < 5) return '#bbf7d0';
  if (v < 10) return '#86efac';
  if (v < 20) return '#4ade80';
  return '#22c55e';
}

function monthShort(d: Date) {
  return d.toLocaleString(undefined, { month: 'short' });
}

export default function CalendarHeatmap({ from, to, values, cellSize = 22, showDayNumbers = true, display = 'day', valueFormatter, labelColWidth = 36 }: Props) {
  const fromDate = new Date(from);
  const toDate = new Date(to);
  const weeks = useMemo(()=> getWeeks(fromDate, toDate), [from, to]);
  const weekDays = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
  const gap = 4;
  // Month labels for each week (use Wednesday as representative day)
  const monthLabels = useMemo(()=> weeks.map(w => monthShort(new Date(w[2]))), [weeks]);
  const monthDisplay = monthLabels.map((m, i) => (i === 0 || m !== monthLabels[i-1]) ? m : '');
  return (
    <div>
      {/* Month header */}
      <div style={{display:'grid', gridTemplateColumns: `${labelColWidth}px repeat(${weeks.length}, ${cellSize}px)`, gap, alignItems:'end', marginBottom:6}}>
        <div />
        {weeks.map((_, i) => (
          <div key={`mh-${i}`} style={{fontSize:12, color:'#475569', textAlign:'center'}}>{monthDisplay[i]}</div>
        ))}
      </div>
      {/* Heatmap grid with weekdays */}
      <div style={{display:'grid', gridTemplateColumns:`${labelColWidth}px repeat(${weeks.length}, ${cellSize}px)`, gap, alignItems:'center'}}>
        {weekDays.map((wd, r)=> (
          <React.Fragment key={wd}>
            <div style={{fontSize:12, color:'#64748b'}}>{wd}</div>
            {weeks.map((w, c)=> {
              const date = w[r];
              const iso = date.toISOString().slice(0,10);
              const v = values[iso] || 0;
              const dayNum = date.getDate();
              const text = display === 'value' ? (valueFormatter ? valueFormatter(v) : String(v)) : String(dayNum);
              const fontSize = Math.max(10, Math.floor(cellSize / 3));
              return (
                <div key={`${c}-${r}`} title={`${iso}: ${v}`}
                  style={{
                    width: cellSize,
                    height: cellSize,
                    borderRadius: 6,
                    background: colorFor(v),
                    display:'grid', placeItems:'center',
                    color: '#0f172a',
                    fontSize,
                    fontWeight: 700,
                    userSelect: 'none'
                  }}>
                  {display === 'value' ? <span style={{opacity:.85}}>{text}</span> : (showDayNumbers ? <span style={{opacity:.7}}>{dayNum}</span> : null)}
                </div>
              );
            })}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}

