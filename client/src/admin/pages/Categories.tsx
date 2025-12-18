import React, { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { shopAPI } from "../../services/api";

type ApiCategory = {
  id: string;
  name: string;
  parent_id: string | null;
  parent_name: string | null;
  subcategories_count: number;
  products_count: number;
};

const inputBase =
  "h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100 disabled:cursor-not-allowed disabled:opacity-60";
const btnBase =
  "inline-flex items-center justify-center rounded-xl px-4 font-semibold transition disabled:cursor-not-allowed disabled:opacity-60";
const btnPrimary =
  "h-10 bg-indigo-600 text-white hover:bg-indigo-700";
const btnMuted =
  "h-[30px] w-[34px] bg-slate-200 text-slate-900 hover:bg-slate-300";
const tableWrap = "overflow-x-auto";
const tableCls =
  "w-full overflow-hidden rounded-2xl border border-slate-200 bg-white";
const thCls =
  "px-3 py-3 text-center text-xs uppercase tracking-wide text-slate-500 bg-slate-50";
const tdCls = "px-3 py-3 text-center text-sm text-slate-900";
const trHover = "hover:bg-slate-50";
const errorCls =
  "mb-3 rounded-2xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-900";

export default function Categories() {
  const { t } = useTranslation();

  const [items, setItems] = useState<ApiCategory[]>([]);
  const [name, setName] = useState("");
  const [parentId, setParentId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const canSubmit = useMemo(() => name.trim().length > 0, [name]);

  const load = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await shopAPI.getCategories(); // GET /shop/categories
      setItems(res.data?.data || res.data || []);
    } catch (e: any) {
      setError(
        e?.response?.data?.message ||
          e?.message ||
          t("admin.categoriesPage.form.errorLoad")
      );
    } finally {
      setLoading(false);
    }
  };

  const addItem = async () => {
    if (!canSubmit) return;
    try {
      setLoading(true);
      setError(null);
      await shopAPI.createCategory({
        name: name.trim(),
        parent_id: parentId || null,
      }); // POST /shop/category
      setName("");
      setParentId("");
      await load();
    } catch (e: any) {
      setError(
        e?.response?.data?.message ||
          e?.message ||
          t("admin.categoriesPage.form.errorCreate")
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const copyId = async (id: string) => {
    try {
      await navigator.clipboard.writeText(id);
      setCopied(id);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      // ignore
    }
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="mb-3 text-sm font-bold text-slate-900">
        {t("admin.categoriesPage.title")}
      </div>

      <div className="mb-3 grid gap-2 md:grid-cols-3">
        <input
          className={inputBase}
          placeholder={t("admin.categoriesPage.form.namePlaceholder")}
          value={name}
          onChange={(e) => setName(e.target.value)}
          disabled={loading}
        />
        <input
          className={inputBase}
          placeholder={t("admin.categoriesPage.form.parentPlaceholder")}
          value={parentId}
          onChange={(e) => setParentId(e.target.value)}
          disabled={loading}
        />
        <button
          className={btnBase + " " + btnPrimary}
          disabled={!canSubmit || loading}
          onClick={addItem}
        >
          {loading
            ? t("admin.categoriesPage.form.submitting")
            : t("admin.categoriesPage.form.submit")}
        </button>
      </div>

      {error && <div className={errorCls}>{error}</div>}

      <div className={tableWrap}>
        <table className={tableCls}>
          <thead>
            <tr>
              <th className={thCls}>{t("admin.categoriesPage.table.name")}</th>
              <th className={thCls}>{t("admin.categoriesPage.table.parent")}</th>
              <th className={thCls}>{t("admin.categoriesPage.table.subcats")}</th>
              <th className={thCls}>{t("admin.categoriesPage.table.products")}</th>
              <th className={thCls}>{t("admin.categoriesPage.table.id")}</th>
            </tr>
          </thead>

          <tbody>
            {items.map((i, idx) => (
              <tr
                key={i.id}
                className={[
                  "border-t border-slate-200",
                  idx % 2 === 1 ? "bg-slate-50/40" : "",
                  trHover,
                ].join(" ")}
              >
                <td className={tdCls}>{i.name}</td>
                <td className={tdCls}>{i.parent_name || i.parent_id || "—"}</td>
                <td className={tdCls}>{i.subcategories_count}</td>
                <td className={tdCls}>{i.products_count}</td>
                <td className={tdCls}>
                  <div className="grid place-items-center gap-1">
                    {copied === i.id ? (
                      <div
                        className="inline-flex h-[30px] w-[34px] items-center justify-center"
                        aria-live="polite"
                      >
                        <svg
                          width="22"
                          height="22"
                          viewBox="0 0 24 24"
                          fill="none"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <circle
                            cx="12"
                            cy="12"
                            r="10"
                            className="stroke-emerald-600"
                            strokeWidth="2"
                            fill="rgb(236 253 245)"
                          />
                          <path
                            d="M7 12l3 3 7-7"
                            className="stroke-emerald-600"
                            strokeWidth="2.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <animate
                              attributeName="stroke-dasharray"
                              from="0,30"
                              to="30,0"
                              dur="0.25s"
                              fill="freeze"
                            />
                          </path>
                          <animateTransform
                            attributeName="transform"
                            attributeType="XML"
                            type="scale"
                            from="0.8"
                            to="1"
                            dur="0.18s"
                            fill="freeze"
                          />
                        </svg>
                      </div>
                    ) : (
                      <button
                        className={btnBase + " " + btnMuted}
                        title={t("admin.categoriesPage.table.copyTitle")}
                        onClick={() => copyId(i.id)}
                        aria-label={t("admin.categoriesPage.table.copyAria")}
                        type="button"
                      >
                        <svg
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <rect
                            x="9"
                            y="9"
                            width="12"
                            height="12"
                            rx="2"
                            className="stroke-slate-700"
                            strokeWidth="2"
                          />
                          <rect
                            x="3"
                            y="3"
                            width="12"
                            height="12"
                            rx="2"
                            className="stroke-slate-700"
                            strokeWidth="2"
                          />
                        </svg>
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}

            {!loading && items.length === 0 && (
              <tr className="border-t border-slate-200">
                <td
                  colSpan={5}
                  className="px-3 py-8 text-center text-sm text-slate-500"
                >
                  —
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
