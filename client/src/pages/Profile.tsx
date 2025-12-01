import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../hooks/useAuth";
import { shopAPI } from "../services/api";
import { useProducts } from "../hooks/useProducts";
import cn from "./profile.module.scss";
import { formatPrice, getProductImageUrl, getVariantMainImage } from "../utils/helpers";
import { useFlows } from "../hooks/useFlows";
import SkeletonGrid from "../components/SkeletonGrid";
import useSEO from "../hooks/useSEO";
import { Link, useNavigate } from "react-router-dom";
import { useProfileData } from "../hooks/useProfileData";
import { useReferralActions } from "../hooks/useReferralActions";

export function Profile() {
  const navigate = useNavigate();
  const { profile, isAuthenticated, logout, fetchUserProfile } = useAuth();
  const [activeTab, setActiveTab] = useState<
    "dashboard" | "market" | "oqim" | "stats" | "payments"
  >("dashboard");
  const [loadingProductId, setLoadingProductId] = useState<string | null>(null);
  const {
    products,
    loading: productsLoading,
    error: productsError,
  } = useProducts();
  const { flows, removeFlow, clearFlows } = useFlows();
  
  // Используем кастомные хуки для управления данными
  const profileData = useProfileData();
  const userId = (profile as any)?.user_id || profile?.id || "guest";
  const referralActions = useReferralActions(userId, () => {
    profileData.loadReferrals();
  });

  // SEO: закрыть личный кабинет от индексации
  useSEO({
    title: "Profil — OZAR",
    robots: "noindex,nofollow",
    canonical: typeof window !== 'undefined' ? window.location.origin + '/profile' : undefined,
  });

  useEffect(() => {
    if (isAuthenticated && !profile) {
      fetchUserProfile?.();
    }
  }, [isAuthenticated, profile, fetchUserProfile]);

  // Используем данные из хуков
  const {
    apiFlows,
    apiFlowsLoading,
    apiFlowsError,
    referralStats,
    totals,
    userBalance,
    balanceLoading,
  } = profileData;

  const {
    dialog,
    setDialog,
    createModal,
    setCreateModal,
    createLoading,
    deletingReferralId,
    createError,
    referralNotice,
    handleGenerate,
    submitCreateReferral,
    handleDeleteReferral,
    handleCopy,
  } = referralActions;

  const fullName = useMemo(() => {
    const parts = [profile?.first_name, profile?.last_name].filter(Boolean);
    return parts.length ? parts.join(" ") : "Foydalanuvchi";
  }, [profile?.first_name, profile?.last_name]);

  const primaryContact = profile?.email || profile?.phone || "Kontakt ma'lumoti ko'rsatilmagan";
  const profileLocation = profile?.location || "Joylashuv ko'rsatilmagan";
  const profileAvatar = (profile as any)?.avatar || "/img/NaturalTitanium.jpg";

  const heroHighlights = [
    {
      label: "Balans",
      value: formatPrice(userBalance ?? profile?.balance ?? 0, "UZS"),
      helper: "Mavjud mablag'",
    },
    {
      label: "Faol oqimlar",
      value: ((apiFlows?.length || 0) + (flows?.length || 0)).toLocaleString("ru-RU"),
      helper: "Yaratilgan linklar",
    },
    {
      label: "Umumiy daromad",
      value: formatPrice(totals.earned, "UZS"),
      helper: "To'langan bonuslar",
    },
  ];

  const tabItems: Array<{
    id: typeof activeTab;
    label: string;
    icon: string;
  }> = [
    { id: "dashboard", label: "Asosiy", icon: "🏠" },
    { id: "market", label: "Market", icon: "🛍️" },
    { id: "oqim", label: "Oqim", icon: "🔗" },
    { id: "stats", label: "Statistika", icon: "📈" },
    { id: "payments", label: "To'lov", icon: "💳" },
  ];

  const computedStats = useMemo(() => {
    if (!Array.isArray(referralStats)) {
      return [];
    }
    return referralStats.map((stat, index) => ({
      id: stat.id || `stat-${index}`,
      title: stat.title || stat.code || "—",
      code: (stat.code || "—").replace(/^https?:\/\//i, ""),
      total: stat.total ?? 0,
      hold: stat.hold ?? 0,
      paid: stat.paid ?? 0,
      earned: stat.earned ?? 0,
    }));
  }, [referralStats]);

  if (!isAuthenticated) {
    return (
      <div className="mx-auto w-full max-w-[1240px] px-4 sm:px-5 md:px-6 py-6">
        <div className="rounded-2xl bg-white shadow-[0_8px_30px_rgba(0,0,0,0.06)] ring-1 ring-gray-100 p-6 text-gray-800">
          <p className="text-center">Profilni ko'rish uchun tizimga kiring.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f4f7f9] pb-28">
      <div className={`mx-auto w-full max-w-[1240px] px-4 sm:px-5 md:px-6 text-gray-800 ${cn.profileWrapper}`}>
        <section className="relative overflow-hidden rounded-[32px] bg-gradient-to-r from-[#003d32] via-[#015a41] to-[#04734b] px-6 py-7 text-white shadow-[0_25px_70px_rgba(0,61,50,0.35)]">
          <div
            className="pointer-events-none absolute inset-0 opacity-30 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.5),_transparent_55%)]"
            aria-hidden="true"
          />
          <div className="relative flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div className="flex items-start gap-4">
              <img
                className="h-20 w-20 rounded-[24px] border-2 border-white/70 object-cover shadow-2xl"
                src={profileAvatar}
                alt={fullName}
                loading="lazy"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).src = "/img/NaturalTitanium.jpg";
                }}
              />
              <div>
                <p className="text-xs uppercase tracking-[0.35em] text-white/60">Profil</p>
                <h1 className="text-3xl font-black leading-tight">{fullName}</h1>
                <div className="mt-3 flex flex-wrap gap-4 text-sm text-white/80">
                  <span className="inline-flex items-center gap-2">
                    <svg
                      className="h-4 w-4"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={2}
                      viewBox="0 0 24 24"
                    >
                      <path d="M4 6h16M4 6l8 6 8-6M4 6v12h16V6" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    {primaryContact}
                  </span>
                  <span className="inline-flex items-center gap-2">
                    <svg
                      className="h-4 w-4"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={2}
                      viewBox="0 0 24 24"
                    >
                      <path
                        d="M12 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm0 0c-4 0-7 2.5-7 5.5C5 19 12 22 12 22s7-3 7-5.5c0-3-3-5.5-7-5.5Z"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                    {profileLocation}
                  </span>
                </div>
                <div className="mt-4 flex flex-wrap gap-3">
                  <Link
                    to="/update-profile"
                    className="inline-flex items-center justify-center rounded-2xl bg-white px-4 py-2 text-sm font-semibold text-[#015338] shadow-[0_16px_30px_rgba(255,255,255,0.35)] transition hover:translate-y-0.5"
                  >
                    Profilni tahrirlash
                  </Link>
                  <button
                    onClick={logout}
                    className="inline-flex items-center justify-center rounded-2xl border border-white/40 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10"
                  >
                    Chiqish
                  </button>
                </div>
              </div>
            </div>
            <div className="grid w-full max-w-xl gap-3 sm:grid-cols-3">
              {heroHighlights.map((card) => (
                <div
                  key={card.label}
                  className="rounded-2xl border border-white/25 bg-white/10 p-4 backdrop-blur-md shadow-[0_15px_40px_rgba(0,0,0,0.12)]"
                >
                  <p className="text-xs uppercase tracking-wide text-white/70">{card.label}</p>
                  <p className="mt-1 text-2xl font-black">{card.value}</p>
                  <p className="text-xs text-white/75">{card.helper}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <div className="mt-8 rounded-3xl border border-emerald-100 bg-white/95 p-2 shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
          <div className="flex flex-wrap gap-2">
            {tabItems.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex flex-1 min-w-[130px] items-center justify-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-semibold transition ${
                  activeTab === tab.id
                    ? "bg-gradient-to-r from-[#003d32] to-[#04734b] text-white shadow-lg"
                    : "text-slate-500 hover:text-slate-900"
                }`}
              >
                <span className="text-lg" aria-hidden="true">
                  {tab.icon}
                </span>
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {activeTab === "dashboard" && (
          <section className="mt-6 rounded-[30px] border border-white/80 bg-white p-5 sm:p-6 shadow-[0_25px_80px_rgba(15,23,42,0.05)]">
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div className="flex items-center gap-4">
                  <img
                    className="w-20 h-20 rounded-2xl object-cover ring-1 ring-gray-200"
                    src={profileAvatar}
                    alt={fullName}
                    loading="lazy"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).src = "/img/NaturalTitanium.jpg";
                    }}
                  />
                  <div className="flex flex-col gap-1">
                    <div className="text-lg md:text-xl font-bold">{fullName}</div>
                    {profile?.email && <div className="text-sm text-gray-500">{profile.email}</div>}
                    {profile?.location && (
                      <div className="text-xs text-gray-500">Joylashuv: {profile.location}</div>
                    )}
                  </div>
                </div>
                <Link
                  to="/update-profile"
                  className="inline-flex items-center justify-center rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-[#015338] transition hover:bg-gray-50"
                >
                  Profilni tahrirlash
                </Link>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="rounded-xl bg-gradient-to-br from-emerald-500/15 via-emerald-500/5 to-white ring-1 ring-emerald-200/60 p-4">
                  <div className="text-xs uppercase tracking-wide text-emerald-700 font-semibold">Balans</div>
                  {balanceLoading ? (
                    <div className="mt-2 h-7 w-28 rounded bg-slate-200 animate-pulse" />
                  ) : (
                    <div className="mt-1 text-2xl font-extrabold text-gray-900">
                      {formatPrice(userBalance ?? profile?.balance ?? 0, "UZS")}
                    </div>
                  )}
                  <div className="text-xs text-gray-600">Kutilayotgan hisobingiz</div>
                </div>
                <div className="rounded-xl bg-gradient-to-br from-sky-500/15 via-sky-500/5 to-white ring-1 ring-sky-200/60 p-4">
                  <div className="text-xs uppercase tracking-wide text-sky-700 font-semibold">Oqimlar</div>
                  {apiFlowsLoading ? (
                    <div className="mt-2 h-7 w-12 rounded bg-slate-200 animate-pulse" />
                  ) : (
                    <div className="mt-1 text-2xl font-extrabold text-gray-900">
                      {(apiFlows?.length || 0) + (flows?.length || 0)}
                    </div>
                  )}
                  <div className="text-xs text-gray-600">Yaratilgan referal linklar</div>
                </div>
              </div>
            </div>
          </section>
        )}

        {activeTab === "market" && (
          <section className="mt-6 rounded-[30px] border border-white/80 bg-white p-4 sm:p-5 shadow-[0_25px_80px_rgба(15,23,42,0.05)]">
            <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.35em] text-[#015338]">Market</p>
                <h3 className="text-2xl font-black text-slate-900">Tovarlar uchun oqim yarating</h3>
                <p className="text-sm text-slate-500">Tanlang, baholang va referal linkni bir necha soniyada yarating.</p>
              </div>
              <span className="inline-flex items-center gap-1 rounded-full bg-slate-100/80 px-3 py-1 text-xs font-semibold text-slate-700 w-fit">
                {products.length} mahsulot
              </span>
            </div>
            {productsLoading && (
              <div className="rounded-2xl border border-dashed border-slate-200 p-6">
                <SkeletonGrid count={8} columns={4} />
              </div>
            )}
            {productsError && (
              <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
                Xatolik: {String(productsError)}
              </div>
            )}
            {!productsLoading && !productsError && (
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {products.map((p: any, index: number) => {
                  const productId = p?.product_id || p?.id || p?.productId || "";
                  const referralValue = formatPrice(p.refferal_price || 0);
                  const priceValue = formatPrice(p.price || 0);
                  const isLoadingCard = Boolean(productId) && loadingProductId === productId;
                  const canOpenProduct = Boolean(productId);
                  const categoryLabel =
                    typeof p.category === "string"
                      ? p.category
                      : p.category?.name || "Kategoriya";

                  const handleOpenProduct = async () => {
                    if (!canOpenProduct) return;
                    if (isLoadingCard) return;
                    try {
                      setLoadingProductId(productId);
                      const response = await shopAPI.getProductById(productId);
                      const productData = response.data as any;
                      const firstVariant = productData.variants?.[0];
                      const productForState = {
                        product_id: productId,
                        product_name: productData.name || p.product_name,
                        product_description: productData.description || p.product_description,
                        category: productData.category || p.category,
                        refferal_price: productData.refferal_price ?? p.refferal_price ?? 0,
                        main_image: productData.main_image || p.main_image,
                        variant_id: firstVariant?.id || p.variant_id,
                        variant_sku: firstVariant?.sku || p.variant_sku,
                        price: firstVariant?.price ?? p.price ?? 0,
                        stock: firstVariant?.stock ?? p.stock ?? 0,
                        variant_attributes: firstVariant?.attribute_values || [],
                        variant_media: firstVariant?.media || [],
                      };
                      navigate(`/product/${productId}`, { state: { product: productForState } });
                    } catch (error) {
                      if (productId) {
                        navigate(`/product/${productId}`);
                      }
                    } finally {
                      setLoadingProductId(null);
                    }
                  };

                  return (
                    <article
                      key={productId ? `${productId}-${p.variant_id || index}` : `market-card-${index}`}
                      className="group relative flex h-full flex-col rounded-[26px] border border-slate-100 bg-gradient-to-b from-white to-slate-50/30 p-4 shadow-[0_18px_35px_rgба(15,23,42,0.07)] transition hover:-translate-y-1 hover:shadow-[0_25px_50px_rgба(15,23,42,0.12)]"
                    >
                      <button
                        type="button"
                        onClick={handleOpenProduct}
                        className="relative overflow-hidden rounded-2xl bg-slate-100"
                        style={{ minHeight: 180 }}
                        disabled={isLoadingCard || !canOpenProduct}
                      >
                        <img
                          src={getVariantMainImage(p.variant_media) || getProductImageUrl(p.main_image)}
                          alt={p.product_name}
                          className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                          loading="lazy"
                          onError={(e) => {
                            (e.currentTarget as HTMLImageElement).src = "/img/NaturalTitanium.jpg";
                          }}
                        />
                        <span className="absolute left-3 top-3 inline-flex items-center rounded-full bg-white/85 px-3 py-1 text-xs font-semibold text-slate-800">
                          {categoryLabel}
                        </span>
                        {isLoadingCard && (
                          <span className="absolute inset-0 grid place-items-center bg-white/70 text-xs font-semibold text-slate-600">
                            Yuklanmoqda...
                          </span>
                        )}
                      </button>
                      <div className="mt-4 flex flex-1 flex-col gap-4">
                        <div>
                          <h4 className="text-base font-bold text-slate-900 line-clamp-2">{p.product_name}</h4>
                          <p className="mt-1 text-xs uppercase tracking-wide text-slate-500">SKU: {p.variant_sku || "—"}</p>
                        </div>
                        <div className="flex flex-wrap items-center gap-3 rounded-2xl bg-slate-100/60 px-3 py-2">
                          <div className="flex flex-col">
                            <span className="text-xs text-slate-500">Narxi</span>
                            <span className="text-lg font-extrabold text-slate-900">{priceValue}</span>
                          </div>
                          <div className="h-8 w-px bg-slate-200" />
                          <div className="flex flex-col">
                            <span className="text-xs text-slate-500">Daromad</span>
                            <span className="inline-flex items-center gap-2 text-sm font-semibold text-[#04734b]">
                              {referralValue}
                              <span className="rounded-full bg-[#e6f8ef] px-2 py-0.5 text-[11px] font-bold text-[#04734b]">
                                +
                              </span>
                            </span>
                          </div>
                        </div>
                        <div className="mt-auto space-y-2">
                          <button
                            type="button"
                            className="relative h-12 w-full rounded-[18px] bg-gradient-to-r from-[#0f172a] via-[#0f766e] to-[#a3e635] text-sm font-semibold text-white shadow-[0_22px_48px_rgба(3,102,102,0.45)] ring-1 ring-white/30 transition hover:scale-[1.01] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
                            disabled={createLoading || isLoadingCard}
                            onClick={() => handleGenerate(p)}
                          >
                            <span className="absolute inset-0 rounded-[18px] bg-gradient-to-r from-white/10 to-transparent opacity-0 transition group-hover:opacity-40" />
                            <span className="relative inline-flex items-center justify-center gap-2">
                              <span className="h-1.5 w-1.5 rounded-full bg-white" />
                            {createLoading ? "Yaratilmoqda..." : "Nusxa yaratish"}
                            </span>
                          </button>
                          <button
                            type="button"
                            className="h-10 w-full rounded-[16px] border border-slate-200 bg-gradient-to-r from-white to-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-700 shadow-[0_8px_20px_rgба(15,23,42,0.12)] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
                            onClick={() => handleGenerate(p)}
                            disabled={createLoading || isLoadingCard}
                          >
                            Oqim yaratish
                          </button>
                          <button
                            type="button"
                            className="h-12 w-full rounded-[18px] border border-slate-200 bg-white text-sm font-semibold text-slate-800 shadow-[0_12px_30px_rgба(15,23,42,0.1)] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
                            onClick={handleOpenProduct}
                            disabled={isLoadingCard || !canOpenProduct}
                          >
                            Ko'proq ma'lumot
                          </button>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        )}

        {activeTab === "oqim" && (
          <div className={`${cn.glass} ${cn.panel}`}>
            {apiFlowsLoading && (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="p-4 border border-gray-200 rounded-2xl bg-white animate-pulse">
                    <div className="h-4 w-1/3 bg-slate-200 rounded mb-3" />
                    <div className="h-8 bg-slate-200 rounded mb-3" />
                    <div className="flex gap-2">
                      <div className="h-8 flex-1 bg-slate-200 rounded" />
                      <div className="h-8 w-8 bg-slate-200 rounded" />
                      <div className="h-8 w-8 bg-slate-200 rounded" />
                    </div>
                  </div>
                ))}
              </div>
            )}
            {apiFlowsError && <p style={{ color: '#b91c1c' }}>{apiFlowsError}</p>}
            {referralNotice && (
              <div
                style={{
                  marginBottom: 10,
                  padding: '10px 12px',
                  borderRadius: 12,
                  border: referralNotice.type === 'success' ? '1px solid #86efac' : '1px solid #fecaca',
                  background: referralNotice.type === 'success' ? '#ecfdf5' : '#fef2f2',
                  color: referralNotice.type === 'success' ? '#065f46' : '#7f1d1d',
                  fontWeight: 600,
                }}
                role="status"
                aria-live="polite"
              >
                {referralNotice.message}
              </div>
            )}
            {!apiFlowsLoading && !apiFlowsError && (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {referralStats.length === 0 && flows.length === 0 && (
                  <p>Hozircha oqimlar yo'q. Marketdan link yarating.</p>
                )}
                {referralStats.map((r) => {
                  const linkedFlow = apiFlows.find((flow) => flow.id === r.id);
                  const origin = typeof window !== "undefined" ? window.location.origin : "";
                  const shareLink = linkedFlow ? `${origin}/product/${linkedFlow.product_id}?ref=${r.code}` : "";
                  const createdAt = linkedFlow?.created_at || (linkedFlow as any)?.createdAt;

                  return (
                    <div
                      key={r.id}
                      className={`${cn.glass} ${cn.flowRow} p-4 border border-gray-200 rounded-2xl bg-white shadow-[0_8px_30px_rgba(0,0,0,0.04)]`}
                    >
                      <div className="flex flex-wrap items-center gap-3">
                        <div className="flex items-center gap-2 shrink-0">
                          <div className="text-base font-extrabold text-slate-900">{r.title || r.code}</div>
                          <span className="inline-flex h-6 items-center px-2 rounded-full text-xs font-bold border border-emerald-300 text-emerald-700 bg-emerald-50">
                            {r.code}
                          </span>
                        </div>
                        <div className="flex-1 min-w-[220px]">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 break-all rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-xs text-slate-600">
                              {shareLink}
                            </div>
                            <div className="inline-flex items-center gap-2 shrink-0">
                              <button
                                className="h-8 w-8 inline-flex items-center justify-center rounded-lg border border-slate-200 hover:bg-slate-50"
                                title="Nusxalash"
                                aria-label="Nusxalash"
                                onClick={() => shareLink && handleCopy(shareLink)}
                              >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                  <rect x="9" y="9" width="12" height="12" rx="2" stroke="#334155" strokeWidth="2" />
                                  <rect x="3" y="3" width="12" height="12" rx="2" stroke="#334155" strokeWidth="2" />
                                </svg>
                              </button>
                              <button
                                className={`h-8 w-8 inline-flex items-center justify-center rounded-lg border ${
                                  deletingReferralId === r.id ? "opacity-50 cursor-not-allowed" : ""
                                } border-red-200 hover:bg-red-50`}
                                title="O'chirish"
                                aria-label="O'chirish"
                                onClick={() => handleDeleteReferral(r.id)}
                                disabled={deletingReferralId === r.id}
                              >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                  <path d="M3 6h18" stroke="#dc2626" strokeWidth="2" strokeLinecap="round" />
                                  <path d="M8 6v-2a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" stroke="#dc2626" strokeWidth="2" />
                                  <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" stroke="#dc2626" strokeWidth="2" />
                                </svg>
                              </button>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          <div className="text-xs text-slate-500">
                            {createdAt ? new Date(createdAt).toLocaleString() : "—"}
                          </div>
                          <span className="inline-flex h-6 items-center px-2 rounded-full text-xs font-bold border border-emerald-300 text-emerald-700 bg-emerald-50">
                            {formatPrice(r.earned || 0)}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
                {flows.map((f) => (
                  <div
                    key={f.id}
                    className={`${cn.glass} ${cn.flowRow} p-4 border border-gray-200 rounded-2xl bg-white shadow-[0_8px_30px_rgba(0,0,0,0.04)]`}
                  >
                    <div className="flex flex-wrap items-center gap-3">
                      {/* Left: title + commission */}
                      <div className="flex items-center gap-2 shrink-0">
                        <div className="text-base font-extrabold text-slate-900">{f.productName}</div>
                        <span className="inline-flex h-6 items-center px-2 rounded-full text-xs font-bold border border-emerald-300 text-emerald-700 bg-emerald-50">+ {formatPrice(f.commission || 0)}</span>
                      </div>
                      {/* Middle: link */}
                      <div className="flex-1 min-w-[220px]">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 text-xs text-slate-600 break-all bg-slate-50 border border-slate-200 rounded-md px-2 py-1">
                            {f.link}
                          </div>
                          <div className="inline-flex items-center gap-2">
                            <button
                              className="h-8 w-8 inline-flex items-center justify-center rounded-lg border border-slate-200 hover:bg-slate-50"
                              title="Nusxalash"
                              aria-label="Nusxalash"
                              onClick={() => handleCopy(f.link)}
                            >
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <rect x="9" y="9" width="12" height="12" rx="2" stroke="#334155" strokeWidth="2"/>
                                <rect x="3" y="3" width="12" height="12" rx="2" stroke="#334155" strokeWidth="2"/>
                              </svg>
                            </button>
                            <button
                              className="h-8 w-8 inline-flex items-center justify-center rounded-lg border border-red-200 hover:bg-red-50"
                              title="O'chirish"
                              aria-label="O'chirish"
                              onClick={() => removeFlow(f.id)}
                            >
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M3 6h18" stroke="#dc2626" strokeWidth="2" strokeLinecap="round"/>
                                <path d="M8 6v-2a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" stroke="#dc2626" strokeWidth="2"/>
                                <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" stroke="#dc2626" strokeWidth="2"/>
                              </svg>
                            </button>
                          </div>
                        </div>
                      </div>
                      {/* Right: date */}
                      <div className="flex items-center gap-3 shrink-0">
                        <div className="text-xs text-slate-500">{new Date(f.createdAt).toLocaleString()}</div>
                      </div>
                    </div>
                  </div>
                ))}
                {flows.length > 0 && (
                  <div className={`${cn.actions} sm:col-span-2 lg:col-span-3`}>
                    <button className={`${cn.button} ${cn.secondary} ${cn.compact}`} onClick={clearFlows}>
                      Barchasini tozalash
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {activeTab === "stats" && (
          <section className="mt-6 rounded-[30px] border border-white/80 bg-white p-5 sm:p-6 shadow-[0_25px_80px_rgba(15,23,42,0.05)]">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-4">
              <div className="rounded-2xl border border-emerald-100 bg-emerald-50/70 p-4">
                <div className="text-xs tracking-wide uppercase text-emerald-900 font-bold">Umumiy arizalar</div>
                <div className="text-3xl font-black text-emerald-900 mt-1">{totals.total}</div>
                <div className="text-xs text-emerald-800/80">Barcha referral havolalar bo'yicha</div>
              </div>
              <div className="rounded-2xl border border-amber-100 bg-amber-50/80 p-4">
                <div className="text-xs tracking-wide uppercase text-amber-900 font-bold">Ushlab turilgan</div>
                <div className="text-3xl font-black text-amber-900 mt-1">{totals.hold}</div>
                <div className="text-xs text-amber-800/80">Tekshiruv jarayonida</div>
              </div>
              <div className="rounded-2xl border border-sky-100 bg-sky-50/80 p-4">
                <div className="text-xs tracking-wide uppercase text-sky-900 font-bold">To'langan</div>
                <div className="text-3xl font-black text-sky-900 mt-1">{totals.paid}</div>
                <div className="text-xs text-sky-800/80">Muvaffaqиятli to'lovlar</div>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <div className="text-xs tracking-wide uppercase text-slate-600 font-bold">Balans</div>
                <div className="text-3xl font-black text-slate-900 mt-1">
                  {formatPrice(userBalance ?? profile?.balance ?? 0, "UZS")}
                </div>
                <div className="text-xs text-slate-500">Hozirgi hisob</div>
              </div>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="text-base font-extrabold text-slate-900">Havolalar bo'yicha statistikalar</div>
                <div className="text-xs text-slate-500">Yangilangan ma'lumotlar</div>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="text-slate-500">
                      <th className="text-left py-2">Sarlavha</th>
                      <th className="text-left py-2">Kod</th>
                      <th className="text-right py-2">Arizalar</th>
                      <th className="text-right py-2">Ushlab turilgan</th>
                      <th className="text-right py-2">To'langan</th>
                      <th className="text-right py-2">Jami daromad</th>
                    </tr>
                  </thead>
                  <tbody>
                    {computedStats.map((s) => (
                      <tr key={s.id} className="border-t border-gray-100">
                        <td className="py-2 font-semibold text-slate-900">{s.title || "—"}</td>
                        <td className="py-2 text-slate-600">{s.code}</td>
                        <td className="py-2 text-right font-semibold">{s.total}</td>
                        <td className="py-2 text-right text-amber-600 font-semibold">{s.hold}</td>
                        <td className="py-2 text-right text-emerald-700 font-semibold">{s.paid}</td>
                        <td className="py-2 text-right font-black">{formatPrice(s.earned, "UZS")}</td>
                      </tr>
                    ))}
                    {computedStats.length === 0 && (
                      <tr className="border-t border-gray-100">
                        <td colSpan={6} className="py-4 text-center text-slate-500">
                          Hali ma'lumotlar yo'q
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        )}

        {activeTab === "payments" && (
          <div className={`${cn.glass} ${cn.panel}`}>
            <p>To'lov bo'limi tez orada qo'shiladi.</p>
          </div>
        )}

        {dialog.open && (
          <div
            className={cn.dialogOverlay}
            onClick={() => setDialog({ open: false })}
          >
            <div
              className={`${cn.glass} ${cn.dialog}`}
              onClick={(e) => e.stopPropagation()}
            >
              <div className={cn.title} style={{ marginBottom: 8 }}>
                {dialog.title}
              </div>
              <div className={cn.meta} style={{ marginBottom: 10 }}>
                Referal linkni nusxalang va ulashing.
              </div>
              <input
                readOnly
                value={dialog.link || ""}
                className={cn.copyInput}
                onFocus={(e) => e.currentTarget.select()}
              />
              <div className={cn.actions}>
                <button
                  className={`${cn.button} ${cn.compact}`}
                  onClick={() => dialog.link && handleCopy(dialog.link)}
                >
                  Nusxalash
                </button>
                <button
                  className={`${cn.button} ${cn.secondary} ${cn.compact}`}
                  onClick={() => setDialog({ open: false })}
                >
                  Yopish
                </button>
              </div>
            </div>
          </div>
        )}

        {/* image preview modal removed */}

        {createModal.open && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 px-4 backdrop-blur-sm"
            onClick={() => setCreateModal({ open: false, title: "", agree: false })}
          >
            <div
              className="relative w-full max-w-md rounded-[32px] bg-white p-6 shadow-[0_35px_80px_rgба(15,23,42,0.25)]"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                className="absolute right-4 top-4 inline-flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200"
                onClick={() => setCreateModal({ open: false, title: "", agree: false })}
                aria-label="Yopish"
              >
                ×
              </button>
              <div className="mb-4 flex flex-col gap-1">
                <p className="text-xs uppercase tracking-[0.4em] text-[#fb923c]">Nusxa yaratish</p>
                <h4 className="text-xl font-black text-slate-900">{createModal.product?.product_name}</h4>
                <p className="text-sm text-slate-500">
                  Mahsulot nomini tahrirlab, shartlarni tasdiqlang va referal havolani yarating.
                </p>
              </div>
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Sarlavha
                  </label>
                  <input
                    value={createModal.title}
                    onChange={(e) => setCreateModal({ ...createModal, title: e.target.value })}
                    placeholder="Mahsulot uchun qisqa nom"
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-900 focus:border-[#fb923c] focus:outline-none"
                  />
                </div>
                <label className="flex items-center gap-3 rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700">
                  <input
                    type="checkbox"
                    checked={createModal.agree}
                    onChange={(e) => setCreateModal({ ...createModal, agree: e.target.checked })}
                    className="h-5 w-5 rounded border-slate-300 text-[#fb923c] focus:ring-[#fb923c]"
                  />
                  Shartlarga roziman
                </label>
                {createError && (
                  <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-600">
                    {createError}
                  </div>
                )}
                <div className="flex flex-col gap-2 sm:flex-row">
                  <button
                    className="flex-1 rounded-2xl bg-gradient-to-r from-[#f97316] to-[#fb923c] py-3 text-sm font-semibold text-white shadow-[0_18px_38px_rgба(249,115,22,0.35)] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
                    onClick={submitCreateReferral}
                    disabled={createLoading || !createModal.agree}
                  >
                    {createLoading ? "Yaratilmoqda..." : "Nusxa yaratish"}
                  </button>
                  <button
                    className="flex-1 rounded-2xl border border-slate-200 py-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
                    onClick={() => setCreateModal({ open: false, title: "", agree: false })}
                  >
                    Bekor qilish
                  </button>
                </div>
                {createModal.createdLink && (
                  <div className="space-y-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-emerald-800">
                      Havola tayyor
                    </p>
                    <div className="flex items-center gap-2">
                      <input
                        readOnly
                        value={createModal.createdLink}
                        className="flex-1 rounded-2xl border border-emerald-200 bg-white px-3 py-2 text-sm text-emerald-800 focus:outline-none"
                      />
                      <button
                        className="inline-flex h-10 min-w-[48px] items-center justify-center rounded-2xl bg-gradient-to-r from-[#10b981] to-[#059669] px-3 text-xs font-bold uppercase text-white"
                        onClick={() => handleCopy(createModal.createdLink!)}
                      >
                        Copy
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default Profile;
