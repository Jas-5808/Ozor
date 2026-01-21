import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import apiClient, { userAPI } from "../../services/api";
import { formatPrice, getProductImageUrl } from "../../utils/helpers";
import { useAuth } from "../../hooks/useAuth";

type Statement = {
  id: string;
  user_id: string | null;
  card_holder_name: string;
  card_number: string;
  amount: number;
  status: "approved" | "pending" | "rejected" | string;
  description?: string;
  image?: string | null;
  created_at: string;
  updated_at: string;
};

const statusBadge = (status: Statement["status"]) => {
  switch (String(status).toLowerCase()) {
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

const resolvePaymentImageUrl = (imagePath: string) => {
  const url = getProductImageUrl(imagePath);
  return url
    .replace("https://lab.ozar.uz/media/", "https://api.ozar.uz/media/")
    .replace("http://lab.ozar.uz/media/", "https://api.ozar.uz/media/");
};

export default function Payments() {
  const { t } = useTranslation();
  const { profile } = useAuth() as any;
  const roleRaw = String(profile?.role || profile?.user_role || profile?.data?.role || "").toLowerCase();
  const [roleState, setRoleState] = useState<string>(roleRaw || "");
  const normalizedRole = roleState === "sale_operator" ? "sale" : roleState;
  const hasAccess = normalizedRole === "admin" || normalizedRole === "ceo" || normalizedRole === "seo";
  const roleReady = Boolean(roleState || roleRaw);
  const [items, setItems] = useState<Statement[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [status, setStatus] = useState<string>("");
  const [offset, setOffset] = useState(0);
  const [limit, setLimit] = useState(10);
  const [total, setTotal] = useState(0);
  const [sortAsc, setSortAsc] = useState(false);
  const [drafts, setDrafts] = useState<
    Record<string, { status?: string; description?: string; file?: File | null }>
  >({});

  const paged = useMemo(() => {
    const filtered = status
      ? items.filter((i) => String(i.status).toLowerCase() === status)
      : items;
    const sorted = [...filtered].sort((a, b) => {
      const aDate = new Date(a.created_at).getTime();
      const bDate = new Date(b.created_at).getTime();
      return sortAsc ? aDate - bDate : bDate - aDate;
    });
    return sorted;
  }, [items, status, sortAsc]);

  const load = async () => {
    if (!hasAccess) {
      setItems([]);
      setTotal(0);
      return;
    }
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
    let ignore = false;
    const resolveRole = async () => {
      if (roleState) return;
      const uid = profile?.id || profile?.user_id || profile?.data?.id;
      if (!uid) return;
      try {
        const info = await userAPI.getUsersInfo();
        const infoData = (info as any)?.data;
        const roleFromInfo = String(infoData?.role || infoData?.user_role || "").toLowerCase();
        if (!ignore && roleFromInfo) {
          setRoleState(roleFromInfo);
          return;
        }
        const res = await userAPI.getUserById(String(uid));
        const resData = (res as any)?.data;
        const apiRole = String(resData?.role || resData?.user_role || "").toLowerCase();
        if (!ignore) setRoleState(apiRole);
      } catch {
        if (!ignore) setRoleState("");
      }
    };
    resolveRole();
    return () => {
      ignore = true;
    };
  }, [profile, roleState]);

  useEffect(() => {
    load();
  }, [offset, limit, hasAccess]);

  if (!roleReady) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-500">
        Loading...
      </div>
    );
  }

  if (!hasAccess) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-700">
        Access denied.
      </div>
    );
  }

  const handleUpdate = async (
    statement: Statement,
    next: { type?: string; description?: string; image_file?: File | null }
  ) => {
    const form = new FormData();
    if (next.type) form.append("status", next.type);
    form.append("description", (next.description ?? "").trim() || "string");
    if (next.image_file) form.append("image_file", next.image_file);

    await apiClient.put(`/payment/statements/${statement.id}`, form, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    await load();
  };

  const updateDraft = (
    id: string,
    patch: Partial<{ status?: string; description?: string; file?: File | null }>
  ) => {
    setDrafts((prev) => ({
      ...prev,
      [id]: { ...prev[id], ...patch },
    }));
  };

  const clearDraft = (id: string) => {
    setDrafts((prev) => {
      if (!prev[id]) return prev;
      const next = { ...prev };
      delete next[id];
      return next;
    });
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
          <table className="w-full overflow-hidden rounded-2xl border border-slate-200 bg-white text-xs">
            <thead className="bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-2 py-2 text-left">ID</th>
                <th className="px-2 py-2 text-left">{t("admin.payments.table.amount", "Сумма")}</th>
                <th className="px-2 py-2 text-left">{t("admin.payments.table.card", "Карта")}</th>
                <th className="px-2 py-2 text-left">{t("admin.payments.table.holder", "Держатель")}</th>
                <th className="px-2 py-2 text-left">{t("admin.payments.table.status", "Статус")}</th>
                <th className="px-2 py-2 text-left">{t("admin.payments.table.description", "Описание")}</th>
                <th className="px-2 py-2 text-left">{t("admin.payments.table.image", "Картинка")}</th>
                <th className="px-2 py-2 text-left">{t("admin.payments.table.actions", "Действия")}</th>
              </tr>
            </thead>
            <tbody>
              {paged.map((s) => {
                const draft = drafts[s.id] || {};
                const statusValue = draft.status ?? s.status;
                const descriptionValue =
                  draft.description ?? (s.description === "string" ? "" : s.description || "");
                const fileLabel = draft.file?.name || t("admin.payments.upload.noFile", "Файл не выбран");
                return (
                <tr key={s.id} className="border-t border-slate-200 hover:bg-slate-50">
                  <td className="px-2 py-2 text-left text-[11px] text-slate-500">{s.id.slice(0, 8)}</td>
                  <td className="px-2 py-2 font-semibold text-slate-900">{formatPrice(s.amount, "UZS")}</td>
                  <td className="px-2 py-2 text-slate-700">**** {s.card_number.slice(-4)}</td>
                  <td className="px-2 py-2 text-slate-700">{s.card_holder_name || "—"}</td>
                  <td className="px-2 py-2">
                    <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-semibold ${statusBadge(s.status)}`}>
                      {t(`admin.payments.status.${s.status}`, s.status)}
                    </span>
                  </td>
                  <td className="px-2 py-2 text-slate-600">{s.status === "pending" && s.description === "string" ? "—" : s.description || "—"}</td>
                  <td className="px-2 py-2">
                    {s.image ? (
                      <img
                        src={resolvePaymentImageUrl(s.image)}
                        alt="proof"
                        className="h-14 w-14 rounded-lg object-cover border border-slate-200"
                      />
                    ) : (
                      <span className="text-xs text-slate-400">—</span>
                    )}
                  </td>
                  <td className="px-2 py-2">
                    <div className="flex flex-col gap-1.5">
                      <div className="flex items-center gap-1.5">
                        <select
                          className="h-8 rounded-lg border border-slate-200 bg-white px-2 text-xs"
                          value={statusValue}
                          onChange={(e) => {
                            updateDraft(s.id, { status: e.target.value });
                          }}
                        >
                          <option value="pending">{t("admin.payments.status.pending", "В ожидании")}</option>
                          <option value="approved">{t("admin.payments.status.approved", "Подтверждено")}</option>
                          <option value="rejected">{t("admin.payments.status.rejected", "Отклонено")}</option>
                        </select>

                        <input
                          className="h-8 flex-1 rounded-lg border border-slate-200 bg-white px-2 text-xs"
                          placeholder={t("admin.payments.table.description", "Описание")}
                          value={descriptionValue}
                          onChange={(e) => updateDraft(s.id, { description: e.target.value })}
                        />
                      </div>

                      <div className="flex items-center gap-1.5">
                        <div
                          className="flex-1 rounded-lg border border-dashed border-slate-200 bg-slate-50 px-2 py-2 text-[11px] text-slate-600"
                          onDragOver={(e) => e.preventDefault()}
                          onDrop={(e) => {
                            e.preventDefault();
                            const file = e.dataTransfer.files?.[0];
                            if (file) {
                              updateDraft(s.id, { file });
                            }
                          }}
                        >
                          <div className="flex flex-wrap items-center gap-1.5">
                            <label
                              htmlFor={`payment-file-${s.id}`}
                              className="cursor-pointer rounded-md border border-slate-200 bg-white px-2 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-50"
                            >
                              {t("admin.payments.upload.button", "Загрузить фото")}
                            </label>
                            <span className="text-slate-500">{fileLabel}</span>
                            <span className="text-slate-400">{t("admin.payments.upload.hint", "или перетащите файл")}</span>
                          </div>
                          <input
                            id={`payment-file-${s.id}`}
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                updateDraft(s.id, { file });
                              }
                              e.target.value = "";
                            }}
                          />
                        </div>

                        <div className="flex items-center gap-1.5">
                          <button
                            className="h-8 rounded-lg bg-emerald-600 px-2.5 text-[11px] font-semibold text-white hover:bg-emerald-700"
                            onClick={async () => {
                              await handleUpdate(s, {
                                type: statusValue,
                                description: descriptionValue || "string",
                                image_file: draft.file ?? null,
                              });
                              clearDraft(s.id);
                            }}
                          >
                            {t("admin.payments.actions.send", "Отправить")}
                          </button>
                          <button
                            className="h-8 rounded-lg border border-slate-200 bg-white px-2.5 text-[11px] text-slate-600 hover:bg-slate-50"
                            onClick={() => clearDraft(s.id)}
                            type="button"
                          >
                            {t("common.cancel", "Сбросить")}
                          </button>
                        </div>
                      </div>
                    </div>
                  </td>
                </tr>
                );
              })}
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

