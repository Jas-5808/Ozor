import React from 'react';

interface Props {
  value: { from: string; to: string };
  onChange: (v: { from: string; to: string }) => void;
}

export default function DateRange({ value, onChange }: Props) {
  return (
    <div style={{display:'inline-flex', alignItems:'center', gap:8}}>
      <input type="date" value={value.from} onChange={(e)=>onChange({ from: e.target.value, to: value.to })} />
      <span>—</span>
      <input type="date" value={value.to} onChange={(e)=>onChange({ from: value.from, to: e.target.value })} />
    </div>
  );
}

