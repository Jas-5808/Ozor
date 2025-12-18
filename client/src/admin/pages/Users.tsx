import React, { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { adminStore } from "../storage";
import { userAPI } from "../../services/api";

type User = {
  id: string;
  name: string;
  phone: string;
  role: string;
  email?: string;
  date_joined?: string;
  is_active?: boolean;
};

const ROLE_OPTIONS: Array<{ value: string; labelKey: string }> = [
  { value: "ceo", labelKey: "admin.usersPage.roles.ceo" },
  { value: "sale_manager", labelKey: "admin.usersPage.roles.sale_manager" },
  { value: "driver_manager", labelKey: "admin.usersPage.roles.driver_manager" },
  { value: "client", labelKey: "admin.usersPage.roles.client" },
  { value: "driver", labelKey: "admin.usersPage.roles.driver" },
  { value: "sale", labelKey: "admin.usersPage.roles.sale" },
  { value: "warehouse_manager", labelKey: "admin.usersPage.roles.warehouse_manager" },
  { value: "admin", labelKey: "admin.usersPage.roles.admin" },
];

const apiRoleToUiRole = (role: string): string => {
  const r = String(role || "").toLowerCase();
  if (["admin", "staff"].includes(r)) return "admin";
  if (r === "sale_operator") return "sale";
  return r;
};

const uiRoleToApiRole = (role: string): string => {
  const r = String(role || "").toLowerCase();
  if (r === "sale") return "sale";
  if (r === "admin") return "admin";
  return r;
};

const inputBase =
  "h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100 disabled:cursor-not-allowed disabled:opacity-60";
const btnBase =
  "inline-flex items-center justify-center rounded-xl px-4 font-semibold transition disabled:cursor-not-allowed disabled:opacity-60";
const btnMuted =
  "bg-slate-200 text-slate-900 hover:bg-slate-300";
const badgeBase =
  "inline-flex items-center rounded-full border px-2 py-1 text-xs font-semibold";
const badgeActive =
  "border-emerald-200 bg-emerald-50 text-emerald-800";
const badgeInactive =
  "border-slate-200 bg-slate-50 text-slate-600";

export default function Users() {
  const { t } = useTranslation();

  const [items, setItems] = useState<User[]>(
    adminStore.load<User[]>("admin_users", [])
  );
  const [q, setQ] = useState("");
  const [role, setRole] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [debouncedQ, setDebouncedQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [updatingRoleId, setUpdatingRoleId] = useState<string | null>(null);
  const [forbidden, setForbidden] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const filtered = useMemo(() => items, [items]);

  const getRoleLabel = (value: string) => {
    const opt = ROLE_OPTIONS.find((r) => r.value === value);
    return opt ? t(opt.labelKey) : value;
  };

  useEffect(() => {
    adminStore.save("admin_users", items);
  }, [items]);

  useEffect(() => {
    const id = setTimeout(() => setDebouncedQ(q), 1000);
    return () => clearTimeout(id);
  }, [q]);

  useEffect(() => {
    let ignore = false;

    const fetchUsers = async () => {
      try {
        setLoading(true);

        const params: any = { page, limit };
        if (role) params.role = uiRoleToApiRole(role);
        if (debouncedQ) params.search = debouncedQ;

        const res = await userAPI.listUsers(params);
        if (ignore) return;

        const payload = res.data || {};
        const data = payload.users || [];

        const normalized: User[] = data.map((u: any) => {
          const apiRole = String(u.role || "").toLowerCase();
          const mappedRole = apiRoleToUiRole(apiRole);

          return {
            id: u.id,
            name:
              `${u.first_name || ""} ${u.last_name || ""}`.trim() ||
              (u.username || u.email || u.phone_number || "User"),
            phone: u.phone_number || "",
            role: mappedRole,
            email: u.email || "",
            date_joined: u.date_joined,
            is_active: u.is_active,
          };
        });

        setForbidden(false);
        setErrorMsg(null);
        setItems(normalized);
        setTotalPages(payload.total_pages || 1);
      } catch (e: any) {
        if (!ignore && e?.response?.status === 403) {
          setForbidden(true);
          const msg =
            e?.response?.data?.detail ||
            e?.response?.data?.message ||
            t("admin.usersPage.errors.ceoOnly");
          setErrorMsg(msg);
          setItems([]);
          setTotalPages(1);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
    return () => {
      ignore = true;
    };
  }, [debouncedQ, role, page, limit, t]);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="text-sm font-bold text-slate-900">
          {t("admin.usersPage.title")}
        </div>

        <div className="flex flex-wrap gap-2">
          <input
            className={inputBase + " min-w-[220px]"}
            placeholder={t("admin.usersPage.filters.searchPlaceholder")}
            value={q}
            onChange={(e) => {
              setPage(1);
              setQ(e.target.value);
            }}
            disabled={forbidden}
          />

          <select
            className={inputBase + " w-[200px]"}
            value={role}
            onChange={(e) => {
              setPage(1);
              setRole(e.target.value);
            }}
            disabled={forbidden}
          >
            <option value="">{t("admin.usersPage.filters.roleAll")}</option>
            {ROLE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {t(opt.labelKey)}
              </option>
            ))}
          </select>

          <select
            className={inputBase + " w-[120px]"}
            value={limit}
            onChange={(e) => {
              setPage(1);
              setLimit(Number(e.target.value) || 10);
            }}
            disabled={forbidden}
          >
            <option value={10}>10</option>
            <option value={20}>20</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
        </div>
      </div>

      {errorMsg && (
        <div className="mb-3 rounded-2xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-900">
          {errorMsg}
        </div>
      )}

      {loading && (
        <div className="mb-2 text-xs text-slate-500">{t("common.loading")}</div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full overflow-hidden rounded-2xl border border-slate-200 bg-white">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-3 py-3 text-center">{t("admin.usersPage.table.name")}</th>
              <th className="px-3 py-3 text-center">{t("admin.usersPage.table.phone")}</th>
              <th className="px-3 py-3 text-center">{t("admin.usersPage.table.email")}</th>
              <th className="px-3 py-3 text-center">{t("admin.usersPage.table.joined")}</th>
              <th className="px-3 py-3 text-center">{t("admin.usersPage.table.status")}</th>
              <th className="px-3 py-3 text-center">{t("admin.usersPage.table.role")}</th>
              <th className="px-3 py-3 text-center">{t("admin.usersPage.table.actions")}</th>
            </tr>
          </thead>

          <tbody className="text-sm">
            {filtered.map((u, idx) => (
              <tr
                key={u.id}
                className={[
                  "border-t border-slate-200",
                  idx % 2 === 1 ? "bg-slate-50/40" : "",
                  "hover:bg-slate-50",
                ].join(" ")}
              >
                <td className="px-3 py-3 text-center">{u.name}</td>
                <td className="px-3 py-3 text-center">{u.phone}</td>
                <td className="px-3 py-3 text-center">{u.email || "—"}</td>
                <td className="px-3 py-3 text-center">
                  {u.date_joined ? new Date(u.date_joined).toLocaleString() : "—"}
                </td>
                <td className="px-3 py-3 text-center">
                  {u.is_active ? (
                    <span className={badgeBase + " " + badgeActive}>
                      {t("admin.usersPage.status.active")}
                    </span>
                  ) : (
                    <span className={badgeBase + " " + badgeInactive}>
                      {t("admin.usersPage.status.inactive")}
                    </span>
                  )}
                </td>
                <td className="px-3 py-3 text-center">{getRoleLabel(u.role)}</td>
                <td className="px-3 py-3 text-center">
                  <div className="flex justify-center">
                    <select
                      className={inputBase + " h-9 min-w-[160px]"}
                      value={u.role}
                      onChange={async (e) => {
                        const newRole = e.target.value;
                        try {
                          setUpdatingRoleId(u.id);
                          await userAPI.updateUserRole(u.id, uiRoleToApiRole(newRole));
                          setItems((prev) =>
                            prev.map((p) => (p.id === u.id ? { ...p, role: newRole } : p))
                          );
                        } catch {
                          // ignore
                        } finally {
                          setUpdatingRoleId(null);
                        }
                      }}
                      disabled={forbidden || updatingRoleId === u.id}
                    >
                      {ROLE_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {t(opt.labelKey)}
                        </option>
                      ))}
                    </select>
                  </div>
                </td>
              </tr>
            ))}

            {!loading && filtered.length === 0 && (
              <tr className="border-t border-slate-200">
                <td colSpan={7} className="px-3 py-8 text-center text-sm text-slate-500">
                  —
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-3 flex items-center justify-between gap-2">
        <div className="text-xs text-slate-500">
          {t("admin.usersPage.pagination.page", { page, total: totalPages })}
        </div>

        <div className="flex gap-2">
          <button
            className={btnBase + " h-9 " + btnMuted}
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            {t("admin.usersPage.pagination.prev")}
          </button>
          <button
            className={btnBase + " h-9 " + btnMuted}
            disabled={page >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          >
            {t("admin.usersPage.pagination.next")}
          </button>
        </div>
      </div>
    </div>
  );
}
