import React, { useEffect, useMemo, useState } from "react";
import { useAuth } from "../hooks/useAuth";
import { userAPI, shopAPI, paymentAPI } from "../services/api";
import { useProducts } from "../hooks/useProducts";
// @ts-ignore – модуль стилей объявлен через d.ts
import cn from "./profile.module.scss";
import { formatPrice, getProductImageUrl } from "../utils/helpers";
import { useFlows } from "../hooks/useFlows";

export function Profile() {
  const { profile, isAuthenticated, logout, fetchUserProfile } =
    useAuth() as any;
  const [activeTab, setActiveTab] = useState<
    "dashboard" | "market" | "oqim" | "stats" | "payments"
  >("dashboard");
  const {
    products,
    loading: productsLoading,
    error: productsError,
  } = useProducts();
  const { flows, addFlow, removeFlow, clearFlows } = useFlows();
  const [copied, setCopied] = useState<string>("");
  const [dialog, setDialog] = useState<{
    open: boolean;
    productId?: string;
    link?: string;
    title?: string;
  }>({ open: false });
  const [createLoading, setCreateLoading] = useState<boolean>(false);
  const [createError, setCreateError] = useState<string | null>(null);
  // removed image preview modal
  const [createModal, setCreateModal] = useState<{
    open: boolean;
    product?: any;
    title: string;
    agree: boolean;
    createdLink?: string | null;
  }>({ open: false, title: "", agree: false, createdLink: null });
  const [userBalance, setUserBalance] = useState<number | null>(null);
  const [balanceLoading, setBalanceLoading] = useState<boolean>(false);

  useEffect(() => {
    if (isAuthenticated && !profile) {
      fetchUserProfile?.();
    }
  }, [isAuthenticated, profile, fetchUserProfile]);

  useEffect(() => {
    const loadBalance = async () => {
      try {
        setBalanceLoading(true);
        const res = await paymentAPI.getUserBalance();
        const value = typeof res?.data?.balance === "number" ? res.data.balance : 0;
        setUserBalance(value);
      } catch {
        setUserBalance(null);
      } finally {
        setBalanceLoading(false);
      }
    };
    if (isAuthenticated) loadBalance();
  }, [isAuthenticated]);

  const userId = profile?.user_id || "guest";

  const makeReferralLink = (productId: string) => {
    const origin = window.location.origin;
    return `${origin}/product/${productId}?ref=${userId}`;
  };

  const handleGenerate = (product: any) => {
    setCreateError(null);
    setCreateModal({
      open: true,
      product,
      title: product?.product_name || "",
      agree: false,
      createdLink: null,
    });
  };

  const submitCreateReferral = async () => {
    if (!createModal.product) return;
    try {
      setCreateLoading(true);
      setCreateError(null);
      const res = await shopAPI.createReferral({
        product_id: createModal.product.product_id,
        title: createModal.title || "",
      });
      const code = res?.data?.code;
      const origin = window.location.origin;
      const link = code
        ? `${origin}/product/${createModal.product.product_id}?ref=${code}`
        : `${origin}/product/${createModal.product.product_id}`;

      addFlow({
        productId: createModal.product.product_id,
        productName: createModal.product.product_name,
        link,
        commission: createModal.product.refferal_price || 0,
      });

      // keep modal open and show copy UI
      setCreateModal({
        open: true,
        product: createModal.product,
        title: createModal.title,
        agree: createModal.agree,
        createdLink: link,
      });
    } catch (e: any) {
      setCreateError(e?.message || "Xatolik yuz berdi");
    } finally {
      setCreateLoading(false);
    }
  };

  const handleCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(text);
      setTimeout(() => setCopied(""), 1500);
    } catch {}
  };

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
    <div className="mx-auto w-full max-w-[1240px] px-4 sm:px-5 md:px-6 py-6 text-gray-800">
      {/* Header bar */}
      <div className="flex items-center justify-between gap-3 mb-4">
        <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight bg-gradient-to-r from-blue-500 via-indigo-500 to-violet-500 bg-clip-text text-transparent">
          Mening kabinetim
        </h2>
        <button onClick={logout} className="h-10 px-4 rounded-xl bg-red-500/90 hover:bg-red-600 text-white font-semibold shadow-sm">
          Chiqish
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-200 mb-5">
        {[
          { id: "dashboard", label: "Dashboard" },
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
                <a href="/update-profile" className="mt-1 inline-flex h-9 items-center justify-center px-3 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 w-max">
                  Profilni tahrirlash
                </a>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="rounded-xl bg-gradient-to-br from-indigo-500/10 to-violet-500/10 ring-1 ring-indigo-200/40 p-4">
                <div className="text-xs uppercase tracking-wide text-indigo-600 font-semibold">Hisobingizda</div>
                <div className="text-2xl font-extrabold text-gray-900 mt-1">
                  {formatPrice((userBalance ?? profile?.balance ?? 0), "UZS")}
                </div>
                <div className="text-xs text-gray-500">Taxminiy balans</div>
              </div>
              <div className="rounded-xl bg-gradient-to-br from-blue-500/10 to-cyan-500/10 ring-1 ring-blue-200/40 p-4">
                <div className="text-xs uppercase tracking-wide text-blue-600 font-semibold">Oqimlar</div>
                <div className="text-2xl font-extrabold text-gray-900 mt-1">{flows.length}</div>
                <div className="text-xs text-gray-500">Yaratilgan referal linklar</div>
              </div>
            </div>
          </div>
        </div>
      )}

        {activeTab === "market" && (
          <div className={`${cn.glass} ${cn.panel}`} style={{ padding: 20, borderRadius: 0 }}>
            {productsLoading && <p style={{ fontSize: 16 }}>Yuklanmoqda...</p>}
            {productsError && <p>Xatolik: {String(productsError)}</p>}
            {!productsLoading && !productsError && (
              <div className={cn.grid} style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
                {products.map((p: any) => (
                  
                  <div
                    key={p.product_id}
                    className={`${cn.cardWhite} ${cn.cardProduct}`}
                    style={{ borderRadius: 0, padding: 16, border: '1px solid #e5e7eb', boxShadow: '0 8px 30px rgba(0,0,0,0.04)' }}
                  >
                    <div
                      className={cn.productHeadCol}
                      onClick={() => (window.location.href = `/product/${p.product_id}`)}
                    >
                      <img
                        className={cn.productImgXL}
                        src={getProductImageUrl(p.main_image)}
                        alt={p.product_name}
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).src =
                            "/img/NaturalTitanium.jpg";
                        }}
                      />
                      <div style={{ marginTop: 8 }}>
                        <div className={`${cn.productTitle} ${cn.textDark}`} style={{ fontSize: '1.05rem', fontWeight: 700 }}>
                          {p.product_name}
                        </div>
                        <div className={cn.priceRow} style={{ fontSize: '.95rem' }}>
                          {formatPrice(p.price || 0)} • Daromad:{" "}
                          {formatPrice(p.refferal_price || 0)}
                        </div>
                      </div>
                    </div>
                    <div className={cn.actions}>
                      <button
                        className={cn.button}
                        onClick={(e) => { e.stopPropagation(); handleGenerate(p); }}
                        disabled={createLoading}
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
            {flows.length === 0 ? (
              <p>Hozircha oqimlar yo'q. Marketdan link yarating.</p>
            ) : (
              <div className={cn.list}>
                {flows.map((f) => (
                  <div key={f.id} className={`${cn.glass} ${cn.flowRow}`}>
                    <div className={cn.flowInfo}>
                      <div className={cn.productTitle}>{f.productName}</div>
                      <div className={cn.small}>
                        Daromad: {formatPrice(f.commission || 0)} •{" "}
                        {new Date(f.createdAt).toLocaleString()}
                      </div>
                      <div
                        className={cn.small}
                        style={{ wordBreak: "break-all" }}
                      >
                        {f.link}
                      </div>
                    </div>
                    <div className={cn.actions}>
                      <button
                        className={cn.button}
                        onClick={() => handleCopy(f.link)}
                      >
                        {copied === f.link ? "Nusxa olindi" : "Nusxalash"}
                      </button>
                      <button
                        className={`${cn.button} ${cn.secondary}`}
                        onClick={() => removeFlow(f.id)}
                      >
                        O'chirish
                      </button>
                    </div>
                  </div>
                ))}
                {flows.length > 0 && (
                  <div className={cn.actions}>
                    <button
                      className={`${cn.button} ${cn.secondary}`}
                      onClick={clearFlows}
                    >
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
            <p>Statistika tez orada qo'shiladi.</p>
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
                  className={cn.button}
                  onClick={() => dialog.link && handleCopy(dialog.link)}
                >
                  {dialog.link && copied === dialog.link
                    ? "Nusxa olindi"
                    : "Nusxalash"}
                </button>
                <button
                  className={`${cn.button} ${cn.secondary}`}
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
                  <button className={cn.button} onClick={submitCreateReferral} disabled={createLoading}>
                    {createLoading ? "Yaratilmoqda..." : "Создать"}
                  </button>
                  <button className={`${cn.button} ${cn.secondary}`} onClick={() => setCreateModal({ open: false, title: "", agree: false })}>
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
