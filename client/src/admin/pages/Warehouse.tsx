import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import apiClient, { warehouseAPI, orderAPI } from '../../services/api';
import { getProductImageUrl, truncateText } from '../../utils/helpers';
import { resolveProductDescription, resolveProductName } from '../../utils/productUtils';
import { getRegions, getLocationById } from '../../data/uzbekistanLocations';

type SectionKey = 'orders' | 'add' | 'warehouses';

export default function Warehouse() {
  const { t } = useTranslation();
  const location = useLocation();
  const ordersRef = useRef<HTMLDivElement>(null);
  const addRef = useRef<HTMLDivElement>(null);
  const warehousesRef = useRef<HTMLDivElement>(null);
  const selectAllCheckboxRef = useRef<HTMLInputElement | null>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [ordersError, setOrdersError] = useState<string | null>(null);
  const [ordersActionId, setOrdersActionId] = useState<string | null>(null);
  const [myOrders, setMyOrders] = useState<any[]>([]);
  const [myOrdersLoading, setMyOrdersLoading] = useState(false);
  const [myOrdersError, setMyOrdersError] = useState<string | null>(null);
  const [myOffset, setMyOffset] = useState(0);
  const [myLimit, setMyLimit] = useState(10);
  const [myActionId, setMyActionId] = useState<string | null>(null);
  const [selectedLabelIds, setSelectedLabelIds] = useState<Set<string>>(new Set());
  const [printSelectedLoading, setPrintSelectedLoading] = useState(false);
  const [myOrdersDeliveryFilter, setMyOrdersDeliveryFilter] = useState<string>('');
  const [orderStatsByCity, setOrderStatsByCity] = useState<Array<{ order_region: string; count: number }>>([]);
  const [orderStatsLoading, setOrderStatsLoading] = useState(false);
  const [packedPdfDate, setPackedPdfDate] = useState<string>(() => {
    const d = new Date();
    return d.toISOString().slice(0, 10);
  });
  const [packedPdfCity, setPackedPdfCity] = useState<string>('');
  const [packedPdfLoading, setPackedPdfLoading] = useState(false);
  const [packedPdfError, setPackedPdfError] = useState<string | null>(null);
  const [locations, setLocations] = useState<any[]>([]);
  const [locationsLoading, setLocationsLoading] = useState(false);
  const [locationsError, setLocationsError] = useState<string | null>(null);
  const [locationFilter, setLocationFilter] = useState<'all' | 'free' | 'full'>('all');
  const [productCache, setProductCache] = useState<
    Record<
      string,
      {
        product_id?: string;
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
  const [productModal, setProductModal] = useState<{ open: boolean; variantId: string | null }>({
    open: false,
    variantId: null,
  });
  const [productLocations, setProductLocations] = useState<
    Record<string, { items: any[]; loading?: boolean; error?: string }>
  >({});
  const statusLabels = useMemo(
    () => ({
      pending: t('admin.ordersPage.statuses.pending', { defaultValue: 'В ожидании' }),
      accepted: t('admin.ordersPage.statuses.accepted', { defaultValue: 'Принят' }),
      packing: t('admin.ordersPage.statuses.packing', { defaultValue: 'Упаковывается' }),
      packed: t('admin.ordersPage.statuses.packed', { defaultValue: 'Упакован' }),
      processing: t('admin.ordersPage.statuses.processing', { defaultValue: 'В обработке' }),
      shipped: t('admin.ordersPage.statuses.shipped', { defaultValue: 'Отправлен' }),
      delivered: t('admin.ordersPage.statuses.delivered', { defaultValue: 'Доставлен' }),
      cancelled: t('admin.ordersPage.statuses.cancelled', { defaultValue: 'Отменён' }),
      refunded: t('admin.ordersPage.statuses.refunded', { defaultValue: 'Возврат' }),
      paid: t('admin.ordersPage.statuses.paid', { defaultValue: 'Оплачен' }),
    }) as Record<string, string>,
    [t]
  );
  const statusTone: Record<string, string> = {
    pending: 'bg-amber-100 text-amber-800',
    accepted: 'bg-emerald-100 text-emerald-700',
    packing: 'bg-blue-100 text-blue-700',
    packed: 'bg-blue-100 text-blue-700',
    processing: 'bg-sky-100 text-sky-700',
    shipped: 'bg-cyan-100 text-cyan-700',
    delivered: 'bg-emerald-100 text-emerald-700',
    cancelled: 'bg-rose-100 text-rose-700',
    refunded: 'bg-amber-100 text-amber-800',
    paid: 'bg-emerald-100 text-emerald-700',
  };
  const renderStatus = (code?: string) => {
    const key = String(code || '').toLowerCase();
    return (
      <span
        className={[
          'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold',
          statusTone[key] || 'bg-slate-100 text-slate-700',
        ].join(' ')}
      >
        {statusLabels[key] || code || '—'}
      </span>
    );
  };

  const activeKey: SectionKey = useMemo(() => {
    if (location.pathname.includes('/warehouse/add')) return 'add';
    if (location.pathname.includes('/warehouse/locations')) return 'warehouses';
    return 'orders';
  }, [location.pathname]);

  const deliveryFilterOptions = useMemo(() => {
    const regions = getRegions();
    const tashkentCity = getLocationById('tashkent');
    const tashkentRegion = getLocationById('tashkent_region');
    const otherRegions = regions.filter((r) => r.id !== 'tashkent_region');
    const list = [
      { id: '', name: t('admin.warehouse.filterAll', { defaultValue: 'Все' }) },
      ...(tashkentCity ? [tashkentCity] : []),
      ...(tashkentRegion ? [tashkentRegion] : []),
      ...otherRegions,
    ];
    return list;
  }, [t]);

  const myOrdersStatusOrder = (s: string) => {
    const v = String(s || '').toLowerCase();
    if (v === 'packing') return 0;
    if (v === 'packed') return 1;
    return 2;
  };

  const myOrdersFiltered = useMemo(() => {
    const list = !myOrdersDeliveryFilter
      ? myOrders
      : myOrders.filter(
          (o) =>
            String(o?.order_region || '').toLowerCase() === myOrdersDeliveryFilter.toLowerCase() ||
            String(o?.city || '').toLowerCase() === myOrdersDeliveryFilter.toLowerCase()
        );
    return [...list].sort((a: any, b: any) => {
      const pa = myOrdersStatusOrder(a?.status);
      const pb = myOrdersStatusOrder(b?.status);
      if (pa !== pb) return pa - pb;
      const ta = a?.created_at ? new Date(a.created_at).getTime() : 0;
      const tb = b?.created_at ? new Date(b.created_at).getTime() : 0;
      return tb - ta;
    });
  }, [myOrders, myOrdersDeliveryFilter]);

  const packedOrderIds = useMemo(
    () => myOrdersFiltered.filter((o) => String(o?.status || '').toLowerCase() === 'packed').map((o) => String(o.id)),
    [myOrdersFiltered]
  );

  const toggleSelectLabel = useCallback((id: string) => {
    setSelectedLabelIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const selectAllLabels = useCallback(() => {
    setSelectedLabelIds((prev) => {
      const allSelected = packedOrderIds.length > 0 && packedOrderIds.every((id) => prev.has(id));
      return allSelected ? new Set() : new Set(packedOrderIds);
    });
  }, [packedOrderIds]);

  useEffect(() => {
    const el = selectAllCheckboxRef.current;
    if (!el) return;
    const some = selectedLabelIds.size > 0;
    const all = packedOrderIds.length > 0 && selectedLabelIds.size >= packedOrderIds.length;
    el.indeterminate = some && !all;
  }, [selectedLabelIds, packedOrderIds.length]);

  const printSelectedLabels = useCallback(async () => {
    const ids = Array.from(selectedLabelIds);
    if (ids.length === 0) {
      alert(t('admin.warehouse.printSelectNone', { defaultValue: 'Выберите хотя бы один заказ для печати этикеток.' }));
      return;
    }
    setPrintSelectedLoading(true);
    try {
      if (ids.length === 1) {
        await warehouseAPI.printOrderLabelPdf(ids[0]);
      } else {
        await warehouseAPI.printOrdersLabelsPdf(ids);
      }
    } catch (err: any) {
      const msg = err?.message || err?.response?.data?.detail || 'Ошибка печати';
      alert(msg);
    } finally {
      setPrintSelectedLoading(false);
    }
  }, [selectedLabelIds, t]);

  const fetchWarehouseOrders = useCallback(async () => {
    if (activeKey !== 'orders') return;
    let ignore = false;
    try {
      setOrdersLoading(true);
      setOrdersError(null);
      const res = await warehouseAPI.getOrders({ offset: 0, limit: 20 });
      if (ignore) return;
      const payload = res.data as any;
      const data = Array.isArray(payload) ? payload : payload?.results || payload?.items || payload?.data || [];
      const sorted = [...data].sort((a: any, b: any) => {
        const ta = a?.created_at ? new Date(a.created_at).getTime() : 0;
        const tb = b?.created_at ? new Date(b.created_at).getTime() : 0;
        return tb - ta;
      });
      setOrders(sorted);
    } catch (e: any) {
      setOrdersError(e?.response?.data?.detail || e?.message || 'Ошибка загрузки заказов склада');
    } finally {
      setOrdersLoading(false);
    }
    return () => {
      ignore = true;
    };
  }, [activeKey]);

  const fetchMyOrders = useCallback(async () => {
    if (activeKey !== 'orders') return;
    let ignore = false;
    try {
      setMyOrdersLoading(true);
      setMyOrdersError(null);
      const res = await warehouseAPI.getMyOrders({ offset: myOffset, limit: myLimit });
      if (ignore) return;
      const payload = res.data as any;
      const data = Array.isArray(payload) ? payload : payload?.results || payload?.items || payload?.data || [];
      const statusOrder = (s: string) => {
        const v = String(s || '').toLowerCase();
        if (v === 'packing') return 0;
        if (v === 'packed') return 1;
        return 2;
      };
      const sorted = [...data].sort((a: any, b: any) => {
        const pa = statusOrder(a?.status);
        const pb = statusOrder(b?.status);
        if (pa !== pb) return pa - pb;
        const ta = a?.created_at ? new Date(a.created_at).getTime() : 0;
        const tb = b?.created_at ? new Date(b.created_at).getTime() : 0;
        return tb - ta;
      });
      setMyOrders(sorted);
    } catch (e: any) {
      setMyOrdersError(e?.response?.data?.detail || e?.message || 'Ошибка загрузки моих заказов');
    } finally {
      setMyOrdersLoading(false);
    }
    return () => {
      ignore = true;
    };
  }, [activeKey, myOffset, myLimit]);

  const loadProductByVariantId = useCallback(async (variantId: string) => {
    if (!variantId) return;

    setProductCache((prev) => {
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
      const variant = productData.variants?.find((v: any) => v.id === variantId) || productData.variants?.[0];

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
          product_id: productData?.product_id || productData?.id || "",
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
    } catch {
      setProductCache((prev) => ({
        ...prev,
        [variantId]: { name: "", image: "", loading: false },
      }));
    }
  }, []);

  const loadProductLocations = useCallback(async (productId: string) => {
    if (!productId) return;
    setProductLocations((prev) => {
      if (prev[productId]?.loading || prev[productId]?.items?.length) {
        return prev;
      }
      return { ...prev, [productId]: { items: [], loading: true } };
    });

    try {
      const res = await apiClient.get(`/warehouse/product/${productId}/locations`);
      const data = Array.isArray(res.data) ? res.data : res.data?.data || [];
      setProductLocations((prev) => ({
        ...prev,
        [productId]: { items: data, loading: false },
      }));
    } catch (error: any) {
      setProductLocations((prev) => ({
        ...prev,
        [productId]: {
          items: [],
          loading: false,
          error: error?.response?.data?.detail || error?.message || "Ошибка загрузки локаций",
        },
      }));
    }
  }, []);

  useEffect(() => {
    fetchWarehouseOrders();
  }, [fetchWarehouseOrders]);

  useEffect(() => {
    fetchMyOrders();
  }, [fetchMyOrders]);

  useEffect(() => {
    (myOrders || []).forEach((o: any) => {
      (o?.items || []).forEach((item: any) => {
        const vid = item?.variant_id != null ? String(item.variant_id) : '';
        if (vid && !productCache[vid]) {
          loadProductByVariantId(vid);
        }
      });
    });
  }, [myOrders, productCache, loadProductByVariantId]);

  useEffect(() => {
    if (productModal.open && productModal.variantId) {
      const productInfo = productCache[productModal.variantId];
      if (!productInfo || productInfo.loading) {
        loadProductByVariantId(productModal.variantId);
      }
      const productId = productInfo?.product_id;
      if (productId) {
        loadProductLocations(productId);
      }
    }
  }, [productModal.open, productModal.variantId, productCache, loadProductByVariantId, loadProductLocations]);

  useEffect(() => {
    if (productModal.open) {
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = "";
      };
    }
    return undefined;
  }, [productModal.open]);

  useEffect(() => {
    if (activeKey !== 'warehouses') return;
    let ignore = false;
    const load = async () => {
      try {
        setLocationsLoading(true);
        setLocationsError(null);
        const res = await warehouseAPI.getLocations({ filter: locationFilter });
        if (ignore) return;
        const payload = res.data as any;
        const data = Array.isArray(payload) ? payload : payload?.results || payload?.data || [];
        setLocations(data);
      } catch (e: any) {
        if (ignore) return;
        setLocationsError(e?.response?.data?.detail || e?.message || 'Ошибка загрузки мест на складе');
      } finally {
        if (!ignore) setLocationsLoading(false);
      }
    };
    load();
    return () => {
      ignore = true;
    };
  }, [activeKey, locationFilter]);

  useEffect(() => {
    if (activeKey !== 'orders') return;
    let ignore = false;
    const fetchStats = async () => {
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
  }, [activeKey]);

  const getCityLabel = (orderRegion: string) => {
    const region = getRegions().find((r) => r.id === orderRegion);
    if (region) return region.name;
    const city = getLocationById(orderRegion);
    return city?.name || orderRegion;
  };

  const getPackedPdfErrorMessage = (err: any): string => {
    const status = err?.response?.status;
    const detail = err?.response?.data?.detail;
    const msg = typeof detail === 'string' ? detail : (typeof err?.message === 'string' ? err.message : '');
    const isNotFound =
      status === 404 ||
      (msg && (msg.includes('Заказы не найдены') || msg.includes('не найдены') || msg.includes('не найден') || msg.toLowerCase().includes('not found')));
    if (isNotFound) {
      return t('admin.warehouse.packedPdfNoOrders', { defaultValue: 'По выбранной дате и городу заказов не найдено.' });
    }
    return msg || '';
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 p-4 md:p-6 space-y-6">
      {activeKey === 'orders' && (
        <section ref={ordersRef} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="mb-2 text-lg font-bold">
            {t('admin.warehouse.nav.orders', { defaultValue: 'Заказы' })}
          </h2>
          {/* Статистика по городам (актуальные заказы) */}
          <div className="mb-4 rounded-xl border border-slate-200 bg-slate-50/70 px-4 py-3">
            <div className="mb-2 text-sm font-bold text-slate-700">
              {t('admin.ordersPage.statsByCity', { defaultValue: 'Актуальные заказы по городам' })}
            </div>
            {orderStatsLoading ? (
              <div className="flex flex-wrap gap-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <span key={i} className="h-8 w-24 animate-pulse rounded-xl bg-slate-200" />
                ))}
              </div>
            ) : orderStatsByCity.length === 0 ? (
              <p className="text-xs text-slate-500">
                {t('admin.ordersPage.statsEmpty', { defaultValue: 'Нет заказов на данный момент' })}
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {orderStatsByCity.map((row) => (
                  <span
                    key={row.order_region}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-white px-3 py-1.5 text-sm font-semibold text-slate-800 shadow-sm"
                  >
                    <span>{getCityLabel(row.order_region)}</span>
                    <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-800">
                      {row.count}
                    </span>
                  </span>
                ))}
              </div>
            )}
          </div>
          {/* Распечатка по дате: PDF упакованных заказов по городу и дате */}
          <div className="mb-4 rounded-xl border border-slate-200 bg-slate-50/70 px-4 py-3">
            <div className="mb-2 text-sm font-bold text-slate-700">
              {t('admin.warehouse.packedPdfByDate', { defaultValue: 'Распечатка по дате' })}
            </div>
            <p className="mb-3 text-xs text-slate-600">
              {t('admin.warehouse.packedPdfByDateHint', { defaultValue: 'Скачать или распечатать PDF упакованных заказов по выбранной дате и городу.' })}
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <span>{t('admin.warehouse.date', { defaultValue: 'Дата:' })}</span>
                <input
                  type="date"
                  value={packedPdfDate}
                  onChange={(e) => { setPackedPdfDate(e.target.value); setPackedPdfError(null); }}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-800 shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                />
              </label>
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <span>{t('admin.warehouse.city', { defaultValue: 'Город:' })}</span>
                <select
                  value={packedPdfCity}
                  onChange={(e) => { setPackedPdfCity(e.target.value); setPackedPdfError(null); }}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-800 shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 min-w-[180px]"
                >
                  <option value="">{t('admin.warehouse.selectCity', { defaultValue: 'Выберите город' })}</option>
                  {deliveryFilterOptions.filter((o) => o.id).map((opt) => (
                    <option key={opt.id} value={opt.id}>
                      {opt.name}
                    </option>
                  ))}
                </select>
              </label>
              <button
                type="button"
                disabled={!packedPdfDate || !packedPdfCity || packedPdfLoading}
                onClick={async () => {
                  if (!packedPdfDate || !packedPdfCity) return;
                  setPackedPdfError(null);
                  setPackedPdfLoading(true);
                  try {
                    await warehouseAPI.downloadPackedOrdersPdf(packedPdfCity, packedPdfDate);
                  } catch (err: any) {
                    const msg = getPackedPdfErrorMessage(err) || t('admin.warehouse.downloadPdfError', { defaultValue: 'Ошибка загрузки PDF' });
                    setPackedPdfError(msg);
                  } finally {
                    setPackedPdfLoading(false);
                  }
                }}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <svg className="size-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                {packedPdfLoading ? (t('common.loading') || 'Загрузка...') : (t('admin.warehouse.downloadPdf', { defaultValue: 'Скачать PDF' }))}
              </button>
              <button
                type="button"
                disabled={!packedPdfDate || !packedPdfCity || packedPdfLoading}
                onClick={async () => {
                  if (!packedPdfDate || !packedPdfCity) return;
                  setPackedPdfError(null);
                  setPackedPdfLoading(true);
                  try {
                    await warehouseAPI.printPackedOrdersPdf(packedPdfCity, packedPdfDate);
                  } catch (err: any) {
                    const msg = getPackedPdfErrorMessage(err) || t('admin.warehouse.printPdfError', { defaultValue: 'Ошибка печати PDF' });
                    setPackedPdfError(msg);
                  } finally {
                    setPackedPdfLoading(false);
                  }
                }}
                className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-sm font-medium text-emerald-800 shadow-sm hover:bg-emerald-100 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <svg className="size-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                </svg>
                {packedPdfLoading ? (t('admin.warehouse.printing', { defaultValue: 'Печать…' }) || 'Печать…') : (t('admin.warehouse.printPdf', { defaultValue: 'Печать' }))}
              </button>
            </div>
            {packedPdfError && (
              <div className="mt-3 flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                <svg className="size-5 shrink-0 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>{packedPdfError}</span>
                <button
                  type="button"
                  onClick={() => setPackedPdfError(null)}
                  className="ml-auto rounded p-1 text-amber-600 hover:bg-amber-100 hover:text-amber-800"
                  aria-label={t('common.close', { defaultValue: 'Закрыть' })}
                >
                  <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            )}
          </div>
          {ordersLoading && <p className="text-sm text-slate-500">{t('common.loading') || 'Загрузка...'}</p>}
          {ordersError && <p className="text-sm text-rose-600">{ordersError}</p>}
          {!ordersLoading && !ordersError && (
            <div className="overflow-x-auto mt-2">
              <table className="w-full overflow-hidden rounded-xl border border-slate-200 bg-white text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-3 py-2 text-left">#</th>
                    <th className="px-3 py-2 text-left">{t('admin.ordersPage.table.status') || 'Статус'}</th>
                    <th className="px-3 py-2 text-left">{t('admin.ordersPage.table.location', { defaultValue: 'Адрес доставки' }) || 'Адрес доставки'}</th>
                    <th className="px-3 py-2 text-left">{t('admin.ordersPage.table.date', { defaultValue: 'Дата' }) || 'Дата'}</th>
                    <th className="px-3 py-2 text-left">{t('admin.ordersPage.table.action') || 'Действие'}</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-3 py-3 text-center text-slate-500">
                        {t('common.empty', { defaultValue: 'Нет заказов на данный момент' })}
                      </td>
                    </tr>
                  )}
                  {orders.map((o, idx) => (
                    <tr key={o.id || idx} className="border-t border-slate-200 hover:bg-slate-50">
                      <td className="px-3 py-2 text-slate-700">{idx + 1}</td>
                      <td className="px-3 py-2">{renderStatus(o.status)}</td>
                      <td className="px-3 py-2 text-slate-700">
                        {[o.city, o.order_region].filter(Boolean).join(', ') || '—'}
                      </td>
                      <td className="px-3 py-2 text-slate-700">
                        {o.created_at ? new Date(o.created_at).toLocaleString('ru-RU') : '—'}
                      </td>
                      <td className="px-3 py-2">
                        <button
                          className="grid h-10 w-10 place-items-center rounded-lg bg-gradient-to-br from-emerald-500 to-emerald-600 text-white shadow cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                          title={t('admin.ordersPage.actions.start') || 'Принять'}
                          disabled={ordersActionId === o.id}
                          onClick={async () => {
                            try {
                              setOrdersActionId(o.id);
                              await warehouseAPI.submitOrder(o.id);
                              const acceptedOrder = { ...o, status: 'accepted' };
                              setOrders((prev) => prev.filter((order) => order.id !== o.id));
                              setMyOrders((prev) => [acceptedOrder, ...prev]);
                              // Сразу подгружаем картинки товаров для нового заказа (чтобы отображались без перезагрузки)
                              (acceptedOrder?.items || []).forEach((item: any) => {
                                const vid = item?.variant_id != null ? String(item.variant_id) : '';
                                if (vid) loadProductByVariantId(vid);
                              });
                              // В фоне подгружаем полный список «Мои заказы», чтобы новая строка имела все поля (товар, номер заказа)
                              warehouseAPI.getMyOrders({ offset: myOffset, limit: myLimit }).then((res) => {
                                const payload = res.data as any;
                                const data = Array.isArray(payload) ? payload : payload?.results || payload?.items || payload?.data || [];
                                const sorted = [...data].sort((a: any, b: any) => {
                                  const ta = a?.created_at ? new Date(a.created_at).getTime() : 0;
                                  const tb = b?.created_at ? new Date(b.created_at).getTime() : 0;
                                  return tb - ta;
                                });
                                setMyOrders((prev) => {
                                  const serverIds = new Set((sorted || []).map((x: any) => x.id));
                                  const optimisticOnly = prev.filter((x: any) => x.id && !serverIds.has(x.id));
                                  const merged = [...(sorted || []), ...optimisticOnly];
                                  if (optimisticOnly.length > 0) {
                                    setTimeout(() => fetchMyOrders(), 800);
                                  }
                                  return merged.length ? merged : prev;
                                });
                              }).catch(() => {});
                            } catch (e) {
                              // ignore
                            } finally {
                              setOrdersActionId(null);
                            }
                          }}
                        >
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <div className="mt-6">
            <div className="mb-3 flex flex-wrap items-center gap-3">
              <h3 className="text-base font-bold text-slate-900">{t('admin.warehouse.nav.orders', { defaultValue: 'Мои заказы' })}</h3>
              <label className="flex items-center gap-2 text-sm text-slate-600">
                <span>{t('admin.warehouse.filterByDelivery', { defaultValue: 'Адрес доставки:' })}</span>
                <select
                  value={myOrdersDeliveryFilter}
                  onChange={(e) => setMyOrdersDeliveryFilter(e.target.value)}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-800 shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                >
                  {deliveryFilterOptions.map((opt) => (
                    <option key={opt.id || 'all'} value={opt.id}>
                      {opt.name}
                    </option>
                  ))}
                </select>
              </label>
              {packedOrderIds.length > 0 && (
                <button
                    type="button"
                    disabled={selectedLabelIds.size === 0 || printSelectedLoading}
                    onClick={printSelectedLabels}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <svg className="size-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                    </svg>
                    {printSelectedLoading
                      ? (t('admin.warehouse.printing', { defaultValue: 'Печать…' }) || 'Печать…')
                      : t('admin.warehouse.printSelected', { defaultValue: `Распечатать выбранные (${selectedLabelIds.size})` })}
                </button>
              )}
            </div>
            {myOrdersLoading && <p className="text-sm text-slate-500">{t('common.loading') || 'Загрузка...'}</p>}
            {myOrdersError && <p className="text-sm text-rose-600">{myOrdersError}</p>}
            {!myOrdersLoading && !myOrdersError && (
              <div className="overflow-x-auto mt-2">
                <table className="w-full overflow-hidden rounded-xl border border-slate-200 bg-white text-sm">
                  <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-2 py-2 text-left w-10">
                        {packedOrderIds.length > 0 ? (
                          <input
                            type="checkbox"
                            ref={selectAllCheckboxRef}
                            checked={packedOrderIds.length > 0 && packedOrderIds.every((id) => selectedLabelIds.has(id))}
                            onChange={selectAllLabels}
                            className="h-4 w-4 rounded border-slate-300"
                            title={t('admin.warehouse.selectAll', { defaultValue: 'Выбрать все' })}
                          />
                        ) : null}
                      </th>
                      <th className="px-3 py-2 text-left">#</th>
                      <th className="px-3 py-2 text-left">{t('admin.ordersPage.table.order') || 'Заказ'}</th>
                      <th className="px-3 py-2 text-left">{t('admin.ordersPage.table.status') || 'Статус'}</th>
                      <th className="px-3 py-2 text-left">{t('admin.ordersPage.table.product', { defaultValue: 'Товар' }) || 'Товар'}</th>
                      <th className="px-3 py-2 text-left">{t('admin.ordersPage.table.location', { defaultValue: 'Адрес доставки' }) || 'Адрес доставки'}</th>
                      <th className="px-3 py-2 text-left">{t('admin.ordersPage.table.comment', { defaultValue: 'Комментарий' }) || 'Комментарий'}</th>
                      <th className="px-3 py-2 text-left">{t('admin.ordersPage.table.total', { defaultValue: 'Кол-во позиций' }) || 'Кол-во позиций'}</th>
                      <th className="px-3 py-2 text-left">{t('admin.ordersPage.table.date', { defaultValue: 'Дата' }) || 'Дата'}</th>
                      <th className="px-3 py-2 text-left">{t('admin.ordersPage.table.action') || 'Действие'}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {myOrdersFiltered.length === 0 && (
                      <tr>
                        <td colSpan={10} className="px-3 py-3 text-center text-slate-500">
                          {myOrdersDeliveryFilter
                            ? (t('admin.warehouse.filterEmpty', { defaultValue: 'Нет заказов по выбранному адресу доставки' }) || 'Нет заказов по выбранному адресу доставки')
                            : (t('common.empty') || 'Нет заказов')}
                        </td>
                      </tr>
                    )}
                    {myOrdersFiltered.map((o, idx) => {
                      const isPacked = String(o?.status || '').toLowerCase() === 'packed';
                      const oid = String(o.id);
                      return (
                      <tr key={o.id || idx} className="border-t border-slate-200 hover:bg-slate-50">
                        <td className="px-2 py-2 w-10">
                          {isPacked ? (
                            <input
                              type="checkbox"
                              checked={selectedLabelIds.has(oid)}
                              onChange={() => toggleSelectLabel(oid)}
                              className="h-4 w-4 rounded border-slate-300"
                              onClick={(e) => e.stopPropagation()}
                            />
                          ) : null}
                        </td>
                        <td className="px-3 py-2 text-slate-700">{idx + 1}</td>
                        <td className="px-3 py-2 text-slate-900 font-semibold">{o.order_number || o.id}</td>
                        <td className="px-3 py-2">{renderStatus(o.status)}</td>
                        <td className="px-3 py-2 text-slate-700">
                          {Array.isArray(o.items) && o.items.length > 0 ? (
                            <div className="flex flex-col gap-2">
                              {o.items.map((item: any) => {
                                const vid = item?.variant_id != null ? String(item.variant_id) : '';
                                const info = vid ? productCache[vid] : null;
                              const img = info?.image;
                              const name = info?.name || item?.product_name || '—';
                              const shortName = name ? truncateText(name, 28) : '—';
                              const isLoading = info?.loading;
                                return (
                                <div
                                  key={item.id || item.variant_id}
                                  className="flex items-center gap-2 cursor-pointer hover:opacity-80"
                                  onClick={() => {
                                    if (item?.variant_id) {
                                      setProductModal({ open: true, variantId: item.variant_id });
                                    }
                                  }}
                                >
                                  {isLoading ? (
                                    <div className="h-10 w-10 animate-pulse rounded bg-slate-200" />
                                  ) : img ? (
                                    <img
                                      src={img}
                                      alt={name}
                                      className="h-10 w-10 rounded-lg object-cover border border-slate-200"
                                      onError={(e) => {
                                        (e.target as HTMLImageElement).src = "/img/NaturalTitanium.jpg";
                                      }}
                                    />
                                  ) : (
                                    <div className="h-10 w-10 rounded-lg border border-dashed border-slate-200 bg-slate-50" />
                                  )}
                                  <div className="text-sm text-slate-700" title={name}>
                                    {shortName}
                                  </div>
                                </div>
                                );
                              })}
                            </div>
                          ) : (
                            '—'
                          )}
                        </td>
                        <td className="px-3 py-2 text-slate-700">
                          {[o.city, o.order_region].filter(Boolean).join(', ') || '—'}
                        </td>
                        <td className="px-3 py-2 text-slate-700">
                          {o.order_comment || '—'}
                        </td>
                        <td className="px-3 py-2 text-slate-700">
                          {Array.isArray(o.items) ? o.items.reduce((sum: number, it: any) => sum + (it?.quantity || 0), 0) : 0}
                        </td>
                        <td className="px-3 py-2 text-slate-700">
                          {o.created_at ? new Date(o.created_at).toLocaleString('ru-RU') : '—'}
                        </td>
                        <td className="px-3 py-2">
                          {String(o.status || '').toLowerCase() === 'packed' ? (
                            <button
                              type="button"
                              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 transition"
                              title={t('admin.warehouse.actions.print', { defaultValue: 'Распечатать' })}
                              onClick={async (e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                try {
                                  await warehouseAPI.printOrderLabelPdf(String(o.id));
                                } catch (err: any) {
                                  const msg = err?.message || err?.response?.data?.detail || 'Ошибка печати этикетки';
                                  alert(msg);
                                }
                              }}
                            >
                              <svg className="size-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                              </svg>
                              <span>{t('admin.warehouse.actions.print', { defaultValue: 'Распечатать' })}</span>
                            </button>
                          ) : (
                            <button
                              className="grid h-10 w-10 place-items-center rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                              title={t('admin.ordersPage.statuses.packed', { defaultValue: 'Упакован' })}
                              disabled={myActionId === o.id}
                              onClick={async () => {
                                try {
                                  setMyActionId(o.id);
                                  await orderAPI.updateStatus(o.id, 'packed');
                                  await fetchMyOrders();
                                } catch {
                                  // ignore
                                } finally {
                                  setMyActionId(null);
                                }
                              }}
                            >
                              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                              </svg>
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                    })}
                  </tbody>
                </table>
              </div>
            )}
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <button
                className="rounded-lg border border-slate-200 bg-white px-3 py-1 text-sm disabled:opacity-50"
                disabled={myOffset <= 0 || myOrdersLoading}
                onClick={() => setMyOffset((p) => Math.max(0, p - myLimit))}
              >
                {t('admin.ordersPage.pagination.prev') || 'Prev'}
              </button>
              <button
                className="rounded-lg border border-slate-200 bg-white px-3 py-1 text-sm disabled:opacity-50"
                disabled={myOrders.length < myLimit || myOrdersLoading}
                onClick={() => setMyOffset((p) => p + myLimit)}
              >
                {t('admin.ordersPage.pagination.next') || 'Next'}
              </button>
              <select
                className="rounded-lg border border-slate-200 bg-white px-3 py-1 text-sm text-slate-700 shadow-sm outline-none focus:border-emerald-500"
                value={myLimit}
                onChange={(e) => {
                  setMyOffset(0);
                  setMyLimit(Number(e.target.value) || 10);
                }}
              >
                {[10, 20, 50].map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </section>
      )}

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
                          <span
                            className={`inline-block rounded-full px-3 py-1 text-xs font-semibold ${
                              productInfo.stock > 0
                                ? "bg-emerald-100 text-emerald-700"
                                : "bg-rose-100 text-rose-700"
                            }`}
                          >
                            {productInfo.stock > 0 ? `В наличии: ${productInfo.stock} шт.` : "Нет в наличии"}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {productInfo.description && (
                    <div className="mb-6">
                      <h3 className="mb-2 text-lg font-semibold text-slate-900">Описание</h3>
                      <p className="whitespace-pre-line text-sm text-slate-600">
                        {productInfo.description}
                      </p>
                    </div>
                  )}

                  {(() => {
                    const productId = productInfo.product_id || "";
                    if (!productId) return null;
                    const loc = productLocations[productId];
                    if (loc?.loading) {
                      return (
                        <div className="mb-6">
                          <h3 className="mb-2 text-lg font-semibold text-slate-900">Расположение на складе</h3>
                          <div className="text-sm text-slate-500">Загрузка...</div>
                        </div>
                      );
                    }
                    if (loc?.error) {
                      return (
                        <div className="mb-6">
                          <h3 className="mb-2 text-lg font-semibold text-slate-900">Расположение на складе</h3>
                          <div className="text-sm text-rose-600">{loc.error}</div>
                        </div>
                      );
                    }
                    if (!loc?.items || loc.items.length === 0) return null;
                    return (
                      <div className="mb-6">
                        <h3 className="mb-2 text-lg font-semibold text-slate-900">Расположение на складе</h3>
                        <div className="grid gap-2 sm:grid-cols-2">
                          {loc.items.map((item: any) => (
                            <div key={item.id} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                              <div className="text-sm font-semibold text-slate-900">{item.code || "—"}</div>
                              <div className="text-xs text-slate-600">{item.description || "—"}</div>
                              <div className="mt-1 text-xs text-slate-500">
                                Остаток: {item.total_stock ?? 0}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })()}

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
                </div>
              );
            })()}
          </div>
        </div>,
        document.body
      )}

      {activeKey === 'add' && (
        <section ref={addRef} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="mb-2 text-lg font-bold">
            {t('admin.warehouse.nav.add', { defaultValue: 'Добавить на склад' })}
          </h2>
          <p className="text-slate-500">
            {t('admin.warehouse.placeholder.sectionAdd', { defaultValue: 'Секция для приёмки/пополнения.' })}
          </p>
        </section>
      )}

      {activeKey === 'warehouses' && (
        <section ref={warehousesRef} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="mb-2 text-lg font-bold">
            {t('admin.warehouse.nav.locations', { defaultValue: 'Склады' })}
          </h2>
          <div className="mb-3 flex flex-wrap items-center gap-2">
            {(['all', 'free', 'full'] as const).map((opt) => (
              <button
                key={opt}
                className={[
                  'rounded-lg border px-3 py-1 text-sm font-semibold transition',
                  locationFilter === opt
                    ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                    : 'border-slate-200 bg-white text-slate-700 hover:border-emerald-400',
                ].join(' ')}
                onClick={() => setLocationFilter(opt)}
              >
                {opt === 'all' && (t('common.all') || 'Все')}
                {opt === 'free' && (t('admin.warehouse.filter.free', { defaultValue: 'Свободные' }) || 'Свободные')}
                {opt === 'full' && (t('admin.warehouse.filter.full', { defaultValue: 'Заполненные' }) || 'Заполненные')}
              </button>
            ))}
          </div>

          {locationsLoading && <p className="text-sm text-slate-500">{t('common.loading') || 'Загрузка...'}</p>}
          {locationsError && <p className="text-sm text-rose-600">{locationsError}</p>}
          {!locationsLoading && !locationsError && (
            <div className="overflow-x-auto">
              <table className="w-full overflow-hidden rounded-xl border border-slate-200 bg-white text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-3 py-2 text-left">#</th>
                    <th className="px-3 py-2 text-left">{t('admin.warehouse.locations.code', { defaultValue: 'Код' }) || 'Код'}</th>
                    <th className="px-3 py-2 text-left">{t('admin.warehouse.locations.desc', { defaultValue: 'Описание' }) || 'Описание'}</th>
                    <th className="px-3 py-2 text-left">{t('admin.warehouse.locations.stock', { defaultValue: 'Остаток' }) || 'Остаток'}</th>
                  </tr>
                </thead>
                <tbody>
                  {locations.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-3 py-3 text-center text-slate-500">
                        {t('common.empty') || 'Нет данных'}
                      </td>
                    </tr>
                  )}
                  {locations.map((loc, idx) => (
                    <tr key={loc.id || idx} className="border-t border-slate-200 hover:bg-slate-50">
                      <td className="px-3 py-2 text-slate-700">{idx + 1}</td>
                      <td className="px-3 py-2 text-slate-900 font-semibold">{loc.code || '—'}</td>
                      <td className="px-3 py-2 text-slate-700">{loc.description || '—'}</td>
                      <td className="px-3 py-2 text-slate-700">{loc.total_stock ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}
    </div>
  );
}