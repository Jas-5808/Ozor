import React, { useEffect, useState } from 'react';
// @ts-ignore
import s from '../AdminLayout.module.scss';

type AuditRecord = { id: string; ts: number; actor: string; action: string; entity?: string; payload?: any };

export default function Audit() {
  const [items, setItems] = useState<AuditRecord[]>(()=>{
    try { return JSON.parse(localStorage.getItem('admin_audit')||'[]'); } catch { return []; }
  });

  useEffect(()=>{ try { localStorage.setItem('admin_audit', JSON.stringify(items)); } catch {} }, [items]);

  return (
    <div className={s.panel}>
      <div style={{fontWeight:700, marginBottom:12}}>Audit log</div>
      <table className={s.table}>
        <thead>
          <tr><th>Time</th><th>Actor</th><th>Action</th><th>Entity</th></tr>
        </thead>
        <tbody>
          {items.slice().reverse().map(r => (
            <tr key={r.id}>
              <td>{new Date(r.ts).toLocaleString()}</td>
              <td>{r.actor}</td>
              <td>{r.action}</td>
              <td>{r.entity || '-'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

