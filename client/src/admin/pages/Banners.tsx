import React, { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { adminStore } from "../storage";

type Banner = { id: string; title: string; imageUrl: string; link?: string };

const inputBase =
  "h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100";
const btnBase =
  "inline-flex items-center justify-center rounded-xl px-4 font-semibold transition disabled:cursor-not-allowed disabled:opacity-60";
const btnPrimary = "h-10 bg-emerald-600 text-white shadow-sm hover:bg-emerald-700";
const btnDanger = "h-9 bg-red-600 text-white shadow-sm hover:bg-red-700";
const linkCls = "text-emerald-600 underline underline-offset-2 hover:text-emerald-700";

export default function Banners() {
  const { t } = useTranslation();
  const [items, setItems] = useState<Banner[]>(
    adminStore.load<Banner[]>("admin_banners", [])
  );
  const [title, setTitle] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [link, setLink] = useState("");
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (i) =>
        i.title.toLowerCase().includes(q) ||
        (i.link || "").toLowerCase().includes(q)
    );
  }, [items, search]);

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
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-xl font-extrabold text-slate-900">
          {t("admin.bannersPage.title")}
        </h1>
        <input
          className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-900 outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 sm:w-64"
          placeholder={t("admin.bannersPage.searchPlaceholder")}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="mb-3 grid gap-2">
        <input
          className={inputBase}
          placeholder={t("admin.bannersPage.form.titlePlaceholder")}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <input
          className={inputBase}
          placeholder={t("admin.bannersPage.form.imagePlaceholder")}
          value={imageUrl}
          onChange={(e) => setImageUrl(e.target.value)}
        />
        <input
          className={inputBase}
          placeholder={t("admin.bannersPage.form.linkPlaceholder")}
          value={link}
          onChange={(e) => setLink(e.target.value)}
        />

        <div className="flex gap-2">
          <button
            className={btnBase + " " + btnPrimary}
            onClick={addItem}
            disabled={!title.trim() || !imageUrl.trim()}
          >
            {t("admin.bannersPage.form.submit")}
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full overflow-hidden rounded-2xl border border-slate-200 bg-white">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-3 py-3 text-center">{t("admin.bannersPage.table.title")}</th>
              <th className="px-3 py-3 text-center">{t("admin.bannersPage.table.image")}</th>
              <th className="px-3 py-3 text-center">{t("admin.bannersPage.table.link")}</th>
              <th className="px-3 py-3 text-center"></th>
            </tr>
          </thead>
          <tbody className="text-sm">
            {filtered.map((i, idx) => (
              <tr
                key={i.id}
                className={[
                  "border-t border-slate-200",
                  idx % 2 === 1 ? "bg-slate-50/40" : "",
                  "hover:bg-emerald-50/30 transition-colors",
                ].join(" ")}
              >
                <td className="px-3 py-3 text-center font-medium text-slate-900">{i.title}</td>
                <td className="px-3 py-3 text-center">
                  <a
                    className={linkCls}
                    href={i.imageUrl}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {t("admin.bannersPage.table.open")}
                  </a>
                </td>
                <td className="px-3 py-3 text-center text-slate-600">{i.link || "—"}</td>
                <td className="px-3 py-3 text-center">
                  <button
                    className={btnBase + " " + btnDanger}
                    onClick={() => removeItem(i.id)}
                  >
                    {t("admin.bannersPage.table.delete")}
                  </button>
                </td>
              </tr>
            ))}

            {filtered.length === 0 && (
              <tr className="border-t border-slate-200">
                <td colSpan={4} className="px-3 py-6 text-center text-slate-500">
                  {items.length === 0
                    ? t("admin.bannersPage.empty")
                    : t("admin.bannersPage.noResults")}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
