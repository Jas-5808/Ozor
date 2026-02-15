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

import React, { useEffect, useMemo, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import { adminStore } from "../storage";
import { shopAPI, userAPI, warehouseAPI } from "../../services/api";
import apiClient from "../../services/api";
import { useAuth } from "../../hooks/useAuth";
import { getProductImageUrl } from "../../utils/helpers";
import { resolveProductDescription, resolveProductName } from "../../utils/productUtils";

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
  const canViewAdminOrders = normalizedRole === "admin" || normalizedRole === "manager" || normalizedRole === "seo" || normalizedRole === "ceo";
  const hasAccess = canViewAdminOrders || isSale;
  const roleReady = Boolean(roleState || roleRaw);

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
  /** Количество по позициям заказа: orderId -> order_item_id -> quantity (для API location) */
  const [ccItemQuantities, setCcItemQuantities] = useState<Record<string, Record<string, number>>>({});
  const [ccTick, setCcTick] = useState<number>(0);
  const [ccOverrides, setCcOverrides] = useState<
    Record<string, { city?: string; order_region?: string; region_id?: string; order_city_id?: string; delivery_address?: string; guest_additional_phone?: string }>
  >(() => {
    try {
      return JSON.parse(localStorage.getItem("admin_cc_overrides") || "{}");
    } catch {
      return {};
    }
  });
  const [regions, setRegions] = useState<Array<{ id: string; name: string; postal_code: string }>>([]);
  const [citiesByRegion, setCitiesByRegion] = useState<Record<string, Array<{ id: string; name: string; postal_code: string }>>>({});
  const [ccValidationErrors, setCcValidationErrors] = useState<Record<string, { region: boolean; city: boolean }>>({});
  const [ccValidationShakeTick, setCcValidationShakeTick] = useState(0);

  // Кэш для информации о продуктах по variant_id
  const [productCache, setProductCache] = useState<
    Record<
      string,
      {
        name: string;
        image: string;
        description?: string;
        price?: number;
        base_price?: number;
        stock?: number;
        category?: { id: string; name: string };
        variants?: any[];
        loading?: boolean;
      }
    >
  >({});

  // Состояние для модального окна продукта
  const [productModal, setProductModal] = useState<{
    open: boolean;
    variantId: string | null;
  }>({ open: false, variantId: null });

  const [ordersPage, setOrdersPage] = useState(1);
  const [ordersLimit, setOrdersLimit] = useState(20);
  const [orderStatsByCity, setOrderStatsByCity] = useState<Array<{ order_region?: string; city?: string; count: number }>>([]);
  const [orderStatsLoading, setOrderStatsLoading] = useState(false);
  const [requestStatsByCity, setRequestStatsByCity] = useState<Array<{ order_region?: string; city?: string; count: number }>>([]);
  const [requestStatsLoading, setRequestStatsLoading] = useState(false);

  const [ccPage, setCcPage] = useState(1);
  const [ccLimit, setCcLimit] = useState(20);
  const [ccStatus, setCcStatus] = useState<string>("processing");
  const [ccDateFrom, setCcDateFrom] = useState<string>("");
  const [ccDateTo, setCcDateTo] = useState<string>("");
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
    load();
    return () => {
      ignore = true;
    };
  }, [profile, roleState]);

  useEffect(() => {
    let ignore = false;
    const fetchOrders = async () => {
      // Для sale_operator тоже показываем /shop/orders/all (требование)
      if (!hasAccess) return;
      try {
        setLoading(true);
        const res = await shopAPI.getAllOrders();
        if (ignore) return;
        const data = Array.isArray(res.data)
          ? res.data
          : (res.data as any)?.data || [];
        setItems(normalizeOrders(data));
      } finally {
        setLoading(false);
      }
    };
    fetchOrders();
    return () => {
      ignore = true;
    };
  }, [hasAccess]);

  useEffect(() => {
    let ignore = false;
    const fetchStats = async () => {
      if (!hasAccess) return;
      try {
        setOrderStatsLoading(true);
        const res = await warehouseAPI.getOrdersStatsByCity();
        if (ignore) return;
        const data = Array.isArray(res.data) ? res.data : (res.data as any)?.data || [];
        setOrderStatsByCity(data || []);
      } catch {
        if (!ignore) setOrderStatsByCity([]);
      } finally {
        if (!ignore) setOrderStatsLoading(false);
      }
    };
    fetchStats();
    return () => {
      ignore = true;
    };
  }, [hasAccess]);

  useEffect(() => {
    let ignore = false;
    const fetchRequestStats = async () => {
      if (!hasAccess) return;
      try {
        setRequestStatsLoading(true);
        const res = await warehouseAPI.getRequestsStatsByCity();
        if (ignore) return;
        const data = Array.isArray(res.data) ? res.data : (res.data as any)?.data || [];
        setRequestStatsByCity(data || []);
      } catch {
        if (!ignore) setRequestStatsByCity([]);
      } finally {
        if (!ignore) setRequestStatsLoading(false);
      }
    };
    fetchRequestStats();
    return () => {
      ignore = true;
    };
  }, [hasAccess]);

  // Функция для загрузки информации о продукте по variant_id
  const loadProductByVariantId = useCallback(async (variantId: string) => {
    if (!variantId) return;

    setProductCache((prev) => {
      // Проверяем, не загружается ли уже или не загружен ли уже
      if (prev[variantId]?.loading || (prev[variantId]?.image && prev[variantId]?.name)) {
        return prev;
      }
      return {
        ...prev,
        [variantId]: { name: "", image: "", loading: true },
      };
    });

    try {
      const res = await apiClient.get(`/shop/product/${variantId}`);
      const productData = (res.data as any)?.data ?? res.data;

      // Находим нужный вариант
      const variant = productData.variants?.find((v: any) => v.id === variantId) || productData.variants?.[0];

      // Получаем изображение: сначала из варианта, потом основное
      let imageUrl = "";
      if (variant?.media && variant.media.length > 0) {
        const mainMedia = variant.media.find((m: any) => m.is_main) || variant.media[0];
        imageUrl = mainMedia?.file || "";
      }
      if (!imageUrl && productData.main_image) {
        imageUrl = productData.main_image;
      }

      setProductCache((prev) => ({
        ...prev,
        [variantId]: {
          name: resolveProductName(productData),
          image: imageUrl ? getProductImageUrl(imageUrl) : "",
          description: resolveProductDescription(productData),
          price: variant?.price || 0,
          base_price: variant?.base_price || 0,
          stock: variant?.stock || 0,
          category: productData.category || undefined,
          variants: productData.variants || [],
          loading: false,
        },
      }));
    } catch (error) {
      setProductCache((prev) => ({
        ...prev,
        [variantId]: { name: "", image: "", loading: false },
      }));
    }
  }, []);

  const loadCcOrders = useCallback(async () => {
    if (!isSale) return;
    try {
      const params: { date_from?: string; date_to?: string } = {};
      if (ccDateFrom?.trim()) params.date_from = ccDateFrom.trim();
      if (ccDateTo?.trim()) params.date_to = ccDateTo.trim();
      const res = await shopAPI.getCallCenterOrders(params);
      const data = Array.isArray(res.data)
        ? res.data
          : (res.data as any)?.data || [];
      setCcOrders((prev) =>
        (data || []).map((o: any) => {
          const existing = prev.find((p) => p.id === o.id);
          const ov = ccOverrides[o.id] || {};
          return {
            ...o,
            city: ov.city ?? existing?.city ?? o.city,
            order_region: ov.order_region ?? existing?.order_region ?? o.order_region,
            region_id: ov.region_id ?? existing?.region_id ?? o.region_id,
            order_city_id: ov.order_city_id ?? existing?.order_city_id ?? o.order_city_id,
            delivery_address: ov.delivery_address ?? existing?.delivery_address ?? o.delivery_address,
            guest_additional_phone: ov.guest_additional_phone ?? existing?.guest_additional_phone ?? o.guest_additional_phone,
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

      setCcItemQuantities((prev) => {
        const next = { ...prev };
        (data || []).forEach((o: any) => {
          if (!o?.id || !Array.isArray(o.items)) return;
          next[o.id] = { ...next[o.id] };
          o.items.forEach((item: any) => {
            if (item.id != null && next[o.id][item.id] === undefined) {
              next[o.id][item.id] = Math.max(0, Number(item.quantity) || 1);
            }
          });
        });
        return next;
      });
    } catch {
      setCcOrders([]);
    }
  }, [isSale, ccDateFrom, ccDateTo, loadProductByVariantId]);

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

  // Регионы загружаем при монтировании (без привязки к hasAccess), чтобы у оператора список не зависел от момента подгрузки роли
  useEffect(() => {
    let ignore = false;
    const loadRegions = async () => {
      try {
        const res = await shopAPI.getRegions();
        const data = Array.isArray(res.data) ? res.data : (res.data as any)?.data ?? [];
        if (!ignore) setRegions(data);
      } catch {
        if (!ignore) setRegions([]);
      }
    };
    loadRegions();
    return () => { ignore = true; };
  }, []);

  const loadCitiesForRegion = useCallback(async (regionId: string) => {
    if (!regionId) return;
    if (citiesByRegion[regionId]) return;
    try {
      const res = await shopAPI.getCities(regionId);
      const data = Array.isArray(res.data) ? res.data : (res.data as any)?.data ?? [];
      setCitiesByRegion((prev) => ({ ...prev, [regionId]: data }));
    } catch {
      setCitiesByRegion((prev) => ({ ...prev, [regionId]: [] }));
    }
  }, [citiesByRegion]);

  useEffect(() => {
    (ccOrders || []).forEach((o: any) => {
      const regionId = ccOverrides[o.id]?.region_id ?? o.region_id;
      if (regionId) loadCitiesForRegion(regionId);
    });
  }, [ccOrders, ccOverrides, loadCitiesForRegion]);

  // Загружаем информацию о продуктах для отображаемых заказов
  useEffect(() => {
    if (!isSale) return;
    const visibleOrders = filteredCc.slice((ccPage - 1) * ccLimit, (ccPage - 1) * ccLimit + ccLimit);
    visibleOrders.forEach((o: any) => {
      if (o.items && o.items.length > 0) {
        const firstItem = o.items[0];
        if (firstItem.variant_id && !productCache[firstItem.variant_id]) {
          loadProductByVariantId(firstItem.variant_id);
        }
      }
    });
  }, [isSale, filteredCc, ccPage, ccLimit, productCache, loadProductByVariantId]);

  // Загружаем полную информацию о продукте при открытии модального окна
  useEffect(() => {
    if (productModal.open && productModal.variantId) {
      const productInfo = productCache[productModal.variantId];
      if (!productInfo || (!productInfo.description && !productInfo.loading)) {
        loadProductByVariantId(productModal.variantId);
      }
    }
  }, [productModal.open, productModal.variantId, productCache, loadProductByVariantId]);

  // Блокируем скролл при открытии модального окна
  useEffect(() => {
    if (productModal.open) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = prev;
      };
    }
  }, [productModal.open]);

  useEffect(() => {
    let ignore = false;
    const tick = async () => {
      if (!hasAccess) return;
      try {
        const res = await shopAPI.getAllOrders();
        if (ignore) return;
        const data = Array.isArray(res.data)
          ? res.data
          : (res.data as any)?.data || [];
        setItems(normalizeOrders(data));
      } catch {}
    };
    const id = setInterval(tick, 10000);
    return () => {
      ignore = true;
      clearInterval(id);
    };
  }, [hasAccess]);

  // ВАЖНО: хук должен вызываться до любых ранних return, иначе ломается порядок хуков.
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
    <div className="overflow-x-hidden rounded-2xl border border-slate-200 bg-white p-3 sm:p-4">
      <style>{`
        @keyframes cc-shake {
          0%, 100% { transform: translateX(0); }
          20%, 60% { transform: translateX(-6px); }
          40%, 80% { transform: translateX(6px); }
        }
        .cc-shake-run {
          animation: cc-shake 0.45s ease-in-out;
        }
        @media (max-width: 767px) {
          .cc-table-mobile thead { display: none; }
          .cc-table-mobile tbody tr {
            display: block;
            border: 1px solid #cbd5e1;
            border-radius: 1rem;
            margin-bottom: 1rem;
            padding: 1rem;
            background: #fff;
            box-shadow: 0 2px 8px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.04);
          }
          .cc-table-mobile tbody td {
            display: block;
            border: none;
            padding: 0.5rem 0;
            width: 100%;
          }
          .cc-table-mobile tbody td::before {
            content: attr(data-label);
            font-weight: 600;
            font-size: 0.7rem;
            color: #64748b;
            display: block;
            margin-bottom: 0.25rem;
          }
          .cc-table-mobile tbody td:first-child { padding-top: 0; }
          .cc-table-mobile tbody td[data-label=""]::before { display: none; }
          .cc-table-mobile .cc-mobile-actions { justify-content: stretch; align-items: stretch; min-height: 52px; }
          .cc-table-mobile .cc-mobile-actions > div { width: 100%; }
          .cc-table-mobile thead th:first-child,
          .cc-table-mobile tbody td:first-child { display: none !important; }
          .cc-table-mobile tbody tr { display: flex; flex-wrap: wrap; }
          .cc-table-mobile tbody td { flex: 1 1 100%; }
          .cc-table-mobile tbody td.cc-mobile-pair { flex: 1 1 50%; min-width: 0; }
        }
      `}</style>
      {/* Секция: Актуальные заказы по городам + Заявки по городам */}
      {hasAccess && (
        <section className="mb-6 rounded-2xl border border-slate-200 bg-slate-100/80 px-4 py-4 shadow-sm">
          <div className="mb-4 rounded-xl border border-slate-200 bg-slate-50/90 px-4 py-3">
            <div className="mb-2 text-sm font-bold text-slate-700">
              {t("admin.ordersPage.statsByCity", { defaultValue: "Актуальные заказы по городам" })}
            </div>
          {orderStatsLoading ? (
            <div className="flex flex-wrap gap-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <span key={i} className="h-8 w-24 animate-pulse rounded-xl bg-slate-200" />
              ))}
            </div>
          ) : orderStatsByCity.length === 0 ? (
            <p className="text-xs text-slate-500">
              {t("admin.ordersPage.statsEmpty", { defaultValue: "Нет заказов на данный момент" })}
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {orderStatsByCity.map((row) => {
                const cityKey = row.city ?? row.order_region ?? '';
                const labelKey = LOCATION_OPTIONS.find((o) => o.value === cityKey)?.labelKey;
                const label = labelKey ? t(labelKey) : cityKey;
                return (
                  <span
                    key={cityKey}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-white px-3 py-1.5 text-sm font-semibold text-slate-800 shadow-sm"
                  >
                    <span>{label}</span>
                    <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-800">
                      {row.count}
                    </span>
                  </span>
                );
              })}
            </div>
          )}
          </div>
          <div className="rounded-xl border border-slate-200 bg-amber-50/90 px-4 py-3">
            <div className="mb-2 text-sm font-bold text-slate-700">
              {t("admin.ordersPage.statsRequestsByCity", { defaultValue: "Заявки по городам" })}
            </div>
            {requestStatsLoading ? (
            <div className="flex flex-wrap gap-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <span key={i} className="h-8 w-24 animate-pulse rounded-xl bg-slate-200" />
              ))}
            </div>
          ) : requestStatsByCity.length === 0 ? (
            <p className="text-xs text-slate-500">
              {t("admin.ordersPage.statsEmpty", { defaultValue: "Нет заявок на данный момент" })}
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {requestStatsByCity.map((row) => {
                const cityKey = row.city ?? row.order_region ?? '';
                const labelKey = LOCATION_OPTIONS.find((o) => o.value === cityKey)?.labelKey;
                const label = labelKey ? t(labelKey) : cityKey;
                return (
                  <span
                    key={cityKey}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-amber-200 bg-white px-3 py-1.5 text-sm font-semibold text-slate-800 shadow-sm"
                  >
                    <span>{label}</span>
                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-800">
                      {row.count}
                    </span>
                  </span>
                );
              })}
            </div>
          )}
          </div>
        </section>
      )}

      {/* Секция: Orders (все заказы для админа/менеджера) */}
      <section className="mb-6 rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-4 shadow-sm">
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
                              : (res.data as any)?.data || [];
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
                    const data = Array.isArray(res.data)
                      ? res.data
                      : (res.data as any)?.data || [];
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
      </section>

      {/* Секция: Мои заказы (Call-center) */}
      {isSale && (
        <section className="rounded-2xl border border-emerald-200 bg-emerald-50/60 px-4 py-4 shadow-sm">
        <div>
          <div className="mb-3 flex flex-col gap-3 sm:mb-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
            <div className="font-black text-slate-900">{t("admin.ordersPage.cc.title")}</div>

            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3">
              <select
                className={selectBase + " w-full min-h-[44px] sm:w-auto"}
                value={ccStatus}
                onChange={(e) => {
                  setCcPage(1);
                  setCcStatus(e.target.value);
                }}
              >
                <option value="">{t("admin.ordersPage.cc.statusAll")}</option>
                {(
                  [
                    "processing",
                    "accepted",
                    "packing",
                    "packed",
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
              <label className="flex flex-col gap-1 text-sm text-slate-700 sm:flex-row sm:items-center sm:gap-1.5">
                <span className="font-medium">{t("admin.ordersPage.cc.dateFrom", "Дата от")}</span>
                <input
                  type="date"
                  className={inputBase + " w-full min-h-[44px] sm:w-40"}
                  value={ccDateFrom}
                  onChange={(e) => {
                    setCcPage(1);
                    setCcDateFrom(e.target.value);
                  }}
                />
              </label>
              <label className="flex flex-col gap-1 text-sm text-slate-700 sm:flex-row sm:items-center sm:gap-1.5">
                <span className="font-medium">{t("admin.ordersPage.cc.dateTo", "Дата до")}</span>
                <input
                  type="date"
                  className={inputBase + " w-full min-h-[44px] sm:w-40"}
                  value={ccDateTo}
                  onChange={(e) => {
                    setCcPage(1);
                    setCcDateTo(e.target.value);
                  }}
                />
              </label>
            </div>
          </div>

          <div className="overflow-x-auto -mx-1 sm:mx-0">
            <table className="cc-table-mobile w-full overflow-hidden rounded-2xl border border-slate-200 bg-white">
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
                    { key: "total", label: t("admin.ordersPage.cc.table.product") || "Продукт" },
                    { key: "qty", label: t("admin.ordersPage.cc.table.quantity") || "Кол-во" },
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
                          <td data-label={t("admin.ordersPage.cc.table.order")} className="px-3 py-3 text-center">{o.order_number || "—"}</td>

                          <td data-label="" className="px-3 py-3">
                            <div className="flex flex-col gap-1.5 text-center sm:text-left">
                              <div className="text-lg font-semibold text-slate-900 sm:text-sm">
                                {o.full_name || "—"}
                              </div>
                              {o.client_phone ? (
                                <a
                                  href={`tel:${String(o.client_phone).replace(/\D/g, "")}`}
                                  className="text-base font-medium text-emerald-600 underline underline-offset-2 active:opacity-80 sm:text-xs sm:font-normal sm:text-slate-500 sm:no-underline"
                                >
                                  {o.client_phone}
                                </a>
                              ) : (
                                <span className="text-base text-slate-500 sm:text-xs">—</span>
                              )}
                              <input
                                className={inputBase + " min-h-[44px] text-base sm:text-sm"}
                                placeholder={t("admin.ordersPage.cc.additionalPhonePlaceholder", { defaultValue: "Доп. телефон" })}
                                value={ccOverrides[o.id]?.guest_additional_phone ?? o.guest_additional_phone ?? ""}
                                onChange={(e) => {
                                  const v = e.target.value;
                                  setCcOrders((prev) =>
                                    prev.map((x) => (x.id !== o.id ? x : { ...x, guest_additional_phone: v }))
                                  );
                                  setCcOverrides((p) => ({
                                    ...p,
                                    [o.id]: { ...(p[o.id] || {}), guest_additional_phone: v },
                                  }));
                                }}
                              />
                            </div>
                          </td>

                          <td data-label={t("admin.ordersPage.cc.table.region") + " / " + t("admin.ordersPage.cc.table.city")} className="px-3 py-3">
                            <div className="flex min-w-0 flex-col gap-2 sm:min-w-[180px]">
                              <div className="grid grid-cols-2 gap-2">
                              <select
                                key={ccValidationErrors[o.id]?.region ? `region-shake-${o.id}-${ccValidationShakeTick}` : `region-${o.id}`}
                                className={
                                  selectBase + " min-h-[44px] w-full " +
                                  (ccValidationErrors[o.id]?.region ? " border-red-500 ring-2 ring-red-200 cc-shake-run" : "")
                                }
                                value={ccOverrides[o.id]?.region_id ?? o.region_id ?? ""}
                                onChange={(e) => {
                                  setCcValidationErrors((prev) => {
                                    const next = { ...prev };
                                    if (next[o.id]) {
                                      next[o.id] = { ...next[o.id], region: false };
                                      if (!next[o.id].region && !next[o.id].city) delete next[o.id];
                                    }
                                    return next;
                                  });
                                  const regionId = e.target.value;
                                  if (regionId) loadCitiesForRegion(regionId);
                                  setCcOrders((prev) =>
                                    prev.map((x) => (x.id !== o.id ? x : { ...x, region_id: regionId, order_city_id: "" }))
                                  );
                                  setCcOverrides((p) => ({
                                    ...p,
                                    [o.id]: { ...(p[o.id] || {}), region_id: regionId, order_city_id: "" },
                                  }));
                                }}
                              >
                                <option value="">— {t("admin.ordersPage.cc.regionPlaceholder", { defaultValue: "Регион" })} —</option>
                                {regions.map((r) => (
                                  <option key={r.id} value={r.id}>{r.name}</option>
                                ))}
                              </select>
                              <select
                                key={ccValidationErrors[o.id]?.city ? `city-shake-${o.id}-${ccValidationShakeTick}` : `city-${o.id}`}
                                className={
                                  selectBase + " min-h-[44px] w-full " +
                                  (ccValidationErrors[o.id]?.city ? " border-red-500 ring-2 ring-red-200 cc-shake-run" : "")
                                }
                                value={ccOverrides[o.id]?.order_city_id ?? o.order_city_id ?? ""}
                                onChange={(e) => {
                                  setCcValidationErrors((prev) => {
                                    const next = { ...prev };
                                    if (next[o.id]) {
                                      next[o.id] = { ...next[o.id], city: false };
                                      if (!next[o.id].region && !next[o.id].city) delete next[o.id];
                                    }
                                    return next;
                                  });
                                  const orderCityId = e.target.value;
                                  setCcOrders((prev) =>
                                    prev.map((x) => (x.id !== o.id ? x : { ...x, order_city_id: orderCityId }))
                                  );
                                  setCcOverrides((p) => ({
                                    ...p,
                                    [o.id]: { ...(p[o.id] || {}), order_city_id: orderCityId },
                                  }));
                                }}
                              >
                                <option value="">— {t("admin.ordersPage.cc.table.city", { defaultValue: "Город" })} —</option>
                                {(citiesByRegion[ccOverrides[o.id]?.region_id ?? o.region_id ?? ""] || []).map((c) => (
                                  <option key={c.id} value={c.id}>{c.name}</option>
                                ))}
                              </select>
                              </div>
                              <input
                                className={inputBase + " min-h-[44px]"}
                                placeholder={t("admin.ordersPage.cc.addressPlaceholder", { defaultValue: "Адрес доставки" })}
                                value={ccOverrides[o.id]?.delivery_address ?? o.delivery_address ?? ""}
                                onChange={(e) => {
                                  const v = e.target.value;
                                  setCcOrders((prev) =>
                                    prev.map((x) => (x.id !== o.id ? x : { ...x, delivery_address: v }))
                                  );
                                  setCcOverrides((p) => ({
                                    ...p,
                                    [o.id]: { ...(p[o.id] || {}), delivery_address: v },
                                  }));
                                }}
                              />
                            </div>
                          </td>

                          <td data-label={t("admin.ordersPage.cc.table.product")} className="cc-mobile-pair px-3 py-3 text-center">
                            {(() => {
                              const firstItem = o.items && o.items.length > 0 ? o.items[0] : null;
                              const variantId = firstItem?.variant_id;
                              const productInfo = variantId ? productCache[variantId] : null;

                              if (!variantId) {
                                return <span className="text-xs text-slate-400">—</span>;
                              }

                              if (productInfo?.loading) {
                                return (
                                  <div className="flex items-center justify-center">
                                    <div className="h-12 w-12 animate-pulse rounded bg-slate-200" />
                                  </div>
                                );
                              }

                              if (productInfo?.image) {
                                return (
                                  <div 
                                    className="flex flex-col items-center gap-1 cursor-pointer hover:opacity-80 transition-opacity"
                                    onClick={() => {
                                      setProductModal({ open: true, variantId: variantId });
                                    }}
                                  >
                                    <img
                                      src={productInfo.image}
                                      alt={productInfo.name || "Product"}
                                      className="h-16 w-16 rounded-lg object-cover border border-slate-200"
                                      onError={(e) => {
                                        (e.target as HTMLImageElement).src = "/img/NaturalTitanium.jpg";
                                      }}
                                    />
                                    {productInfo.name && (
                                      <span className="max-w-[100px] truncate text-xs text-slate-600" title={productInfo.name}>
                                        {productInfo.name}
                                      </span>
                                    )}
                                  </div>
                                );
                              }

                              // Если продукт не загружен, показываем placeholder
                              return (
                                <div className="flex items-center justify-center">
                                  <div className="h-12 w-12 animate-pulse rounded bg-slate-200" />
                                </div>
                              );
                            })()}
                          </td>

                          <td data-label={t("admin.ordersPage.cc.table.quantity")} className="cc-mobile-pair px-3 py-3">
                            <div className="flex flex-col gap-1.5">
                              {(o.items || []).map((item: any) => {
                                const itemId = item.id;
                                const qty = ccItemQuantities[o.id]?.[itemId] ?? item.quantity ?? 1;
                                return (
                                  <div key={itemId} className="flex items-center gap-1">
                                    <input
                                      type="number"
                                      min={1}
                                      className={inputBase + " w-16 min-h-[44px] text-center"}
                                      value={qty}
                                      onChange={(e) => {
                                        const v = Math.max(1, parseInt(e.target.value, 10) || 1);
                                        setCcItemQuantities((prev) => ({
                                          ...prev,
                                          [o.id]: { ...prev[o.id], [itemId]: v },
                                        }));
                                      }}
                                    />
                                  </div>
                                );
                              })}
                              {(!o.items || o.items.length === 0) && (
                                <span className="text-xs text-slate-400">—</span>
                              )}
                            </div>
                          </td>

                          <td data-label={t("admin.ordersPage.cc.table.status")} className="cc-mobile-pair px-3 py-3 text-center">
                            <StatusBadge value={o.status} />
                          </td>

                          <td data-label={t("admin.ordersPage.cc.table.time")} className="cc-mobile-pair px-3 py-3 text-center text-xs text-slate-600">
                            {o.created_at ? new Date(o.created_at).toLocaleString() : "—"}
                          </td>

                          <td data-label={t("admin.ordersPage.cc.table.comment")} className="px-3 py-3">
                            <div className="flex flex-col gap-2">
                              <input
                                className={inputBase + " min-h-[44px]"}
                                placeholder={t("admin.ordersPage.cc.commentPlaceholder")}
                                value={ccComments[o.id] ?? (o.order_comment || "")}
                                onChange={(e) =>
                                  setCcComments((prev) => ({ ...prev, [o.id]: e.target.value }))
                                }
                              />
                              <div className="hidden flex-col gap-1 sm:flex">
                                <input
                                  className={inputBase + " min-h-[44px]"}
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

                          <td data-label={t("admin.ordersPage.cc.table.actions")} className="px-3 py-3 cc-mobile-actions">
                            <div className="flex h-full w-full min-h-[52px] items-stretch justify-center gap-2 sm:min-h-0">
                              <button
                                className={btnIcon + " order-2 min-h-[48px] flex-1 rounded-2xl px-4 sm:order-1 sm:min-h-0 sm:flex-none sm:h-10 sm:w-10 sm:px-0 sm:rounded-xl " + btnGreen}
                                title="Qabul qilish"
                                disabled={o.status === "accepted" || o.status === "cancelled"}
                                onClick={async () => {
                                  try {
                                    const ov = ccOverrides[o.id] || {};
                                    const regionId = ov.region_id ?? o.region_id;
                                    const orderCityId = ov.order_city_id ?? o.order_city_id;
                                    if (!regionId || !orderCityId) {
                                      setCcValidationErrors((prev) => ({
                                        ...prev,
                                        [o.id]: { region: !regionId, city: !orderCityId },
                                      }));
                                      setCcValidationShakeTick((t) => t + 1);
                                      setTimeout(() => {
                                        setCcValidationErrors((prev) => {
                                          const next = { ...prev };
                                          delete next[o.id];
                                          return next;
                                        });
                                      }, 3000);
                                      return;
                                    }
                                    setCcValidationErrors((prev) => {
                                      const next = { ...prev };
                                      delete next[o.id];
                                      return next;
                                    });
                                    const commentVal = (ccComments[o.id] || o.order_comment || "").trim() || " ";
                                    const items = (o.items || []).map((item: any) => ({
                                      order_item_id: item.id,
                                      quantity: ccItemQuantities[o.id]?.[item.id] ?? item.quantity ?? 1,
                                    }));
                                    const payload: any = {
                                      order_comment: commentVal,
                                      status: "accepted",
                                      items,
                                    };
                                    if (orderCityId) payload.order_city_id = orderCityId;
                                    if (regionId) payload.region_id = regionId;
                                    payload.delivery_address = (ov.delivery_address ?? o.delivery_address ?? "").trim() || undefined;
                                    payload.guest_additional_phone = (ov.guest_additional_phone ?? o.guest_additional_phone ?? "").trim() || undefined;
                                    if (!payload.order_city_id && (o.city || "").trim()) payload.city = (o.city || "").trim();
                                    if (!payload.region_id && (o.order_region || "").trim()) payload.region = (o.order_region || "").trim();
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
                                className={btnIcon + " order-1 min-h-[48px] flex-1 rounded-2xl px-4 sm:order-2 sm:min-h-0 sm:flex-none sm:h-10 sm:w-10 sm:px-0 sm:rounded-xl " + btnRed}
                                title="Rad etish"
                                disabled={o.status === "accepted" || o.status === "cancelled"}
                                onClick={async () => {
                                  try {
                                    const ov = ccOverrides[o.id] || {};
                                    const regionId = ov.region_id ?? o.region_id;
                                    const orderCityId = ov.order_city_id ?? o.order_city_id;
                                    const commentVal = (ccComments[o.id] || o.order_comment || "").trim() || " ";
                                    const items = (o.items || []).map((item: any) => ({
                                      order_item_id: item.id,
                                      quantity: ccItemQuantities[o.id]?.[item.id] ?? item.quantity ?? 1,
                                    }));
                                    const payload: any = {
                                      order_comment: commentVal,
                                      status: "cancelled",
                                      items,
                                    };
                                    if (orderCityId) payload.order_city_id = orderCityId;
                                    if (regionId) payload.region_id = regionId;
                                    payload.delivery_address = (ov.delivery_address ?? o.delivery_address ?? "").trim() || undefined;
                                    payload.guest_additional_phone = (ov.guest_additional_phone ?? o.guest_additional_phone ?? "").trim() || undefined;
                                    if (!payload.order_city_id && (o.city || "").trim()) payload.city = (o.city || "").trim();
                                    if (!payload.region_id && (o.order_region || "").trim()) payload.region = (o.order_region || "").trim();
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

                              {o.status !== "accepted" && o.status !== "cancelled" && (
                                <button
                                  className={btnIcon + " order-3 min-h-[48px] flex-1 rounded-2xl px-4 sm:flex-none sm:px-0 sm:rounded-xl sm:h-10 sm:w-10 " + btnAmber}
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

                                      const ov = ccOverrides[o.id] || {};
                                      const regionId = ov.region_id ?? o.region_id;
                                      const orderCityId = ov.order_city_id ?? o.order_city_id;
                                      const items = (o.items || []).map((item: any) => ({
                                        order_item_id: item.id,
                                        quantity: ccItemQuantities[o.id]?.[item.id] ?? item.quantity ?? 1,
                                      }));
                                      const payload: any = {
                                        order_comment: composed,
                                        status: "processing",
                                        items,
                                      };
                                      if (orderCityId) payload.order_city_id = orderCityId;
                                      if (regionId) payload.region_id = regionId;
                                      payload.delivery_address = (ov.delivery_address ?? o.delivery_address ?? "").trim() || undefined;
                                      payload.guest_additional_phone = (ov.guest_additional_phone ?? o.guest_additional_phone ?? "").trim() || undefined;
                                      if (!payload.order_city_id && (o.city || "").trim()) payload.city = (o.city || "").trim();
                                      if (!payload.region_id && (o.order_region || "").trim()) payload.region = (o.order_region || "").trim();
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
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                  })}

                {(!filteredCc || filteredCc.length === 0) && (
                  <tr className="border-t border-slate-200">
                    <td colSpan={8} data-label="" className="px-3 py-6 text-center text-sm text-slate-500">
                      Hali buyurtmalar yo&apos;q
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {filteredCc && filteredCc.length > 0 && (
            <div className="mt-3 flex flex-col gap-3 sm:mt-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
              <div className="text-xs text-slate-500">
                Page {ccPage} of {Math.max(1, Math.ceil(filteredCc.length / ccLimit))}
              </div>

              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-2">
                <select
                  className={selectBase + " min-h-[44px] w-full sm:w-auto"}
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
                    className={btnBase + " min-h-[44px] flex-1 px-4 sm:h-10 sm:flex-none " + btnMuted}
                    disabled={ccPage <= 1}
                    onClick={() => setCcPage((p) => Math.max(1, p - 1))}
                  >
                    Prev
                  </button>
                  <button
                    className={btnBase + " min-h-[44px] flex-1 px-4 sm:h-10 sm:flex-none " + btnMuted}
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
        </section>
      )}

      {/* Модальное окно продукта — фиксировано по центру экрана при любом скролле (портал в body) */}
      {productModal.open && productModal.variantId && createPortal(
        <div 
          className="fixed inset-0 z-[1100] flex items-center justify-center bg-black/50 p-4 overflow-hidden"
          onClick={() => setProductModal({ open: false, variantId: null })}
        >
          <div 
            className="relative w-full max-w-2xl rounded-2xl bg-white shadow-xl overflow-y-auto"
            style={{ maxHeight: 'min(85vh, calc(100vh - 2rem))' }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="absolute right-4 top-4 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 transition-colors"
              onClick={() => setProductModal({ open: false, variantId: null })}
              aria-label="Закрыть"
            >
              ×
            </button>

            {(() => {
              const productInfo = productCache[productModal.variantId!];
              
              if (!productInfo || productInfo.loading) {
                return (
                  <div className="flex items-center justify-center p-12">
                    <div className="h-12 w-12 animate-pulse rounded bg-slate-200" />
                  </div>
                );
              }

              return (
                <div className="p-6">
                  <div className="mb-6 flex flex-col gap-4 md:flex-row">
                    <div className="flex-shrink-0">
                      <img
                        src={productInfo.image || "/img/NaturalTitanium.jpg"}
                        alt={productInfo.name || "Product"}
                        className="h-64 w-64 rounded-xl object-cover border border-slate-200"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = "/img/NaturalTitanium.jpg";
                        }}
                      />
                    </div>
                    <div className="flex-1">
                      <h2 className="mb-2 text-2xl font-bold text-slate-900">
                        {productInfo.name || "—"}
                      </h2>
                      {productInfo.category && (
                        <div className="mb-3">
                          <span className="inline-block rounded-full bg-indigo-100 px-3 py-1 text-xs font-semibold text-indigo-700">
                            {productInfo.category.name}
                          </span>
                        </div>
                      )}
                      <div className="mb-4 flex items-center gap-3">
                        {productInfo.price && (
                          <span className="text-2xl font-bold text-slate-900">
                            {productInfo.price.toLocaleString()} сум
                          </span>
                        )}
                        {productInfo.base_price && productInfo.base_price > (productInfo.price || 0) && (
                          <span className="text-lg text-slate-500 line-through">
                            {productInfo.base_price.toLocaleString()} сум
                          </span>
                        )}
                      </div>
                      {productInfo.stock !== undefined && (
                        <div className="mb-4">
                          <span className={`inline-block rounded-full px-3 py-1 text-xs font-semibold ${
                            productInfo.stock > 0 
                              ? "bg-emerald-100 text-emerald-700" 
                              : "bg-rose-100 text-rose-700"
                          }`}>
                            {productInfo.stock > 0 ? `В наличии: ${productInfo.stock} шт.` : "Нет в наличии"}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {productInfo.variants && productInfo.variants.length > 0 && (
                    <div className="mb-6">
                      <h3 className="mb-3 text-lg font-semibold text-slate-900">Варианты</h3>
                      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                        {productInfo.variants.map((variant: any) => (
                          <div
                            key={variant.id}
                            className={`rounded-lg border p-3 ${
                              variant.id === productModal.variantId
                                ? "border-indigo-500 bg-indigo-50"
                                : "border-slate-200 bg-slate-50"
                            }`}
                          >
                            <div className="mb-2 text-sm font-semibold text-slate-900">
                              {variant.attribute_values?.map((av: any) => av.value).join(", ") || "Вариант"}
                            </div>
                            <div className="text-xs text-slate-600">
                              Цена: {variant.price?.toLocaleString() || 0} сум
                            </div>
                            <div className="text-xs text-slate-600">
                              Остаток: {variant.stock || 0} шт.
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {productInfo.description && (
                    <div className="mb-6">
                      <h3 className="mb-2 text-lg font-semibold text-slate-900">Описание</h3>
                      <p className="whitespace-pre-line text-sm text-slate-600">
                        {productInfo.description}
                      </p>
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
