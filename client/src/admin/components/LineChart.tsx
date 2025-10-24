import React from 'react';

interface Props {
  series: Array<{ label: string; points: number[]; color?: string }>;
  width?: number;
  height?: number;
  animate?: boolean;
}

export default function LineChart({ series, width = 520, height = 56, animate = false }: Props) {
  const maxPoints = Math.max(...series.map(s => s.points.length), 0);
  const maxVal = Math.max(...series.flatMap(s => s.points), 1);
  const stepX = width / Math.max(maxPoints - 1, 1);
  const mapY = (v: number) => height - (v / maxVal) * (height - 8) - 4;
  const pathLength = 1000;
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden>
      {animate ? (
        <style>{`@keyframes dash { from { stroke-dashoffset: ${pathLength}; } to { stroke-dashoffset: 0; } }`}</style>
      ) : null}
      {series.map((s, idx) => {
        const pts = s.points.map((v, i) => `${i * stepX},${mapY(v)}`).join(' ');
        const common = animate ? { pathLength, style: { strokeDasharray: pathLength, strokeDashoffset: pathLength, animation: `dash 1200ms ease-out ${idx*120}ms forwards` } as React.CSSProperties } : {};
        return <polyline key={idx} fill="none" stroke={s.color || '#2563eb'} strokeWidth={2} points={pts} {...common} />;
      })}
    </svg>
  );
}

