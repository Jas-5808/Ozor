import React, { useEffect, useState } from "react";

type AuditRecord = {
  id: string;
  ts: number;
  actor: string;
  action: string;
  entity?: string;
  payload?: any;
};

export default function Audit() {
  const [items, setItems] = useState<AuditRecord[]>(() => {
    try {
      return JSON.parse(localStorage.getItem("admin_audit") || "[]");
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem("admin_audit", JSON.stringify(items));
    } catch {
      // ignore
    }
  }, [items]);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="mb-3 text-sm font-bold text-slate-900">Audit log</div>

      <div className="overflow-x-auto">
        <table className="w-full overflow-hidden rounded-2xl border border-slate-200 bg-white">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-3 py-3 text-center">Time</th>
              <th className="px-3 py-3 text-center">Actor</th>
              <th className="px-3 py-3 text-center">Action</th>
              <th className="px-3 py-3 text-center">Entity</th>
            </tr>
          </thead>

          <tbody className="text-sm">
            {items
              .slice()
              .reverse()
              .map((r, idx) => (
                <tr
                  key={r.id}
                  className={[
                    "border-t border-slate-200",
                    idx % 2 === 1 ? "bg-slate-50/40" : "",
                    "hover:bg-slate-50",
                  ].join(" ")}
                >
                  <td className="px-3 py-3 text-center">
                    {new Date(r.ts).toLocaleString()}
                  </td>
                  <td className="px-3 py-3 text-center">{r.actor}</td>
                  <td className="px-3 py-3 text-center">{r.action}</td>
                  <td className="px-3 py-3 text-center">{r.entity || "—"}</td>
                </tr>
              ))}

            {items.length === 0 && (
              <tr className="border-t border-slate-200">
                <td colSpan={4} className="px-3 py-6 text-center text-slate-500">
                  No audit records
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
