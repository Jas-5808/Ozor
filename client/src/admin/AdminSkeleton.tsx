import React from 'react';

type Props = { rows?: number };

export default function AdminSkeleton({ rows = 8 }: Props) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <div className="h-4 w-40 rounded bg-slate-200 animate-pulse" />
        <div className="flex gap-2">
          <div className="h-8 w-28 rounded-lg bg-slate-200 animate-pulse" />
          <div className="h-8 w-28 rounded-lg bg-slate-200 animate-pulse" />
        </div>
      </div>
      <div className="overflow-hidden rounded-xl border border-slate-200">
        <table className="w-full border-collapse text-left">
          <thead className="bg-slate-100">
            <tr>
              {Array.from({ length: 5 }).map((_, idx) => (
                <th key={idx} className="h-10 px-3" />
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: rows }).map((_, i) => (
              <tr key={i} className="even:bg-slate-50">
                {Array.from({ length: 5 }).map((_, j) => (
                  <td key={j} className="px-3 py-2">
                    <div className="h-4 rounded bg-slate-200 animate-pulse" />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}