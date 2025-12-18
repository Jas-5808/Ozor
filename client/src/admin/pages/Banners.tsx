import React, { useEffect, useState } from "react";
import { adminStore } from "../storage";

type Banner = { id: string; title: string; imageUrl: string; link?: string };

const inputBase =
  "h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100";
const btnBase =
  "inline-flex items-center justify-center rounded-xl px-4 font-semibold transition disabled:cursor-not-allowed disabled:opacity-60";
const btnPrimary = "h-10 bg-blue-600 text-white shadow-sm hover:bg-blue-700";
const btnDanger = "h-9 bg-red-600 text-white shadow-sm hover:bg-red-700";
const linkCls = "text-blue-600 underline underline-offset-2 hover:text-blue-700";

export default function Banners() {
  const [items, setItems] = useState<Banner[]>(
    adminStore.load<Banner[]>("admin_banners", [])
  );
  const [title, setTitle] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [link, setLink] = useState("");

  const addItem = () => {
    if (!title.trim() || !imageUrl.trim()) return;
    const b: Banner = {
      id: Math.random().toString(36).slice(2),
      title: title.trim(),
      imageUrl: imageUrl.trim(),
      link: link.trim() ? link.trim() : undefined,
    };
    setItems([b, ...items]);
    setTitle("");
    setImageUrl("");
    setLink("");
  };

  const removeItem = (id: string) => setItems(items.filter((i) => i.id !== id));

  useEffect(() => {
    adminStore.save("admin_banners", items);
  }, [items]);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="mb-3 text-sm font-bold text-slate-900">Banners</div>

      <div className="mb-3 grid gap-2">
        <input
          className={inputBase}
          placeholder="Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <input
          className={inputBase}
          placeholder="Image URL"
          value={imageUrl}
          onChange={(e) => setImageUrl(e.target.value)}
        />
        <input
          className={inputBase}
          placeholder="Link (optional)"
          value={link}
          onChange={(e) => setLink(e.target.value)}
        />

        <div className="flex gap-2">
          <button className={btnBase + " " + btnPrimary} onClick={addItem}>
            Add banner
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full overflow-hidden rounded-2xl border border-slate-200 bg-white">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-3 py-3 text-center">Title</th>
              <th className="px-3 py-3 text-center">Image</th>
              <th className="px-3 py-3 text-center">Link</th>
              <th className="px-3 py-3 text-center"></th>
            </tr>
          </thead>
          <tbody className="text-sm">
            {items.map((i, idx) => (
              <tr
                key={i.id}
                className={[
                  "border-t border-slate-200",
                  idx % 2 === 1 ? "bg-slate-50/40" : "",
                  "hover:bg-slate-50",
                ].join(" ")}
              >
                <td className="px-3 py-3 text-center">{i.title}</td>
                <td className="px-3 py-3 text-center">
                  <a
                    className={linkCls}
                    href={i.imageUrl}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Open
                  </a>
                </td>
                <td className="px-3 py-3 text-center">{i.link || "—"}</td>
                <td className="px-3 py-3 text-center">
                  <button
                    className={btnBase + " " + btnDanger}
                    onClick={() => removeItem(i.id)}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}

            {items.length === 0 && (
              <tr className="border-t border-slate-200">
                <td colSpan={4} className="px-3 py-6 text-center text-slate-500">
                  No banners yet
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
