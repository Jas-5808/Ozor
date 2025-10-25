import React, { useEffect, useMemo, useState } from "react";
import { useAuth } from "../hooks/useAuth";
import { userAPI } from "../services/api";
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

  useEffect(() => {
    if (isAuthenticated && !profile) {
      fetchUserProfile?.();
    }
  }, [isAuthenticated, profile, fetchUserProfile]);

  const userId = profile?.user_id || "guest";

  const makeReferralLink = (productId: string) => {
    const origin = window.location.origin;
    return `${origin}/product/${productId}?ref=${userId}`;
  };

  const handleGenerate = (product: any) => {
    const link = makeReferralLink(product.product_id);
    addFlow({
      productId: product.product_id,
      productName: product.product_name,
      link,
      commission: product.refferal_price || 0,
    });
    setDialog({
      open: true,
      productId: product.product_id,
      link,
      title: product.product_name,
    });
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
                  {formatPrice(profile?.balance || 0, "UZS")}
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
          <div className={`${cn.glass} ${cn.panel}`}>
            {productsLoading && <p>Yuklanmoqda...</p>}
            {productsError && <p>Xatolik: {String(productsError)}</p>}
            {!productsLoading && !productsError && (
              <div className={cn.grid}>
                {products.map((p: any) => (
                  <div key={p.product_id} className={cn.cardWhite}>
                    <div className={cn.productHead}>
                      <img
                        className={cn.productImg}
                        src={getProductImageUrl(p.main_image)}
                        alt={p.product_name}
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).src =
                            "/img/NaturalTitanium.jpg";
                        }}
                      />
                      <div>
                        <div className={`${cn.productTitle} ${cn.textDark}`}>
                          {p.product_name}
                        </div>
                        <div className={cn.textDark} style={{ fontSize: 12 }}>
                          {formatPrice(p.price || 0)} • Daromad:{" "}
                          {formatPrice(p.refferal_price || 0)}
                        </div>
                      </div>
                    </div>
                    <div className={cn.actions}>
                      <button
                        className={cn.button}
                        onClick={() => handleGenerate(p)}
                      >
                        Link yaratish
                      </button>
                      <button
                        className={`${cn.secondaryBlue}`}
                        onClick={() =>
                          handleCopy(makeReferralLink(p.product_id))
                        }
                      >
                        {copied === makeReferralLink(p.product_id)
                          ? "Nusxa olindi"
                          : "Linkni nusxalash"}
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
      </div>
  );
}

export default Profile;
