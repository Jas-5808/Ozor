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
    <div className="space-y-1">
      {/* Month header */}
      <div
        className="grid items-end"
        style={{
          gridTemplateColumns: `${labelColWidth}px repeat(${weeks.length}, ${cellSize}px)`,
          gap,
        }}
      >
        <div />
        {weeks.map((_, i) => (
          <div
            key={`mh-${i}`}
            className="text-center text-[12px] text-slate-600"
          >
            {monthDisplay[i]}
          </div>
        ))}
      </div>

      {/* Heatmap grid with weekdays */}
      <div
        className="grid items-center"
        style={{
          gridTemplateColumns: `${labelColWidth}px repeat(${weeks.length}, ${cellSize}px)`,
          gap,
        }}
      >
        {weekDays.map((wd, r) => (
          <React.Fragment key={wd}>
            <div className="text-[12px] text-slate-500">{wd}</div>
            {weeks.map((w, c) => {
              const date = w[r];
              const iso = date.toISOString().slice(0, 10);
              const v = values[iso] || 0;
              const dayNum = date.getDate();
              const text =
                display === 'value'
                  ? valueFormatter
                    ? valueFormatter(v)
                    : String(v)
                  : String(dayNum);
              const fontSize = Math.max(10, Math.floor(cellSize / 3));
              return (
                <div
                  key={`${c}-${r}`}
                  title={`${iso}: ${v}`}
                  className="grid place-items-center rounded-[6px] font-bold text-slate-900 select-none"
                  style={{
                    width: cellSize,
                    height: cellSize,
                    background: colorFor(v),
                    fontSize,
                  }}
                >
                  {display === 'value' ? (
                    <span className="opacity-85">{text}</span>
                  ) : showDayNumbers ? (
                    <span className="opacity-70">{dayNum}</span>
                  ) : null}
                </div>
              );
            })}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}

