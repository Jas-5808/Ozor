import React from 'react';

interface Slice { label: string; value: number; color?: string }
interface Props { data: Slice[]; size?: number; innerRadius?: number; animate?: boolean }

export default function PieChart({ data, size = 180, innerRadius = 0, animate = false }: Props) {
  const total = data.reduce((a,b)=>a+b.value,0) || 1;
  const r = size/2;
  const ir = innerRadius;
  let angle = -Math.PI/2; // start at top
  const pathLen = 1000;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {animate ? (<style>{`@keyframes spinIn { from { transform: rotate(-20deg); opacity:.5; } to { transform: rotate(0); opacity:1; } }`}</style>) : null}
      {data.map((s, i) => {
        const a = (s.value/total) * Math.PI * 2;
        const x1 = r + Math.cos(angle) * r, y1 = r + Math.sin(angle) * r;
        const x2 = r + Math.cos(angle + a) * r, y2 = r + Math.sin(angle + a) * r;
        const large = a > Math.PI ? 1 : 0;
        const outerArc = `M ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2}`;
        let d = '';
        if (ir > 0) {
          const xi1 = r + Math.cos(angle + a) * ir, yi1 = r + Math.sin(angle + a) * ir;
          const xi2 = r + Math.cos(angle) * ir, yi2 = r + Math.sin(angle) * ir;
          const innerArc = `L ${xi1} ${yi1} A ${ir} ${ir} 0 ${large} 0 ${xi2} ${yi2} Z`;
          d = outerArc + ' ' + innerArc;
        } else {
          d = outerArc + ` L ${r} ${r} Z`;
        }
        const el = (
          <path key={i} d={d} fill={s.color || ['#3b82f6','#22c55e','#f59e0b','#ef4444','#8b5cf6'][i%5]}
            style={animate ? { transformOrigin: `${r}px ${r}px`, animation: `spinIn 600ms ease ${i*80}ms both` } : undefined} />
        );
        angle += a;
        return el;
      })}
    </svg>
  );
}

