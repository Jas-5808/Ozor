import React, { useEffect, useMemo, useState } from "react";
import { useAuth } from "../hooks/useAuth";
import { userAPI } from "../services/api";
import { useProducts } from "../hooks/useProducts";
import cn from "./profile.module.scss";
import { formatPrice, getProductImageUrl, getVariantMainImage } from "../utils/helpers";
import { useFlows } from "../hooks/useFlows";
import SkeletonGrid from "../components/SkeletonGrid";
import useSEO from "../hooks/useSEO";
import { useNavigate } from "react-router-dom";
import { useProfileData } from "../hooks/useProfileData";
import { useReferralActions } from "../hooks/useReferralActions";
import { logger } from "../utils/logger";
import { STORAGE_KEYS } from "../constants";

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
  const { flows, addFlow, removeFlow, clearFlows } = useFlows();
  
  // Используем кастомные хуки для управления данными
  const profileData = useProfileData();
  const userId = profile?.user_id || profile?.id || "guest";
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
    <div className={`mx-auto w-full max-w-[1240px] px-4 sm:px-5 md:px-6 text-gray-800 ${cn.profileWrapper}`}>
      {/* Header bar */}
      <div className="flex items-center justify-between gap-3 mb-4">
        <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight bg-gradient-to-r from-blue-500 via-indigo-500 to-violet-500 bg-clip-text text-transparent">
          Mening kabinetim
        </h2>
        <button onClick={logout} className={`${cn.button} ${cn.danger} ${cn.compact}`}>
          Chiqish
        </button>
      </div>

      {/* Tabs */}
      <div className={`flex gap-2 border-b border-gray-200 ${cn.tabsContainer}`}>
        {[
          { id: "dashboard", label: "Asosiy" },
          { id: "market", label: "Market" },
          { id: "oqim", label: "Oqim" },
          { id: "stats", label: "Statistika" },
          { id: "payments", label: "To'lov" },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id as any)}
            className={`px-4 py-2 rounded-t-xl text-sm font-semibold transition-colors ${
              activeTab === (t.id as any)
                ? "bg-white text-gray-900 border border-gray-200 border-b-white"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {activeTab === "dashboard" && (
        <div className="rounded-2xl bg-white ring-1 ring-gray-100 shadow-[0_8px_30px_rgba(0,0,0,0.06)] p-5 mb-6">
          {/* Profile card */}
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-4">
              <img
                className="w-20 h-20 rounded-2xl object-cover ring-1 ring-gray-200"
                src={profile?.avatar || "/img/NaturalTitanium.jpg"}
                alt="avatar"
                loading="lazy"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).src = "/img/NaturalTitanium.jpg";
                }}
              />
              <div className="flex flex-col gap-1">
                <div className="text-lg md:text-xl font-bold">
                  {(profile?.first_name || "") + (profile?.last_name ? " " + profile?.last_name : "") || "Foydalanuvchi"}
                </div>
                {profile?.email && <div className="text-sm text-gray-500">{profile.email}</div>}
                {profile?.location && (
                  <div className="text-xs text-gray-500">Joylashuv: {profile.location}</div>
                )}
                <a href="/update-profile" className={`${cn.button} ${cn.secondaryBlue} ${cn.compact}`} style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', height: 36, marginTop: 4 }}>
                  Profilni tahrirlash
                </a>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="rounded-xl bg-gradient-to-br from-indigo-500/10 to-violet-500/10 ring-1 ring-indigo-200/40 p-4">
                <div className="text-xs uppercase tracking-wide text-indigo-600 font-semibold">Balans</div>
                {balanceLoading ? (
                  <div className="mt-2 h-7 w-28 bg-slate-200 rounded animate-pulse" />
                ) : (
                  <div className="text-2xl font-extrabold text-gray-900 mt-1">
                    {formatPrice((userBalance ?? profile?.balance ?? 0), "UZS")}
                  </div>
                )}
                <div className="text-xs text-gray-500">Kutilayotgan hisobingiz</div>
              </div>
              <div className="rounded-xl bg-gradient-to-br from-blue-500/10 to-cyan-500/10 ring-1 ring-blue-200/40 p-4">
                <div className="text-xs uppercase tracking-wide text-blue-600 font-semibold">Oqimlar</div>
                {apiFlowsLoading ? (
                  <div className="mt-2 h-7 w-12 bg-slate-200 rounded animate-pulse" />
                ) : (
                  <div className="text-2xl font-extrabold text-gray-900 mt-1">{(apiFlows?.length || 0) + (flows?.length || 0)}</div>
                )}
                <div className="text-xs text-gray-500">Yaratilgan referal linklar</div>
              </div>
            </div>
          </div>
        </div>
      )}

        {activeTab === "market" && (
          <div className={`${cn.glass} ${cn.panel}`} style={{ padding: '12px 8px', borderRadius: 12 }}>
            {productsLoading && (
              <div style={{ padding: 8 }}>
                <SkeletonGrid count={8} columns={4} />
              </div>
            )}
            {productsError && <p>Xatolik: {String(productsError)}</p>}
            {!productsLoading && !productsError && (
              <div className={cn.grid} style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 12, alignItems: 'stretch' }}>
                {products.map((p: any) => (
                  
                  <div
                    key={p.product_id}
                    className={`${cn.cardWhite} ${cn.cardProduct}`}
                    style={{ 
                      borderRadius: 8, 
                      padding: 12, 
                      border: '1px solid #e5e7eb', 
                      boxShadow: '0 4px 16px rgba(0,0,0,0.04)',
                      display: 'flex',
                      flexDirection: 'column',
                      height: '100%'
                    }}
                  >
                    <div
                      className={cn.productHeadCol}
                      onClick={async () => {
                        if (loadingProductId === p.product_id) return;
                        try {
                          setLoadingProductId(p.product_id);
                          // Загружаем данные из /api/v1/shop/product/{product_id}
                          const response = await shopAPI.getProductById(p.product_id);
                          const productData = response.data;
                          
                          // Преобразуем данные из API в формат для страницы Product
                          // API формат: { id, name, description, refferal_price, main_image, category, attributes, variants }
                          // variants: [{ id, product_id, sku, price, base_price, stock, attribute_values, media }]
                          const firstVariant = productData.variants?.[0];
                          const productForState = {
                            product_id: productData.id || p.product_id,
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
                          
                          // Переходим на страницу продукта с данными в state
                          navigate(`/product/${p.product_id}`, { state: { product: productForState } });
                        } catch (error) {
                          console.error("Ошибка при загрузке продукта:", error);
                          // При ошибке просто переходим на страницу продукта
                          navigate(`/product/${p.product_id}`);
                        } finally {
                          setLoadingProductId(null);
                        }
                      }}
                      style={{ 
                        cursor: loadingProductId === p.product_id ? 'wait' : 'pointer', 
                        opacity: loadingProductId === p.product_id ? 0.6 : 1,
                        flex: '1 1 auto',
                        display: 'flex',
                        flexDirection: 'column'
                      }}
                    >
                      <img
                        className={cn.productImgXL}
                        src={getVariantMainImage(p.variant_media) || getProductImageUrl(p.main_image)}
                        alt={p.product_name}
                        loading="lazy"
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).src =
                            "/img/NaturalTitanium.jpg";
                        }}
                      />
                      <div style={{ marginTop: 8, display: 'grid', gap: 6, flex: '1 1 auto' }}>
                        <div className={`${cn.productTitle} ${cn.textDark}`} style={{ fontSize: '0.95rem', fontWeight: 700, lineHeight: 1.3 }}>
                          {p.product_name}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6, flexWrap: 'wrap' }}>
                          <div style={{ fontSize: '0.9rem', fontWeight: 700 }}>{formatPrice(p.price || 0)}</div>
                          <span
                            style={{
                              display: 'inline-flex', alignItems: 'center', gap: 4,
                              padding: '3px 8px', borderRadius: 6,
                              background: '#ecfdf5', border: '1px solid #6ee7b7', color: '#047857',
                              fontWeight: 600, fontSize: 11
                            }}
                          >
                            + {formatPrice(p.refferal_price || 0)}
                          </span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                          <div className={cn.small} style={{ color: '#64748b', fontSize: 11 }}>Daromad — siz uchun komissiya</div>
                        </div>
                      </div>
                    </div>
                    <div style={{ marginTop: 'auto', paddingTop: 12, borderTop: '1px solid #e5e7eb' }}>
                      <button
                        className={`${cn.button} ${cn.compact}`}
                        onClick={(e) => { e.stopPropagation(); handleGenerate(p); }}
                        disabled={createLoading}
                        style={{ width: '100%', height: 36, padding: '0 12px', fontWeight: 600, fontSize: 13 }}
                      >
                        {createLoading ? "Yaratilmoqda..." : "Nusxa yaratish"}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
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
                {referralStats.map((r) => (
                  <div
                    key={r.id}
                    className={`${cn.glass} ${cn.flowRow} p-4 border border-gray-200 rounded-2xl bg-white shadow-[0_8px_30px_rgba(0,0,0,0.04)]`}
                  >
                    <div className="flex flex-wrap items-center gap-3">
                      {/* Left: title + code */}
                      <div className="flex items-center gap-2 shrink-0">
                        <div className="text-base font-extrabold text-slate-900">{r.title || r.code}</div>
                        <span className="inline-flex h-6 items-center px-2 rounded-full text-xs font-bold border border-emerald-300 text-emerald-700 bg-emerald-50">{r.code}</span>
                      </div>
                      <br />
                      {/* Middle: link */}
                      <div className="flex-1 min-w-[220px]">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 text-xs text-slate-600 break-all bg-slate-50 border border-slate-200 rounded-md px-2 py-1">
                            {(() => {
                              const flow = apiFlows.find(f => f.id === r.id);
                              return flow ? window.location.origin + '/product/' + flow.product_id + '?ref=' + r.code : '';
                            })()}
                          </div>
                          <div className="inline-flex items-center gap-2 shrink-0">
                            <button
                              className="h-8 w-8 inline-flex items-center justify-center rounded-lg border border-slate-200 hover:bg-slate-50"
                              title="Nusxalash"
                              aria-label="Nusxalash"
                              onClick={() => {
                                const flow = apiFlows.find(f => f.id === r.id);
                                if (flow) {
                                  handleCopy(window.location.origin + '/product/' + flow.product_id + '?ref=' + r.code);
                                }
                              }}
                            >
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <rect x="9" y="9" width="12" height="12" rx="2" stroke="#334155" strokeWidth="2"/>
                                <rect x="3" y="3" width="12" height="12" rx="2" stroke="#334155" strokeWidth="2"/>
                              </svg>
                            </button>
                            <button
                              className={`h-8 w-8 inline-flex items-center justify-center rounded-lg border ${deletingReferralId===r.id? 'opacity-50 cursor-not-allowed' : ''} border-red-200 hover:bg-red-50`}
                              title="O'chirish"
                              aria-label="O'chirish"
                              onClick={() => handleDeleteReferral(r.id)}
                              disabled={deletingReferralId === r.id}
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
                      {/* Right: date + earned */}
                      <div className="flex items-center gap-3 shrink-0">
                        <div className="text-xs text-slate-500">{new Date(r.created_at).toLocaleString()}</div>
                        <span className="inline-flex h-6 items-center px-2 rounded-full text-xs font-bold border border-emerald-300 text-emerald-700 bg-emerald-50">{formatPrice(r.total_earned || 0)}</span>
                      </div>
                    </div>
                  </div>
                ))}
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
          <div className={`${cn.glass} ${cn.panel}`}>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-4">
              <div className="rounded-2xl border border-indigo-200/60 bg-indigo-50 p-4">
                <div className="text-xs tracking-wide uppercase text-indigo-700 font-bold">Umumiy arizalar</div>
                <div className="text-3xl font-black text-indigo-900 mt-1">{totals.total}</div>
                <div className="text-xs text-indigo-700/80">Barcha referral havolalar bo'yicha</div>
              </div>
              <div className="rounded-2xl border border-amber-200/60 bg-amber-50 p-4">
                <div className="text-xs tracking-wide uppercase text-amber-700 font-bold">Ushlab turilgan</div>
                <div className="text-3xl font-black text-amber-900 mt-1">{totals.hold}</div>
                <div className="text-xs text-amber-700/80">Tekshiruv jarayonida</div>
              </div>
              <div className="rounded-2xl border border-emerald-200/60 bg-emerald-50 p-4">
                <div className="text-xs tracking-wide uppercase text-emerald-700 font-bold">To'langan</div>
                <div className="text-3xl font-black text-emerald-900 mt-1">{totals.paid}</div>
                <div className="text-xs text-emerald-700/80">Muvaffaqiyatli to'lovlar</div>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <div className="text-xs tracking-wide uppercase text-slate-600 font-bold">Balans</div>
                <div className="text-3xl font-black text-slate-900 mt-1">{formatPrice((userBalance ?? profile?.balance ?? 0), "UZS")}</div>
                <div className="text-xs text-slate-500">Hozirgi hisob</div>
              </div>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="text-base font-extrabold text-slate-900">Havolalar bo'yicha statistikalar</div>
                <div className="text-xs text-slate-500">Namuna ma'lumotlari</div>
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
                    {(computedStats || []).map((s:any)=> (
                      <tr key={s.id} className="border-t border-gray-100">
                        <td className="py-2 font-semibold text-slate-900">{s.title || '—'}</td>
                        <td className="py-2 text-slate-600">{s.code}</td>
                        <td className="py-2 text-right font-semibold">{s.total}</td>
                        <td className="py-2 text-right text-amber-600 font-semibold">{s.hold}</td>
                        <td className="py-2 text-right text-emerald-700 font-semibold">{s.paid}</td>
                        <td className="py-2 text-right font-black">{formatPrice(s.earned, 'UZS')}</td>
                      </tr>
                    ))}
                    {(!computedStats || computedStats.length===0) && (
                      <tr className="border-t border-gray-100">
                        <td colSpan={6} className="py-4 text-center text-slate-500">Hali ma'lumotlar yo'q</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
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
            className={cn.dialogOverlay}
            onClick={() => setCreateModal({ open: false, title: "", agree: false })}
          >
            <div
              className={`${cn.glass} ${cn.dialog} ${cn.dialogWide}`}
              onClick={(e) => e.stopPropagation()}
            >
              <div className={cn.title} style={{ marginBottom: 10 }}>{createModal.product?.product_name}</div>
              <div>
                <input
                  value={createModal.title}
                  onChange={(e) => setCreateModal({ ...createModal, title: e.target.value })}
                  placeholder="Sarlavha (title)"
                  className={cn.copyInput}
                />
                <label style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8 }}>
                  <input
                    type="checkbox"
                    checked={createModal.agree}
                    onChange={(e) => setCreateModal({ ...createModal, agree: e.target.checked })}
                  />
                  <span className={cn.small}>Шартлар билан танышдим (пока без логики)</span>
                </label>
                {createError && (
                  <div className={cn.small} style={{ color: "#d12", marginTop: 6 }}>{createError}</div>
                )}
                <div className={cn.actions}>
                  <button className={`${cn.button} ${cn.compact}`} onClick={submitCreateReferral} disabled={createLoading}>
                    {createLoading ? "Yaratilmoqda..." : "Создать"}
                  </button>
                  <button className={`${cn.button} ${cn.secondary} ${cn.compact}`} onClick={() => setCreateModal({ open: false, title: "", agree: false })}>
                    Отмена
                  </button>
                </div>
                {createModal.createdLink && (
                  <div style={{ marginTop: 10 }}>
                    <div className={cn.small} style={{ marginBottom: 6 }}>Ссылка создана, можно скопировать:</div>
                    <div className={cn.linkRow}>
                      <input readOnly value={createModal.createdLink} className={cn.copyInput} />
                      <button
                        className={cn.miniBtn}
                        onClick={() => handleCopy(createModal.createdLink!)}
                        title="Nusxalash"
                      >
                        📋
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
  );
}

export default Profile;
