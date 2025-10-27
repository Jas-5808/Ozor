import React from 'react';
// @ts-ignore
import s from './AdminLayout.module.scss';

type Props = { rows?: number };

export default function AdminSkeleton({ rows = 8 }: Props) {
  return (
    <div className={s.panel}>
      <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12}}>
        <div style={{width:160, height:16, background:'#e5e7eb', borderRadius:6}} />
        <div style={{display:'flex', gap:8}}>
          <div style={{width:120, height:32, background:'#e5e7eb', borderRadius:8}} />
          <div style={{width:120, height:32, background:'#e5e7eb', borderRadius:8}} />
        </div>
      </div>
      <table className={s.table}>
        <thead>
          <tr>
            <th></th><th></th><th></th><th></th><th></th>
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }).map((_, i) => (
            <tr key={i}>
              <td><div style={{height:14, background:'#e5e7eb', borderRadius:6}} /></td>
              <td><div style={{height:14, background:'#e5e7eb', borderRadius:6}} /></td>
              <td><div style={{height:14, background:'#e5e7eb', borderRadius:6}} /></td>
              <td><div style={{height:14, background:'#e5e7eb', borderRadius:6}} /></td>
              <td><div style={{height:14, background:'#e5e7eb', borderRadius:6}} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}


