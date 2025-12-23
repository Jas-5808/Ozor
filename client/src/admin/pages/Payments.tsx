import React, { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import apiClient from "../../services/api";
import { formatPrice, getProductImageUrl } from "../../utils/helpers";

type Statement = {
  id: string;
  user_id: string | null;
  card_holder_name: string;
  card_number: string;
  amount: number;
  type: "approved" | "pending" | "rejected" | string;
  description?: string;
  image?: string | null;
  created_at: string;
  updated_at: string;
};

const statusBadge = (type: Statement["type"]) => {
  switch (String(type).toLowerCase()) {
    case "approved":
      return "bg-emerald-100 text-emerald-700";
    case "pending":
      return "bg-amber-100 text-amber-700";
    case "rejected":
      return "bg-rose-100 text-rose-700";
    default:
      return "bg-slate-100 text-slate-700";
  }
};

export default function Payments() {
  const { t } = useTranslation();
  const [items, setItems] = useState<Statement[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [status, setStatus] = useState<string>("");
  const [offset, setOffset] = useState(0);
  const [limit, setLimit] = useState(10);
  const [total, setTotal] = useState(0);
  const [sortAsc, setSortAsc] = useState(false);

  const paged = useMemo(() => {
    const filtered = status
      ? items.filter((i) => String(i.type).toLowerCase() === status)
      : items;
    const sorted = [...filtered].sort((a, b) => {
      const aDate = new Date(a.created_at).getTime();
      const bDate = new Date(b.created_at).getTime();
      return sortAsc ? aDate - bDate : bDate - aDate;
    });
    return sorted;
  }, [items, status, sortAsc]);

  const load = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await apiClient.get("/payment/statements", { params: { offset, limit } });
      const data = (res?.data?.items || res?.data || []) as Statement[];
      const totalVal = (res?.data?.total as number) ?? data.length;
      setItems(data);
      setTotal(totalVal);
    } catch (e: any) {
      setError(e?.response?.data?.message || e?.message || "Failed to load");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [offset, limit]);

  const handleUpdate = async (statement: Statement, next: { type?: string; description?: string; image_file?: File | null }) => {
    const form = new FormData();
    if (next.type) form.append("type", next.type);
    form.append("description", (next.description ?? "").trim() || "string");
    if (next.image_file) form.append("image_file", next.image_file);

    await apiClient.put(`/payment/statements/${statement.id}`, form, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    await load();
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-lg font-black text-slate-900">{t("admin.payments.title", "Платежные поручения")}</div>
          <div className="text-xs text-slate-500">{t("admin.payments.subtitle", "Управление выплатами и статусами")}</div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            className="h-9 rounded-xl border border-slate-200 bg-white px-3 text-sm"
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setOffset(0);
            }}
          >
            <option value="">{t("admin.payments.filters.statusAll", "Все статусы")}</option>
            <option value="pending">{t("admin.payments.status.pending", "В ожидании")}</option>
            <option value="approved">{t("admin.payments.status.approved", "Подтверждено")}</option>
            <option value="rejected">{t("admin.payments.status.rejected", "Отклонено")}</option>
          </select>

          <select
            className="h-9 rounded-xl border border-slate-200 bg-white px-3 text-sm"
            value={limit}
            onChange={(e) => {
              setOffset(0);
              setLimit(Number(e.target.value) || 10);
            }}
          >
            {[10, 20, 50, 100].map((v) => (
              <option key={v} value={v}>
                {v} / page
              </option>
            ))}
          </select>

          <button
            className="h-9 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 hover:bg-slate-50"
            onClick={() => setSortAsc((s) => !s)}
          >
            {sortAsc ? t("admin.payments.sort.oldFirst", "Старые сначала") : t("admin.payments.sort.newFirst", "Новые сначала")}
          </button>
        </div>
      </div>

      {loading && <div className="text-sm text-slate-500">{t("common.loading") || "Загрузка..."}</div>}
      {error && <div className="text-sm text-rose-600">{error}</div>}

      {!loading && !error && (
        <div className="overflow-x-auto">
          <table className="w-full overflow-hidden rounded-2xl border border-slate-200 bg-white text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-3 py-3 text-left">ID</th>
                <th className="px-3 py-3 text-left">{t("admin.payments.table.amount", "Сумма")}</th>
                <th className="px-3 py-3 text-left">{t("admin.payments.table.card", "Карта")}</th>
                <th className="px-3 py-3 text-left">{t("admin.payments.table.holder", "Держатель")}</th>
                <th className="px-3 py-3 text-left">{t("admin.payments.table.status", "Статус")}</th>
                <th className="px-3 py-3 text-left">{t("admin.payments.table.description", "Описание")}</th>
                <th className="px-3 py-3 text-left">{t("admin.payments.table.image", "Картинка")}</th>
                <th className="px-3 py-3 text-left">{t("admin.payments.table.actions", "Действия")}</th>
              </tr>
            </thead>
            <tbody>
              {paged.map((s) => (
                <tr key={s.id} className="border-t border-slate-200 hover:bg-slate-50">
                  <td className="px-3 py-3 text-left text-slate-500">{s.id.slice(0, 8)}</td>
                  <td className="px-3 py-3 font-semibold text-slate-900">{formatPrice(s.amount, "UZS")}</td>
                  <td className="px-3 py-3 text-slate-700">**** {s.card_number.slice(-4)}</td>
                  <td className="px-3 py-3 text-slate-700">{s.card_holder_name || "—"}</td>
                  <td className="px-3 py-3">
                    <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-semibold ${statusBadge(s.type)}`}>
                      {t(`admin.payments.status.${s.type}`, s.type)}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-slate-600">{s.type === "pending" && s.description === "string" ? "—" : s.description || "—"}</td>
                  <td className="px-3 py-3">
                    {s.image ? (
                      <img
                        src={getProductImageUrl(s.image)}
                        alt="proof"
                        className="h-14 w-14 rounded-lg object-cover border border-slate-200"
                      />
                    ) : (
                      <span className="text-xs text-slate-400">—</span>
                    )}
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex flex-col gap-2">
                      <select
                        className="h-9 rounded-xl border border-slate-200 bg-white px-3 text-xs"
                        value={s.type}
                        onChange={async (e) => {
                          await handleUpdate(s, { type: e.target.value, description: s.description });
                        }}
                      >
                        <option value="pending">{t("admin.payments.status.pending", "В ожидании")}</option>
                        <option value="approved">{t("admin.payments.status.approved", "Подтверждено")}</option>
                        <option value="rejected">{t("admin.payments.status.rejected", "Отклонено")}</option>
                      </select>

                      <input
                        className="h-9 rounded-xl border border-slate-200 bg-white px-3 text-xs"
                        placeholder={t("admin.payments.table.description", "Описание")}
                        defaultValue={s.description === "string" ? "" : s.description}
                        onBlur={async (e) => {
                          const value = e.target.value.trim();
                          await handleUpdate(s, { type: s.type, description: value || "string" });
                        }}
                      />

                      <input
                        type="file"
                        accept="image/*"
                        className="text-xs"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            await handleUpdate(s, { type: s.type, description: s.description, image_file: file });
                            e.target.value = "";
                          }
                        }}
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-sm text-slate-600">
        <div>
          {t("admin.payments.pagination", {
            defaultValue: "Страница {{page}} из {{pages}}",
            page: Math.floor(offset / limit) + 1,
            pages: Math.max(1, Math.ceil(total / limit)),
          })}
        </div>
        <div className="flex items-center gap-2">
          <button
            className="h-9 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            disabled={offset <= 0 || loading}
            onClick={() => setOffset((o) => Math.max(0, o - limit))}
          >
            {t("admin.ordersPage.pagination.prev", "Prev")}
          </button>
          <button
            className="h-9 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            disabled={offset + limit >= total || loading}
            onClick={() => setOffset((o) => o + limit)}
          >
            {t("admin.ordersPage.pagination.next", "Next")}
          </button>
        </div>
      </div>
    </div>
  );
}

