import React, { useEffect, useMemo, useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { adminStore } from "../storage";
import { shopAPI, userAPI } from "../../services/api";
import apiClient from "../../services/api";
import { useAuth } from "../../hooks/useAuth";

type OrderStatus =
  | "pending"
  | "accepted"
  | "packing"
  | "packed"
  | "processing"
  | "shipped"
  | "delivered"
  | "cancelled"
  | "refunded"
  | "paid";

type Order = {
  id: string;
  customer: string;
  total: number;
  status: OrderStatus;
  order_number?: string;
  created_at?: string;
  location?: string;
};

const LOCATION_OPTIONS: Array<{ value: string; labelKey: string }> = [
  { value: "tashkent", labelKey: "profileUpdate.regions.tashkent" },
  { value: "tashkent_region", labelKey: "profileUpdate.regions.tashkentRegion" },
  { value: "samarkand", labelKey: "profileUpdate.regions.samarkand" },
  { value: "bukhara", labelKey: "profileUpdate.regions.bukhara" },
  { value: "andijan", labelKey: "profileUpdate.regions.andijan" },
  { value: "fergana", labelKey: "profileUpdate.regions.fergana" },
  { value: "namangan", labelKey: "profileUpdate.regions.namangan" },
  { value: "navoiy", labelKey: "profileUpdate.regions.navoiy" },
  { value: "kashkadarya", labelKey: "profileUpdate.regions.kashkadarya" },
  { value: "surkhandarya", labelKey: "profileUpdate.regions.surkhandarya" },
  { value: "sirdarya", labelKey: "profileUpdate.regions.sirdarya" },
  { value: "jizzakh", labelKey: "profileUpdate.regions.jizzakh" },
  { value: "khorezm", labelKey: "profileUpdate.regions.khorezm" },
  { value: "karakalpakstan", labelKey: "profileUpdate.regions.karakalpakstan" },
];

const inputBase =
  "h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100";
const selectBase = inputBase;
const btnBase =
  "inline-flex items-center justify-center gap-2 rounded-xl px-4 font-semibold transition disabled:cursor-not-allowed disabled:opacity-60";
const btnIcon =
  "inline-flex items-center justify-center rounded-xl font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 px-0 p-0";
const btnMuted =
  "bg-slate-100 text-slate-900 hover:bg-slate-200 disabled:hover:bg-slate-100";
const btnGreen =
  "bg-gradient-to-br from-emerald-500 to-emerald-600 text-white shadow-sm hover:from-emerald-600 hover:to-emerald-700";
const btnRed =
  "bg-gradient-to-br from-red-500 to-red-600 text-white shadow-sm hover:from-red-600 hover:to-red-700";
const btnAmber =
  "bg-gradient-to-br from-amber-500 to-amber-600 text-white shadow-sm hover:from-amber-600 hover:to-amber-700";

const badgeMap: Record<string, string> = {
  pending: "bg-amber-100 text-amber-800",
  accepted: "bg-emerald-100 text-emerald-700",
  packing: "bg-indigo-100 text-indigo-700",
  packed: "bg-blue-100 text-blue-700",
  processing: "bg-sky-100 text-sky-700",
  shipped: "bg-cyan-100 text-cyan-700",
  delivered: "bg-emerald-100 text-emerald-700",
  cancelled: "bg-rose-100 text-rose-700",
  refunded: "bg-amber-100 text-amber-700",
  paid: "bg-emerald-100 text-emerald-700",
};

export default function Orders() {
  const { t } = useTranslation();
  const { profile } = useAuth() as any;

  const roleRaw = String(
    profile?.role || profile?.user_role || profile?.data?.role || ""
  ).toLowerCase();
  const [roleState, setRoleState] = useState<string>(roleRaw || "");
  const normalizedRole = roleState === "sale_operator" ? "sale" : roleState;
  const isSale = normalizedRole === "sale";

  const [items, setItems] = useState<Order[]>(
    adminStore.load<Order[]>("admin_orders", [])
  );

  const [q, setQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [status, setStatus] = useState<string>("");

  const [loading, setLoading] = useState(false);

  const [serverNow, setServerNow] = useState<Date | null>(null);

  const [ccOrders, setCcOrders] = useState<any[]>([]);
  const [notice, setNotice] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const [ccComments, setCcComments] = useState<Record<string, string>>({});
  const [ccSchedule, setCcSchedule] = useState<Record<string, string>>({});
  const [ccTick, setCcTick] = useState<number>(0);
  const [ccOverrides, setCcOverrides] = useState<
    Record<string, { city?: string; order_region?: string }>
  >(() => {
    try {
      return JSON.parse(localStorage.getItem("admin_cc_overrides") || "{}");
    } catch {
      return {};
    }
  });

  const [ordersPage, setOrdersPage] = useState(1);
  const [ordersLimit, setOrdersLimit] = useState(20);

  const [ccPage, setCcPage] = useState(1);
  const [ccLimit, setCcLimit] = useState(20);
  const [ccStatus, setCcStatus] = useState<string>("pending");
  const [ccSortColumn, setCcSortColumn] = useState<string>("time");
  const [ccSortDirection, setCcSortDirection] = useState<"asc" | "desc">("desc");

  useEffect(() => {
    const id = setInterval(() => setCcTick((x) => x + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const statusLabel = (st?: string) => {
    const code = String(st || "").toLowerCase();
    return t(`admin.ordersPage.statuses.${code}`, code || "—");
  };

  const StatusBadge = ({ value }: { value?: string }) => {
    const code = String(value || "").toLowerCase();
    return (
      <span
        className={[
          "inline-flex items-center rounded-full px-2 py-1 text-xs font-semibold",
          badgeMap[code] || "bg-slate-100 text-slate-700",
        ].join(" ")}
      >
        {statusLabel(code)}
      </span>
    );
  };

  const normalizeOrders = (data: any[]): Order[] =>
    data.map((o: any) => {
      const first = (o.buyer_firstname ?? "").trim();
      const last = (o.buyer_lastname ?? "").trim();
      const full = (o.full_name ?? "").trim();
      const byNames = first || last ? `${first} ${last}`.trim() : "";
      const customer = byNames || full || (o.order_comment || "").trim() || "Guest";
      const userLoc = (o.user_location ?? "").trim();
      const cityApi = (o.city ?? "").trim();
      const location = userLoc || cityApi || "";
      return {
        id: o.order_id || o.id,
        customer,
        total: o.total_price || 0,
        status: o.status || "pending",
        order_number: o.order_number || o.number || o.code || "",
        created_at:
          o.created_at || o.created || o.order_date || o.date || o.createdAt || null,
        location,
      };
    });

  const filtered = useMemo(
    () =>
      items.filter(
        (o) =>
          (debouncedQ
            ? o.id.includes(debouncedQ) ||
              o.customer.toLowerCase().includes(debouncedQ.toLowerCase()) ||
              (o.order_number || "").includes(debouncedQ)
            : true) && (status ? o.status === status : true)
      ),
    [items, debouncedQ, status]
  );

  const pagedOrders = useMemo(() => {
    const start = (ordersPage - 1) * ordersLimit;
    return filtered.slice(start, start + ordersLimit);
  }, [filtered, ordersPage, ordersLimit]);

  const filteredCc = useMemo(() => {
    let list = [...(ccOrders || [])];

    if (ccStatus) {
      const st = ccStatus.toLowerCase();
      list = list.filter((o: any) => String(o?.status || "").toLowerCase() === st);
    }

    if (ccSortColumn) {
      list.sort((a: any, b: any) => {
        let aVal: any;
        let bVal: any;

        switch (ccSortColumn) {
          case "order":
            aVal = a.order_number || "";
            bVal = b.order_number || "";
            break;
          case "fullName":
            aVal = (a.full_name || "").toLowerCase();
            bVal = (b.full_name || "").toLowerCase();
            break;
          case "phone":
            aVal = (a.client_phone || "").toLowerCase();
            bVal = (b.client_phone || "").toLowerCase();
            break;
          case "city":
            aVal = (a.city || "").toLowerCase();
            bVal = (b.city || "").toLowerCase();
            break;
          case "total":
            aVal = Number(a.total_price || 0);
            bVal = Number(b.total_price || 0);
            break;
          case "status":
            aVal = (a.status || "").toLowerCase();
            bVal = (b.status || "").toLowerCase();
            break;
          case "time":
            aVal = a.created_at ? new Date(a.created_at).getTime() : 0;
            bVal = b.created_at ? new Date(b.created_at).getTime() : 0;
            break;
          default:
            return 0;
        }

        if (aVal < bVal) return ccSortDirection === "asc" ? -1 : 1;
        if (aVal > bVal) return ccSortDirection === "asc" ? 1 : -1;
        return 0;
      });
    }

    return list;
  }, [ccOrders, ccStatus, ccSortColumn, ccSortDirection]);

  useEffect(() => {
    adminStore.save("admin_orders", items);
  }, [items]);

  useEffect(() => {
    const id = setTimeout(() => setDebouncedQ(q), 400);
    return () => clearTimeout(id);
  }, [q]);

  // resolve role
  useEffect(() => {
    let ignore = false;
    const load = async () => {
      if (roleState) return;
      const uid = profile?.id || profile?.user_id || profile?.data?.id;
      if (!uid) return;
      try {
        const info = await userAPI.getUsersInfo();
        const roleFromInfo = String(info?.data?.role || "").toLowerCase();
        if (!ignore && roleFromInfo) {
          setRoleState(roleFromInfo);
          return;
        }
        const res = await userAPI.getUserById(String(uid));
        const apiRole = String(res?.data?.role || "").toLowerCase();
        if (!ignore) setRoleState(apiRole);
      } catch {
        if (!ignore) setRoleState("");
      }
    };
    load();
    return () => {
      ignore = true;
    };
  }, [profile, roleState]);

  useEffect(() => {
    let ignore = false;
    const fetchOrders = async () => {
      try {
        setLoading(true);
        const res = await shopAPI.getAllOrders();
        if (ignore) return;
        const data = Array.isArray(res.data) ? res.data : res.data?.results || [];
        setItems(normalizeOrders(data));
      } finally {
        setLoading(false);
      }
    };
    fetchOrders();
    return () => {
      ignore = true;
    };
  }, []);

  const loadCcOrders = useCallback(async () => {
    if (!isSale) return;
    try {
      const res = await shopAPI.getCallCenterOrders();
      const data = Array.isArray(res.data)
        ? res.data
        : res.data?.results || res.data?.data || [];
      setCcOrders((prev) =>
        (data || []).map((o: any) => {
          const existing = prev.find((p) => p.id === o.id);
          const ov = ccOverrides[o.id] || {};
          return {
            ...o,
            // сохраняем выбранные значения города/региона, если пользователь менял их вручную
            city: ov.city ?? existing?.city ?? o.city,
            order_region: ov.order_region ?? existing?.order_region ?? o.order_region,
          };
        })
      );

      setCcComments((prev) => {
        const next = { ...prev } as Record<string, string>;
        (data || []).forEach((o: any) => {
          const id = o?.id;
          const apiComment = (o?.order_comment ?? "") as string;
          if (id && next[id] === undefined && apiComment) next[id] = apiComment;
        });
        return next;
      });
    } catch {
      setCcOrders([]);
    }
  }, [isSale]);

  useEffect(() => {
    try {
      localStorage.setItem("admin_cc_overrides", JSON.stringify(ccOverrides));
    } catch {
      // ignore
    }
  }, [ccOverrides]);

  useEffect(() => {
    if (!isSale) return;
    loadCcOrders();
  }, [isSale, loadCcOrders]);

  useEffect(() => {
    let ignore = false;
    const tick = async () => {
      try {
        const res = await shopAPI.getAllOrders();
        if (ignore) return;
        const data = Array.isArray(res.data) ? res.data : res.data?.results || [];
        setItems(normalizeOrders(data));
      } catch {}
    };
    const id = setInterval(tick, 10000);
    return () => {
      ignore = true;
      clearInterval(id);
    };
  }, []);

  useEffect(() => {
    let ignore = false;
    const loadServerTime = async () => {
      try {
        const res = await apiClient.get("/course/time/now");
        if (ignore) return;
        const payload = res?.data;
        const iso =
          typeof payload === "string" ? payload : payload?.now || payload?.data || payload?.time;
        if (iso) setServerNow(new Date(iso));
      } catch {}
    };
    loadServerTime();
    const tmr = setInterval(loadServerTime, 60000);
    return () => {
      ignore = true;
      clearInterval(tmr);
    };
  }, []);

  const formatDateTime = (iso?: string) => {
    if (!iso) return "—";
    const d = new Date(iso);
    if (isNaN(d.getTime())) return "—";
    return d.toLocaleString("ru-RU", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const timeClass = (iso?: string) => {
    if (!iso || !serverNow) return "text-slate-600";
    const d = new Date(iso);
    if (isNaN(d.getTime())) return "text-slate-600";
    const diffMin = Math.abs((serverNow.getTime() - d.getTime()) / 60000);
    if (diffMin <= 10) return "text-emerald-600";
    if (diffMin <= 20) return "text-amber-600";
    return "text-red-600";
  };

  const getScheduleTarget = (o: any): Date | null => {
    const local = ccSchedule[o.id];
    if (local) {
      const d = new Date(local);
      return isNaN(d.getTime()) ? null : d;
    }
    const raw = String(o?.order_comment || "");
    const m = raw.match(/\[reja_at:([^\]]+)\]/i);
    if (m?.[1]) {
      const d = new Date(m[1]);
      return isNaN(d.getTime()) ? null : d;
    }
    return null;
  };

  const formatRemaining = (ms: number): string => {
    const total = Math.max(0, Math.floor(ms / 1000));
    const h = Math.floor(total / 3600).toString().padStart(2, "0");
    const m = Math.floor((total % 3600) / 60).toString().padStart(2, "0");
    const s = Math.floor(total % 60).toString().padStart(2, "0");
    return `${h}:${m}:${s}`;
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      {/* HERO */}
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-purple-200 bg-gradient-to-br from-indigo-50 to-purple-50 p-4">
        <div>
          <div className="text-lg font-black text-indigo-900">
            {t("admin.ordersPage.hero.title")}
          </div>
          <div className="mt-1 text-xs text-slate-500">
            {t("admin.ordersPage.hero.subtitle")}
          </div>
        </div>
        {isSale && (
          <span className="rounded-full border border-cyan-200 bg-cyan-50 px-3 py-1 text-xs font-extrabold text-cyan-800">
            {t("admin.ordersPage.hero.sale")}
          </span>
        )}
      </div>

      {/* FILTERS */}
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div className="font-bold text-slate-900">{t("admin.ordersPage.title")}</div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            className={selectBase + " h-8 rounded-xl px-3 text-sm"}
            value={status}
            onChange={(e) => {
              setOrdersPage(1);
              setStatus(e.target.value);
            }}
          >
            <option value="">{t("admin.ordersPage.filters.statusAll")}</option>
            {(
              [
                "pending",
                "accepted",
                "packing",
                "packed",
                "processing",
                "shipped",
                "delivered",
                "cancelled",
                "refunded",
                "paid",
              ] as const
            ).map((st) => (
              <option key={st} value={st}>
                {t(`admin.ordersPage.statuses.${st}`)}
              </option>
            ))}
          </select>

          <input
            className={inputBase + " h-8 min-w-[240px] rounded-xl"}
            placeholder={t("admin.ordersPage.filters.searchPlaceholder")}
            value={q}
            onChange={(e) => {
              setOrdersPage(1);
              setQ(e.target.value);
            }}
          />
        </div>
      </div>

      {/* NOTICE */}
      {notice && (
        <div
          className={[
            "mb-3 rounded-2xl border px-3 py-2 text-sm font-semibold",
            notice.type === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
              : "border-red-200 bg-red-50 text-red-900",
          ].join(" ")}
        >
          {notice.message}
        </div>
      )}

      {loading && (
        <div className="mb-2 text-xs text-slate-500">{t("admin.ordersPage.loading")}</div>
      )}

      {/* DESKTOP TABLE */}
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full overflow-hidden rounded-2xl border border-slate-200 bg-white">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-3 py-3 text-center">{t("admin.ordersPage.table.customer")}</th>
              <th className="px-3 py-3 text-center">{t("admin.ordersPage.table.status")}</th>
              <th className="px-3 py-3 text-center">{t("admin.ordersPage.table.city")}</th>
              <th className="px-3 py-3 text-center">{t("admin.ordersPage.table.time")}</th>
              <th className="px-3 py-3 text-center">{t("admin.ordersPage.table.action")}</th>
            </tr>
          </thead>

          <tbody className="text-sm">
            {loading &&
              Array.from({ length: Math.min(ordersLimit, 10) }).map((_, i) => (
                <tr key={`sk-${i}`} className="border-t border-slate-200">
                  <td colSpan={5} className="px-3 py-3">
                    <div className="grid grid-cols-5 gap-3">
                      {Array.from({ length: 5 }).map((__, j) => (
                        <div key={j} className="h-4 rounded-lg bg-slate-200" />
                      ))}
                    </div>
                  </td>
                </tr>
              ))}

            {!loading &&
              pagedOrders.map((o, idx) => (
                <tr
                  key={o.id}
                  className={[
                    "border-t border-slate-200",
                    idx % 2 === 1 ? "bg-slate-50/40" : "",
                    "hover:bg-slate-50",
                  ].join(" ")}
                >
                  <td className="px-3 py-3 text-center">{o.customer}</td>
                  <td className="px-3 py-3 text-center">
                    <StatusBadge value={o.status} />
                  </td>
                  <td className="px-3 py-3 text-center">{o.location || "—"}</td>
                  <td
                    className={[
                      "px-3 py-3 text-center font-mono text-xs",
                      timeClass(o.created_at),
                    ].join(" ")}
                  >
                    {formatDateTime(o.created_at)}
                  </td>
                  <td className="px-3 py-3 text-center">
                    {isSale && (o.status === "pending" || !o.status) && (
                      <button
                        className={btnBase + " h-8 " + btnGreen}
                        onClick={async () => {
                          try {
                            await shopAPI.takeOrderCallCenter(o.id);
                            setNotice({
                              type: "success",
                              message: t("admin.ordersPage.cc.takeSuccess"),
                            });
                            setTimeout(() => setNotice(null), 2000);

                            await loadCcOrders();

                            const res = await shopAPI.getAllOrders();
                            const data = Array.isArray(res.data)
                              ? res.data
                              : res.data?.results || [];
                            setItems(normalizeOrders(data));
                          } catch (e: any) {
                            const msg =
                              e?.response?.data?.detail ||
                              e?.message ||
                              t("common.forms.error");
                            setNotice({ type: "error", message: msg });
                            setTimeout(() => setNotice(null), 3000);
                          }
                        }}
                      >
                        <svg
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <path
                            d="M20 6L9 17l-5-5"
                            stroke="currentColor"
                            strokeWidth="2.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                        {t("admin.ordersPage.cc.take")}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      {/* MOBILE CARDS */}
      <div className="md:hidden">
        {loading &&
          Array.from({ length: Math.min(ordersLimit, 5) }).map((_, i) => (
            <div
              key={`m-sk-${i}`}
              className="mb-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm"
            >
              <div className="h-14 rounded-xl bg-slate-200" />
            </div>
          ))}

        {!loading &&
          pagedOrders.map((o) => (
            <div
              key={o.id}
              className="mb-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm"
            >
              <div className="mb-2 flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="truncate text-sm font-bold text-slate-900">
                    {o.customer}
                  </div>
                  <div className="text-xs text-slate-500">{o.location || "—"}</div>
                </div>
                <StatusBadge value={o.status} />
              </div>

              <div className={["mb-2 text-xs font-mono", timeClass(o.created_at)].join(" ")}>
                {formatDateTime(o.created_at)}
              </div>

              {isSale && (o.status === "pending" || !o.status) && (
                <button
                  className={btnBase + " h-9 w-full " + btnGreen}
                  onClick={async () => {
                    try {
                      await shopAPI.takeOrderCallCenter(o.id);
                      setNotice({
                        type: "success",
                        message: t("admin.ordersPage.cc.takeSuccess"),
                      });
                      setTimeout(() => setNotice(null), 2000);

                      await loadCcOrders();

                      const res = await shopAPI.getAllOrders();
                      const data = Array.isArray(res.data) ? res.data : res.data?.results || [];
                      setItems(normalizeOrders(data));
                    } catch (e: any) {
                      const msg = e?.response?.data?.detail || e?.message || t("common.forms.error");
                      setNotice({ type: "error", message: msg });
                      setTimeout(() => setNotice(null), 3000);
                    }
                  }}
                >
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M20 6L9 17l-5-5"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  {t("admin.ordersPage.cc.take")}
                </button>
              )}
            </div>
          ))}
      </div>

      {/* PAGINATION */}
      {!loading && (
        <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
          <div className="text-xs text-slate-500">
            {t("admin.ordersPage.pagination.page", {
              page: ordersPage,
              total: Math.max(1, Math.ceil(filtered.length / ordersLimit)),
            })}
          </div>

          <div className="flex items-center gap-2">
            <select
              className={selectBase}
              value={ordersLimit}
              onChange={(e) => {
                setOrdersPage(1);
                setOrdersLimit(Number(e.target.value) || 20);
              }}
            >
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>

            <div className="flex gap-2">
              <button
                className={btnBase + " h-10 " + btnMuted}
                disabled={ordersPage <= 1}
                onClick={() => setOrdersPage((p) => Math.max(1, p - 1))}
              >
                {t("admin.ordersPage.pagination.prev")}
              </button>
              <button
                className={btnBase + " h-10 " + btnMuted}
                disabled={ordersPage >= Math.ceil(filtered.length / ordersLimit)}
                onClick={() =>
                  setOrdersPage((p) =>
                    Math.min(Math.ceil(filtered.length / ordersLimit) || 1, p + 1)
                  )
                }
              >
                {t("admin.ordersPage.pagination.next")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CALL-CENTER BLOCK (SALE ONLY) */}
      {isSale && (
        <div className="mt-5">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <div className="font-black text-slate-900">{t("admin.ordersPage.cc.title")}</div>

            <div className="flex flex-wrap items-center gap-2">
              <select
                className={selectBase}
                value={ccStatus}
                onChange={(e) => {
                  setCcPage(1);
                  setCcStatus(e.target.value);
                }}
              >
                <option value="">{t("admin.ordersPage.cc.statusAll")}</option>
                {(
                  [
                    "pending",
                    "accepted",
                    "packing",
                    "packed",
                    "processing",
                    "shipped",
                    "delivered",
                    "cancelled",
                    "refunded",
                    "paid",
                  ] as const
                ).map((st) => (
                  <option key={st} value={st}>
                    {t(`admin.ordersPage.cc.statuses.${st}`)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full overflow-hidden rounded-2xl border border-slate-200 bg-white">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  {[
                    { key: "order", label: t("admin.ordersPage.cc.table.order") },
                    {
                      key: "fullName",
                      label:
                        t("admin.ordersPage.cc.table.fullName") +
                        " / " +
                        t("admin.ordersPage.cc.table.phone"),
                    },
                    {
                      key: "city",
                      label:
                        t("admin.ordersPage.cc.table.city") +
                        " / " +
                        t("admin.ordersPage.cc.table.region"),
                    },
                    { key: "total", label: t("admin.ordersPage.cc.table.total") },
                    { key: "status", label: t("admin.ordersPage.cc.table.status") },
                    { key: "time", label: t("admin.ordersPage.cc.table.time") },
                  ].map((h) => (
                    <th
                      key={h.key}
                      className="cursor-pointer select-none px-3 py-3 text-center"
                      onClick={() => {
                        if (ccSortColumn === h.key) {
                          setCcSortDirection(ccSortDirection === "asc" ? "desc" : "asc");
                        } else {
                          setCcSortColumn(h.key);
                          setCcSortDirection(h.key === "time" ? "desc" : "asc");
                        }
                      }}
                    >
                      <div className="inline-flex items-center gap-2">
                        {h.label}
                        {ccSortColumn === h.key && (
                          <span className="text-slate-700">
                            {ccSortDirection === "asc" ? "↑" : "↓"}
                          </span>
                        )}
                      </div>
                    </th>
                  ))}
                  <th className="px-3 py-3 text-center">
                    {t("admin.ordersPage.cc.table.comment")} / {t("admin.ordersPage.cc.table.schedule")}
                  </th>
                  <th className="px-3 py-3 text-center">{t("admin.ordersPage.cc.table.actions")}</th>
                </tr>
              </thead>

              <tbody className="text-sm">
                {(filteredCc || [])
                  .slice((ccPage - 1) * ccLimit, (ccPage - 1) * ccLimit + ccLimit)
                  .map((o: any, idx: number) => {
                      const target = getScheduleTarget(o);
                      const diff = target ? target.getTime() - Date.now() : null;
                      const overdue = diff !== null && diff <= 0;
                      const urgent = diff !== null && diff > 0 && diff <= 5 * 60 * 1000;

                      const timerColor = overdue
                        ? "text-red-600"
                        : urgent
                        ? "text-amber-600"
                        : "text-emerald-600";

                      return (
                        <tr
                          key={o.id}
                          className={[
                            "border-t border-slate-200",
                            idx % 2 === 1 ? "bg-slate-50/40" : "",
                            "hover:bg-slate-50",
                          ].join(" ")}
                        >
                          <td className="px-3 py-3 text-center">{o.order_number || "—"}</td>

                          <td className="px-3 py-3">
                            <div className="flex flex-col gap-1 text-center">
                              <div className="text-sm font-semibold text-slate-900">
                                {o.full_name || "—"}
                              </div>
                              <div className="text-xs text-slate-500">{o.client_phone || "—"}</div>
                            </div>
                          </td>

                          <td className="px-3 py-3">
                            <div className="flex flex-col gap-2">
                              <select
                                className={selectBase}
                                value={(o.city || "").toLowerCase()}
                                onChange={(e) =>
                              setCcOrders((prev) =>
                                prev.map((x) => {
                                  if (x.id !== o.id) return x;
                                  const updated = { ...x, city: e.target.value };
                                  setCcOverrides((p) => ({
                                    ...p,
                                    [o.id]: { ...(p[o.id] || {}), city: e.target.value },
                                  }));
                                  return updated;
                                })
                              )
                                }
                              >
                                <option value="">—</option>
                                {LOCATION_OPTIONS.map((opt) => (
                                  <option key={opt.value} value={opt.value}>
                                    {t(opt.labelKey)}
                                  </option>
                                ))}
                              </select>

                              <input
                                className={inputBase}
                                placeholder={t("admin.ordersPage.cc.regionPlaceholder")}
                                value={o.order_region || ""}
                                onChange={(e) =>
                              setCcOrders((prev) =>
                                prev.map((x) => {
                                  if (x.id !== o.id) return x;
                                  const updated = { ...x, order_region: e.target.value };
                                  setCcOverrides((p) => ({
                                    ...p,
                                    [o.id]: { ...(p[o.id] || {}), order_region: e.target.value },
                                  }));
                                  return updated;
                                })
                              )
                                }
                              />
                            </div>
                          </td>

                          <td className="px-3 py-3 text-center">
                            {Number(o.total_price || 0).toLocaleString()}
                          </td>

                          <td className="px-3 py-3 text-center">
                            <StatusBadge value={o.status} />
                          </td>

                          <td className="px-3 py-3 text-center text-xs text-slate-600">
                            {o.created_at ? new Date(o.created_at).toLocaleString() : "—"}
                          </td>

                          <td className="px-3 py-3">
                            <div className="flex flex-col gap-2">
                              <input
                                className={inputBase}
                                placeholder={t("admin.ordersPage.cc.commentPlaceholder")}
                                value={ccComments[o.id] ?? (o.order_comment || "")}
                                onChange={(e) =>
                                  setCcComments((prev) => ({ ...prev, [o.id]: e.target.value }))
                                }
                              />

                              <div className="flex flex-col gap-1">
                                <input
                                  className={inputBase}
                                  type="datetime-local"
                                  value={ccSchedule[o.id] || ""}
                                  onChange={(e) =>
                                    setCcSchedule((prev) => ({ ...prev, [o.id]: e.target.value }))
                                  }
                                />
                                {target && diff !== null && (
                                  <span
                                    className={[
                                      "inline-flex w-fit items-center rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs font-extrabold",
                                      timerColor,
                                    ].join(" ")}
                                    title={target.toLocaleString()}
                                  >
                                    ⏳ {formatRemaining(diff)}
                                  </span>
                                )}
                              </div>
                            </div>
                          </td>

                          <td className="px-3 py-3">
                            <div className="flex items-center justify-center gap-2">
                              <button
                                className={btnIcon + " h-10 w-10 " + btnGreen}
                                title="Qabul qilish"
                                onClick={async () => {
                                  try {
                                    const cityVal = (o.city || "").trim() || " ";
                                    const regionVal = (o.order_region || "").trim() || " ";
                                    const commentVal = (ccComments[o.id] || o.order_comment || "").trim() || " ";
                                    const payload = {
                                      city: cityVal,
                                      region: regionVal,
                                      order_comment: commentVal,
                                      status: "accepted",
                                    };
                                    await shopAPI.updateOrderLocation(o.id, payload);
                                    setNotice({ type: "success", message: "Qabul qilindi (accepted)" });
                                    setCcOrders((prev) =>
                                      prev.map((x) => (x.id === o.id ? { ...x, status: "accepted" } : x))
                                    );
                                    setTimeout(() => setNotice(null), 2000);
                                  } catch (e: any) {
                                    const msg = e?.response?.data?.detail || e?.message || "Xatolik";
                                    setNotice({ type: "error", message: msg });
                                    setTimeout(() => setNotice(null), 3000);
                                  }
                                }}
                              >
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                                  <path
                                    d="M20 6L9 17l-5-5"
                                    stroke="currentColor"
                                    strokeWidth="2.4"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                  />
                                </svg>
                              </button>

                              <button
                                className={btnIcon + " h-10 w-10 " + btnRed}
                                title="Rad etish"
                                onClick={async () => {
                                  try {
                                    const cityVal = (o.city || "").trim() || " ";
                                    const regionVal = (o.order_region || "").trim() || " ";
                                    const commentVal = (ccComments[o.id] || o.order_comment || "").trim() || " ";
                                    const payload = {
                                      city: cityVal,
                                      region: regionVal,
                                      order_comment: commentVal,
                                      status: "cancelled",
                                    };
                                    await shopAPI.updateOrderLocation(o.id, payload);
                                    setNotice({ type: "success", message: "Rad etildi (cancelled)" });
                                    setCcOrders((prev) =>
                                      prev.map((x) => (x.id === o.id ? { ...x, status: "cancelled" } : x))
                                    );
                                    setTimeout(() => setNotice(null), 2000);
                                  } catch (e: any) {
                                    const msg = e?.response?.data?.detail || e?.message || "Xatolik";
                                    setNotice({ type: "error", message: msg });
                                    setTimeout(() => setNotice(null), 3000);
                                  }
                                }}
                              >
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                                  <path
                                    d="M18 6L6 18M6 6l12 12"
                                    stroke="currentColor"
                                    strokeWidth="2.4"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                  />
                                </svg>
                              </button>

                              <button
                                className={btnIcon + " h-10 w-10 " + btnAmber}
                                title="Kechiktirish"
                                onClick={async () => {
                                  try {
                                    const schedule = (ccSchedule[o.id] || "").trim();
                                    const baseComment = (ccComments[o.id] || "").trim();
                                    const iso = schedule ? new Date(schedule).toISOString() : "";
                                    const human = schedule ? new Date(schedule).toLocaleString() : "";
                                    const composed = schedule
                                      ? `${baseComment ? baseComment + " | " : ""}Reja: ${human} [reja_at:${iso}]`
                                      : baseComment || " ";

                                    const cityVal = (o.city || "").trim() || " ";
                                    const regionVal = (o.order_region || "").trim() || " ";
                                    const payload = {
                                      city: cityVal,
                                      region: regionVal,
                                      order_comment: composed,
                                      status: "processing",
                                    };
                                    await shopAPI.updateOrderLocation(o.id, payload);
                                    setNotice({ type: "success", message: "Kechiktirildi (processing)" });
                                    setCcOrders((prev) =>
                                      prev.map((x) => (x.id === o.id ? { ...x, status: "processing" } : x))
                                    );
                                    setTimeout(() => setNotice(null), 2000);
                                  } catch (e: any) {
                                    const msg = e?.response?.data?.detail || e?.message || "Xatolik";
                                    setNotice({ type: "error", message: msg });
                                    setTimeout(() => setNotice(null), 3000);
                                  }
                                }}
                              >
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2.2" />
                                  <path
                                    d="M12 6v6l4 2"
                                    stroke="currentColor"
                                    strokeWidth="2.2"
                                    strokeLinecap="round"
                                  />
                                </svg>
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                  })}

                {(!filteredCc || filteredCc.length === 0) && (
                  <tr className="border-t border-slate-200">
                    <td colSpan={8} className="px-3 py-6 text-center text-sm text-slate-500">
                      Hali buyurtmalar yo&apos;q
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {filteredCc && filteredCc.length > 0 && (
            <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
              <div className="text-xs text-slate-500">
                Page {ccPage} of {Math.max(1, Math.ceil(filteredCc.length / ccLimit))}
              </div>

              <div className="flex items-center gap-2">
                <select
                  className={selectBase}
                  value={ccLimit}
                  onChange={(e) => {
                    setCcPage(1);
                    setCcLimit(Number(e.target.value) || 20);
                  }}
                >
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>

                <div className="flex gap-2">
                  <button
                    className={btnBase + " h-10 " + btnMuted}
                    disabled={ccPage <= 1}
                    onClick={() => setCcPage((p) => Math.max(1, p - 1))}
                  >
                    Prev
                  </button>
                  <button
                    className={btnBase + " h-10 " + btnMuted}
                    disabled={ccPage >= Math.ceil((filteredCc.length || 0) / ccLimit)}
                    onClick={() =>
                      setCcPage((p) =>
                        Math.min(Math.ceil((filteredCc.length || 0) / ccLimit) || 1, p + 1)
                      )
                    }
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
