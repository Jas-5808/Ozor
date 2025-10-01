import React, { useEffect, useMemo, useState } from "react";
import { useAuth } from "../hooks/useAuth";
import { userAPI } from "../services/api";
import cn from "./profile.module.scss";
import { useProducts } from "../hooks/useProducts";
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
      <div className="container">
        <div className={cn.profileWrapper}>
          <div className={`${cn.glass} ${cn.panel}`}>
            <p>Profilni ko'rish uchun tizimga kiring.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <div className={cn.profileWrapper}>
        <div className={cn.headerBar}>
          <h2 className={cn.title}>Mening kabinetim</h2>
          <button className={cn.logoutBtn} onClick={logout}>
            Chiqish
          </button>
        </div>

        <div className={cn.tabs}>
          <button
            className={`${cn.tab} ${
              activeTab === "dashboard" ? cn.tabActive : ""
            }`}
            onClick={() => setActiveTab("dashboard")}
          >
            Dashboard
          </button>
          <button
            className={`${cn.tab} ${
              activeTab === "market" ? cn.tabActive : ""
            }`}
            onClick={() => setActiveTab("market")}
          >
            Market
          </button>
          <button
            className={`${cn.tab} ${activeTab === "oqim" ? cn.tabActive : ""}`}
            onClick={() => setActiveTab("oqim")}
          >
            Oqim
          </button>
          <button
            className={`${cn.tab} ${activeTab === "stats" ? cn.tabActive : ""}`}
            onClick={() => setActiveTab("stats")}
          >
            Statistika
          </button>
          <button
            className={`${cn.tab} ${
              activeTab === "payments" ? cn.tabActive : ""
            }`}
            onClick={() => setActiveTab("payments")}
          >
            To'lov
          </button>
        </div>

        {activeTab === "dashboard" && (
          <div className={`${cn.glass} ${cn.panel}`}>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 12,
              }}
            >
              <div className={`${cn.cardWhite}`}>
                <div className={cn.profileCard}>
                  <img
                    className={cn.profileAvatar}
                    src={profile?.avatar || "/img/NaturalTitanium.jpg"}
                    alt="avatar"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).src =
                        "/img/NaturalTitanium.jpg";
                    }}
                  />
                  <div>
                    <div className={cn.profileName}>
                      {(profile?.first_name || "") +
                        (profile?.last_name ? " " + profile?.last_name : "") ||
                        "Foydalanuvchi"}
                    </div>
                    {profile?.email && (
                      <div className={cn.profileEmail}>{profile.email}</div>
                    )}
                    {profile?.location && (
                      <div className={cn.small}>
                        Joylashuv: {profile.location}
                      </div>
                    )}
                    <a href="/update-profile" className={cn.linkBtn}>
                      Profilni tahrirlash
                    </a>
                  </div>
                </div>
                <div className={cn.infoGrid}>
                  <div className={cn.infoItem}>
                    <div className={cn.infoLabel}>User ID</div>
                    <div className={cn.infoValue}>
                      {profile?.user_id || "—"}
                    </div>
                  </div>
                  <div className={cn.infoItem}>
                    <div className={cn.infoLabel}>Balans</div>
                    <div className={cn.infoValue}>
                      {formatPrice(profile?.balance || 0, "UZS")}
                    </div>
                  </div>
                  <div className={cn.infoItem}>
                    <div className={cn.infoLabel}>Ism</div>
                    <div className={cn.infoValue}>
                      {profile?.first_name || "—"}
                    </div>
                  </div>
                  <div className={cn.infoItem}>
                    <div className={cn.infoLabel}>Familiya</div>
                    <div className={cn.infoValue}>
                      {profile?.last_name || "—"}
                    </div>
                  </div>
                </div>
              </div>

              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 12,
                  flexWrap: "wrap",
                }}
              >
                <div
                  className={`${cn.glass} ${cn.card}`}
                  style={{ flex: "1 1 260px" }}
                >
                  <div className={cn.meta}>Hisobingizda</div>
                  <div className={cn.title}>
                    {formatPrice(profile?.balance || 0, "UZS")}
                  </div>
                  <div className={cn.small}>Taxminiy balans</div>
                </div>
                <div
                  className={`${cn.glass} ${cn.card}`}
                  style={{ flex: "1 1 260px" }}
                >
                  <div className={cn.meta}>Oqimlar</div>
                  <div className={cn.title}>{flows.length}</div>
                  <div className={cn.small}>Yaratilgan referal linklar</div>
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
    </div>
  );
}

export default Profile;
