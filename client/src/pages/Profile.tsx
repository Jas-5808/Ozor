import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "../hooks/useAuth";
import { shopAPI, paymentAPI } from "../services/api";
import { useProducts } from "../hooks/useProducts";
import cn from "./profile.module.scss";
import { formatPrice, getProductImageUrl, getVariantMainImage, shortenUrl } from "../utils/helpers";
import { logger } from "../utils/logger";
import { useFlows } from "../hooks/useFlows";
import SkeletonGrid from "../components/SkeletonGrid";
import useSEO from "../hooks/useSEO";
import { Link, useNavigate } from "react-router-dom";
import { useProfileData } from "../hooks/useProfileData";
import { useReferralActions } from "../hooks/useReferralActions";
import { useInfiniteScroll } from "../hooks/useInfiniteScroll";

export function Profile() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { profile, isAuthenticated, logout, fetchUserProfile } = useAuth();
  const [activeTab, setActiveTab] = useState<
    "market" | "oqim" | "stats" | "payments"
  >("market");
  const [loadingProductId, setLoadingProductId] = useState<string | null>(null);
  
  // Состояния для поиска и сортировки в Market
  const [marketSearchQuery, setMarketSearchQuery] = useState<string>("");
  const [marketSortBy, setMarketSortBy] = useState<string>("default");
  const {
    products,
    loading: productsLoading,
    error: productsError,
  } = useProducts();
  const { flows, removeFlow, clearFlows } = useFlows();
  
  // Состояния для раздела платежей
  const [withdrawalAmount, setWithdrawalAmount] = useState<string>("");
  const [cardNumber, setCardNumber] = useState<string>("");
  const [cardholderName, setCardholderName] = useState<string>("");
  const [withdrawalLoading, setWithdrawalLoading] = useState(false);
  const [withdrawalError, setWithdrawalError] = useState<string | null>(null);
  const [withdrawalSuccess, setWithdrawalSuccess] = useState(false);
  const [withdrawals, setWithdrawals] = useState<Array<{
    id: string;
    amount: number;
    card_number: string;
    cardholder_name: string;
    status: string;
    created_at: string;
    updated_at?: string;
  }>>([]);
  const [withdrawalsLoading, setWithdrawalsLoading] = useState(false);
  const [withdrawalsError, setWithdrawalsError] = useState<string | null>(null);
  
  // Состояние для отслеживания скопированных ссылок (для показа галочки)
  const [copiedLinkId, setCopiedLinkId] = useState<string | null>(null);
  
  // Функция копирования для раздела "Потоки" (без сообщения, с галочкой)
  const handleCopyFlowLink = async (link: string, linkId: string) => {
    try {
      await navigator.clipboard.writeText(link);
      setCopiedLinkId(linkId);
      setTimeout(() => {
        setCopiedLinkId(null);
      }, 1300);
    } catch (error) {
      logger.errorWithContext(error, { context: 'handleCopyFlowLink' });
    }
  };
  
  // Используем кастомные хуки для управления данными
  const profileData = useProfileData();
  const userId = (profile as any)?.user_id || profile?.id || "guest";
  const referralActions = useReferralActions(userId, () => {
    profileData.loadReferrals();
  });

  // SEO: закрыть личный кабинет от индексации
  useSEO({
    title: t("profile.seoTitle"),
    robots: "noindex,nofollow",
    canonical: typeof window !== 'undefined' ? window.location.origin + '/profile' : undefined,
  });

  useEffect(() => {
    if (isAuthenticated && !profile) {
      fetchUserProfile?.();
    }
  }, [isAuthenticated, profile, fetchUserProfile]);

  // Загрузка истории выводов
  const loadWithdrawals = async () => {
    try {
      setWithdrawalsLoading(true);
      setWithdrawalsError(null);
      const response = await paymentAPI.getWithdrawals();
      const data = (response as any)?.data?.data || (response as any)?.data || [];
      setWithdrawals(Array.isArray(data) ? data : []);
    } catch (error: any) {
      setWithdrawalsError(error?.response?.data?.message || error?.message || t("profile.payments.loadError"));
      logger.errorWithContext(error, { context: 'loadWithdrawals' });
    } finally {
      setWithdrawalsLoading(false);
    }
  };

  // Загрузка истории при открытии вкладки платежей
  useEffect(() => {
    if (activeTab === "payments" && isAuthenticated) {
      loadWithdrawals();
    }
  }, [activeTab, isAuthenticated]); // eslint-disable-line react-hooks/exhaustive-deps

  // Создание вывода средств
  const handleWithdrawal = async (e: React.FormEvent) => {
    e.preventDefault();
    setWithdrawalError(null);
    setWithdrawalSuccess(false);

    const amount = parseFloat(withdrawalAmount);
    if (!amount || amount <= 0) {
      setWithdrawalError(t("profile.payments.form.errors.invalidAmount"));
      return;
    }

    if (userBalance !== null && amount > userBalance) {
      setWithdrawalError(t("profile.payments.form.errors.insufficientBalance"));
      return;
    }

    if (!cardNumber || cardNumber.trim().length < 16) {
      setWithdrawalError(t("profile.payments.form.errors.invalidCard"));
      return;
    }

    if (!cardholderName || cardholderName.trim().length < 2) {
      setWithdrawalError(t("profile.payments.form.errors.invalidName"));
      return;
    }

    try {
      setWithdrawalLoading(true);
      await paymentAPI.createWithdrawal({
        amount,
        card_number: cardNumber.replace(/\s/g, ""),
        cardholder_name: cardholderName.trim(),
      });
      setWithdrawalSuccess(true);
      setWithdrawalAmount("");
      setCardNumber("");
      setCardholderName("");
      // Обновляем баланс и историю
      await profileData.refreshBalance();
      setTimeout(() => {
        loadWithdrawals();
        setWithdrawalSuccess(false);
      }, 2000);
    } catch (error: any) {
      setWithdrawalError(error?.response?.data?.message || error?.message || t("profile.payments.form.errors.submitError"));
      logger.errorWithContext(error, { context: 'handleWithdrawal' });
    } finally {
      setWithdrawalLoading(false);
    }
  };

  // Форматирование номера карты
  const formatCardNumber = (value: string) => {
    const cleaned = value.replace(/\s/g, "");
    const match = cleaned.match(/.{1,4}/g);
    return match ? match.join(" ") : cleaned;
  };

  const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCardNumber(e.target.value.replace(/\D/g, ""));
    if (formatted.replace(/\s/g, "").length <= 16) {
      setCardNumber(formatted);
    }
  };

  // Используем данные из хуков
  const {
    apiFlows,
    apiFlowsLoading,
    apiFlowsError,
    referralStats,
    totals,
    userBalance,
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
    return parts.length ? parts.join(" ") : t("profile.hero.missingName");
  }, [profile?.first_name, profile?.last_name, t]);

  const primaryContact = profile?.email || profile?.phone || t("profile.hero.missingContact");
  const profileLocation = profile?.location || t("profile.hero.missingLocation");
  const profileAvatar = (profile as any)?.avatar || "/img/NaturalTitanium.jpg";

  const heroHighlights = [
    {
      label: t("profile.hero.highlights.balance.label"),
      value: formatPrice(userBalance ?? profile?.balance ?? 0, "UZS"),
      helper: t("profile.hero.highlights.balance.helper"),
    },
    {
      label: t("profile.hero.highlights.flows.label"),
      value: ((apiFlows?.length || 0) + (flows?.length || 0)).toLocaleString("ru-RU"),
      helper: t("profile.hero.highlights.flows.helper"),
    },
    {
      label: t("profile.hero.highlights.earnings.label"),
      value: "—", // TODO: Подключить к API
      helper: t("profile.hero.highlights.earnings.helper"),
    },
  ];

  const tabItems: Array<{
    id: typeof activeTab;
    label: string;
    icon: string;
  }> = [
    { id: "market", label: t("profile.tabs.market"), icon: "🛍️" },
    { id: "oqim", label: t("profile.tabs.flows"), icon: "🔗" },
    { id: "stats", label: t("profile.tabs.stats"), icon: "📈" },
    { id: "payments", label: t("profile.tabs.payments"), icon: "💳" },
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

  // Состояние для пагинации в Market
  const [marketDisplayedCount, setMarketDisplayedCount] = useState<number>(12);
  const MARKET_ITEMS_PER_PAGE = 12;

  // Фильтрация и сортировка продуктов для Market
  const filteredAndSortedProducts = useMemo(() => {
    // Фильтрация по поисковому запросу
    const filtered = products.filter((p: any) => {
      if (!marketSearchQuery.trim()) return true;
      const query = marketSearchQuery.toLowerCase().trim();
      const productName = (p.product_name || "").toLowerCase();
      const categoryName = typeof p.category === "string" 
        ? p.category.toLowerCase() 
        : (p.category?.name || "").toLowerCase();
      const sku = (p.variant_sku || "").toLowerCase();
      return productName.includes(query) || categoryName.includes(query) || sku.includes(query);
    });

    // Сортировка
    const sorted = [...filtered].sort((a: any, b: any) => {
      switch (marketSortBy) {
        case "priceAsc":
          return (a.price || 0) - (b.price || 0);
        case "priceDesc":
          return (b.price || 0) - (a.price || 0);
        case "incomeAsc":
          return (a.refferal_price || 0) - (b.refferal_price || 0);
        case "incomeDesc":
          return (b.refferal_price || 0) - (a.refferal_price || 0);
        case "nameAsc":
          return (a.product_name || "").localeCompare(b.product_name || "", "ru");
        case "nameDesc":
          return (b.product_name || "").localeCompare(a.product_name || "", "ru");
        default:
          return 0;
      }
    });

    return sorted;
  }, [products, marketSearchQuery, marketSortBy]);

  // Отображаемые продукты с пагинацией
  const displayedMarketProducts = useMemo(() => {
    return filteredAndSortedProducts.slice(0, marketDisplayedCount);
  }, [filteredAndSortedProducts, marketDisplayedCount]);

  // Есть ли еще продукты для загрузки в Market
  const marketHasMore = marketDisplayedCount < filteredAndSortedProducts.length;

  // Загрузить следующую порцию в Market
  const loadMoreMarket = () => {
    if (marketHasMore && !productsLoading) {
      setMarketDisplayedCount(prev => Math.min(prev + MARKET_ITEMS_PER_PAGE, filteredAndSortedProducts.length));
    }
  };

  // Сброс счетчика при изменении поиска или сортировки
  useEffect(() => {
    setMarketDisplayedCount(MARKET_ITEMS_PER_PAGE);
  }, [marketSearchQuery, marketSortBy]);

  // Хук для бесконечной прокрутки в Market
  const marketSentinelRef = useInfiniteScroll({
    hasMore: marketHasMore,
    loading: productsLoading,
    onLoadMore: loadMoreMarket,
    threshold: 200,
  });

  if (!isAuthenticated) {
    return (
      <div className="mx-auto w-full max-w-[1240px] px-4 sm:px-5 md:px-6 py-6">
        <div className="rounded-2xl bg-white shadow-[0_8px_30px_rgba(0,0,0,0.06)] ring-1 ring-gray-100 p-6 text-gray-800">
          <p className="text-center">{t("profile.guestPrompt")}</p>
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
                <p className="text-xs uppercase tracking-[0.35em] text-white/60">{t("profile.hero.badge")}</p>
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
                    {t("profile.hero.edit")}
                  </Link>
                  <button
                    onClick={logout}
                    className="inline-flex items-center justify-center rounded-2xl border border-white/40 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10"
                  >
                    {t("profile.hero.logout")}
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

        <div className="mt-8 rounded-3xl border border-emerald-100 bg-white/95 p-2 shadow-[0_20px_60px_rgба(15,23,42,0.08)]">
          <div className="flex flex-wrap gap-2">
            {tabItems.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex flex-1 min-w-[130px] items-center justify-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-semibold transition ${
                    isActive
                      ? "bg-white text-emerald-700 shadow-[0_10px_30px_rgba(15,23,42,0.08)] ring-1 ring-emerald-200"
                      : "text-emerald-700 hover:text-emerald-900"
                  }`}
                >
                  <span
                    className={`text-lg ${
                      isActive ? "text-emerald-700" : "text-emerald-600"
                    }`}
                    aria-hidden="true"
                  >
                    {tab.icon}
                  </span>
                  <span className={isActive ? "text-emerald-700" : ""}>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {activeTab === "market" && (
          <section className="mt-6 rounded-[30px] border border-white/80 bg-white p-4 sm:p-5 shadow-[0_25px_80px_rgба(15,23,42,0.05)]">
            <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.35em] text-[#015338]">{t("profile.market.badge")}</p>
                <h3 className="text-2xl font-black text-slate-900">{t("profile.market.title")}</h3>
                <p className="text-sm text-slate-500">{t("profile.market.subtitle")}</p>
              </div>
              <span className="inline-flex items-center gap-1 rounded-full bg-slate-100/80 px-3 py-1 text-xs font-semibold text-slate-700 w-fit">
                {t("profile.market.productCount", { count: filteredAndSortedProducts.length })}
              </span>
            </div>
            
            {/* Поиск и сортировка */}
            <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex-1 max-w-md">
                <div className="relative">
                  <input
                    type="text"
                    value={marketSearchQuery}
                    onChange={(e) => setMarketSearchQuery(e.target.value)}
                    placeholder={t("profile.market.search.placeholder")}
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 pl-11 text-sm font-semibold text-slate-900 placeholder:text-slate-400 focus:border-[#04734b] focus:outline-none focus:ring-2 focus:ring-[#04734b]/20"
                  />
                  <svg
                    className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                    />
                  </svg>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <label className="text-sm font-semibold text-slate-700 whitespace-nowrap">
                  {t("profile.market.sort.label")}:
                </label>
                <select
                  value={marketSortBy}
                  onChange={(e) => setMarketSortBy(e.target.value)}
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 focus:border-[#04734b] focus:outline-none focus:ring-2 focus:ring-[#04734b]/20 cursor-pointer"
                >
                  <option value="default">{t("profile.market.sort.default")}</option>
                  <option value="priceAsc">{t("profile.market.sort.priceAsc")}</option>
                  <option value="priceDesc">{t("profile.market.sort.priceDesc")}</option>
                  <option value="incomeAsc">{t("profile.market.sort.incomeAsc")}</option>
                  <option value="incomeDesc">{t("profile.market.sort.incomeDesc")}</option>
                  <option value="nameAsc">{t("profile.market.sort.nameAsc")}</option>
                  <option value="nameDesc">{t("profile.market.sort.nameDesc")}</option>
                </select>
              </div>
            </div>
            
            {productsLoading && (
              <div className="rounded-2xl border border-dashed border-slate-200 p-6">
                <SkeletonGrid count={8} columns={4} />
              </div>
            )}
            {productsError && (
              <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
                {t("profile.market.error", { message: String(productsError) })}
              </div>
            )}
            {!productsLoading && !productsError && (
              filteredAndSortedProducts.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center">
                  <p className="text-sm font-semibold text-slate-500">{t("profile.market.search.empty")}</p>
                </div>
              ) : (
                <>
                  <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                    {displayedMarketProducts.map((p: any, index: number) => {
                    const productId = p?.product_id || p?.id || p?.productId || "";
                    const referralValue = formatPrice(p.refferal_price || 0);
                    const priceValue = formatPrice(p.price || 0);
                    const isLoadingCard = Boolean(productId) && loadingProductId === productId;
                    const canOpenProduct = Boolean(productId);
                    const categoryLabel =
                      typeof p.category === "string"
                        ? p.category
                        : p.category?.name || t("profile.market.card.categoryFallback");

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
                              {t("profile.market.card.loading")}
                            </span>
                          )}
                        </button>
                        <div className="mt-4 flex flex-1 flex-col gap-4">
                          <div>
                            <h4 className="text-base font-bold text-slate-900 line-clamp-2">{p.product_name}</h4>
                            <p className="mt-1 text-xs uppercase tracking-wide text-slate-500">{t("profile.market.card.skuLabel")}: {p.variant_sku || "—"}</p>
                          </div>
                          <div className="flex flex-wrap items-center gap-3 rounded-2xl bg-slate-100/60 px-3 py-2">
                            <div className="flex flex-col">
                              <span className="text-xs text-slate-500">{t("profile.market.card.priceLabel")}</span>
                              <span className="text-lg font-extrabold text-slate-900">{priceValue}</span>
                            </div>
                            <div className="h-8 w-px bg-slate-200" />
                            <div className="flex flex-col">
                              <span className="text-xs text-slate-500">{t("profile.market.card.incomeLabel")}</span>
                              <span className="inline-flex items-center gap-2 text-sm font-semibold text-[#04734b]">
                                {referralValue}
                                <span className="rounded-full bg-[#e6f8ef] px-2 py-0.5 text-[11px] font-bold text-[#04734b]">
                                  +
                                </span>
                              </span>
                            </div>
                          </div>
                          <div className="mt-auto space-y-3">
                            <button
                              type="button"
                              className="group relative h-12 w-full rounded-[18px] text-sm font-semibold uppercase tracking-wide text-white shadow-[0_22px_48px_rgba(6,78,59,0.45)] ring-1 ring-white/20 transition hover:scale-[1.01] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
                              style={{ background: "linear-gradient(92.41deg, rgb(0, 61, 50), rgb(4, 115, 75))" }}
                              disabled={createLoading || isLoadingCard}
                              onClick={() => handleGenerate(p)}
                            >
                              <span className="absolute inset-0 rounded-[18px] bg-white/15 opacity-0 transition group-hover:opacity-100" />
                              <span className="relative inline-flex items-center justify-center gap-2">
                                <span className="h-1.5 w-1.5 rounded-full bg-white" />
                                {createLoading ? t("profile.market.card.creating") : t("profile.market.card.create")}
                              </span>
                            </button>
                            <button
                              type="button"
                              className="h-12 w-full rounded-[18px] border border-slate-200 bg-white text-sm font-semibold text-slate-800 shadow-[0_12px_30px_rgba(15,23,42,0.1)] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
                              onClick={handleOpenProduct}
                              disabled={isLoadingCard || !canOpenProduct}
                            >
                              {t("profile.market.card.view")}
                            </button>
                          </div>
                        </div>
                      </article>
                    );
                  })}
                  </div>
                  {/* Элемент-триггер для бесконечной прокрутки */}
                  <div ref={marketSentinelRef} className="h-4 w-full" />
                  {/* Индикатор загрузки при подгрузке */}
                  {marketHasMore && (
                    <div className="flex justify-center items-center py-8">
                      <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-[#04734b]"></div>
                    </div>
                  )}
                </>
              )
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
                  <p>{t("profile.flows.empty")}</p>
                )}
                {referralStats.map((r) => {
                  const linkedFlow = apiFlows.find((flow) => flow.id === r.id);
                  const origin = typeof window !== "undefined" ? window.location.origin : "";
                  const shareLink = linkedFlow ? `${origin}/product/${linkedFlow.product_id}?ref=${r.code}` : "";
                  const createdAt = linkedFlow?.created_at || (linkedFlow as any)?.createdAt;
                  // Получаем название товара из первого заказа или из linkedFlow
                  const productName = linkedFlow?.orders?.[0]?.items?.[0]?.product_name 
                    || linkedFlow?.product_name 
                    || "";
                  const linkTitle = r.title || r.code;
                  const isCopied = copiedLinkId === r.id;

                  return (
                    <div
                      key={r.id}
                      className={`${cn.glass} ${cn.flowRow} p-4 border border-gray-200 rounded-2xl bg-white shadow-[0_8px_30px_rgba(0,0,0,0.04)]`}
                    >
                      <div className="flex flex-wrap items-center gap-3">
                        <div className="flex items-center gap-2 shrink-0">
                          <div className="flex flex-col">
                            <div className="text-base font-extrabold text-slate-900">{linkTitle}</div>
                            {productName && (
                              <div className="text-xs text-slate-500 mt-0.5">{productName}</div>
                            )}
                          </div>
                          <span className="inline-flex h-6 items-center px-2 rounded-full text-xs font-bold border border-emerald-300 text-emerald-700 bg-emerald-50">
                            {r.code}
                          </span>
                        </div>
                        <div className="flex-1 min-w-[220px]">
                          <div className="flex items-center gap-2">
                            <div 
                              className="flex-1 break-all rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-xs text-slate-600 cursor-pointer"
                              title={shareLink}
                              onClick={() => shareLink && handleCopyFlowLink(shareLink, r.id)}
                            >
                              {shortenUrl(shareLink, 35)}
                            </div>
                            <div className="inline-flex items-center gap-2 shrink-0">
                              <button
                                className={`h-8 w-8 inline-flex items-center justify-center rounded-lg border transition-colors ${
                                  isCopied 
                                    ? "border-emerald-300 bg-emerald-50" 
                                    : "border-slate-200 hover:bg-slate-50"
                                }`}
                                title={t("profile.flows.copy")}
                                aria-label={t("profile.flows.copy")}
                                onClick={() => shareLink && handleCopyFlowLink(shareLink, r.id)}
                              >
                                {isCopied ? (
                                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M20 6L9 17l-5-5" stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                  </svg>
                                ) : (
                                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <rect x="9" y="9" width="12" height="12" rx="2" stroke="#334155" strokeWidth="2" />
                                    <rect x="3" y="3" width="12" height="12" rx="2" stroke="#334155" strokeWidth="2" />
                                  </svg>
                                )}
                              </button>
                              <button
                                className={`h-8 w-8 inline-flex items-center justify-center rounded-lg border ${
                                  deletingReferralId === r.id ? "opacity-50 cursor-not-allowed" : ""
                                } border-red-200 hover:bg-red-50`}
                                title={t("profile.flows.delete")}
                                aria-label={t("profile.flows.delete")}
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
                            {formatPrice(r.product_referal_price || 0)}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
                {flows.map((f) => {
                  const isCopied = copiedLinkId === f.id;
                  
                  return (
                    <div
                      key={f.id}
                      className={`${cn.glass} ${cn.flowRow} p-4 border border-gray-200 rounded-2xl bg-white shadow-[0_8px_30px_rgba(0,0,0,0.04)]`}
                    >
                      <div className="flex flex-wrap items-center gap-3">
                        {/* Left: title + commission */}
                        <div className="flex items-center gap-2 shrink-0">
                          <div className="flex flex-col">
                            <div className="text-base font-extrabold text-slate-900">{f.productName}</div>
                          </div>
                          <span className="inline-flex h-6 items-center px-2 rounded-full text-xs font-bold border border-emerald-300 text-emerald-700 bg-emerald-50">+ {formatPrice(f.commission || 0)}</span>
                        </div>
                        {/* Middle: link */}
                        <div className="flex-1 min-w-[220px]">
                          <div className="flex items-center gap-2">
                            <div 
                              className="flex-1 text-xs text-slate-600 break-all bg-slate-50 border border-slate-200 rounded-md px-2 py-1 cursor-pointer"
                              title={f.link}
                              onClick={() => handleCopyFlowLink(f.link, f.id)}
                            >
                              {shortenUrl(f.link, 35)}
                            </div>
                            <div className="inline-flex items-center gap-2">
                              <button
                                className={`h-8 w-8 inline-flex items-center justify-center rounded-lg border transition-colors ${
                                  isCopied 
                                    ? "border-emerald-300 bg-emerald-50" 
                                    : "border-slate-200 hover:bg-slate-50"
                                }`}
                                title={t("profile.flows.copy")}
                                aria-label={t("profile.flows.copy")}
                                onClick={() => handleCopyFlowLink(f.link, f.id)}
                              >
                                {isCopied ? (
                                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M20 6L9 17l-5-5" stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                  </svg>
                                ) : (
                                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <rect x="9" y="9" width="12" height="12" rx="2" stroke="#334155" strokeWidth="2"/>
                                    <rect x="3" y="3" width="12" height="12" rx="2" stroke="#334155" strokeWidth="2"/>
                                  </svg>
                                )}
                              </button>
                            <button
                              className="h-8 w-8 inline-flex items-center justify-center rounded-lg border border-red-200 hover:bg-red-50"
                              title={t("profile.flows.delete")}
                              aria-label={t("profile.flows.delete")}
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
                  );
                })}
                {flows.length > 0 && (
                  <div className={`${cn.actions} sm:col-span-2 lg:col-span-3`}>
                    <button className={`${cn.button} ${cn.secondary} ${cn.compact}`} onClick={clearFlows}>
                      {t("profile.flows.clear")}
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
                <div className="text-xs tracking-wide uppercase text-emerald-900 font-bold">{t("profile.stats.cards.total.label")}</div>
                <div className="text-3xl font-black text-emerald-900 mt-1">{totals.total}</div>
                <div className="text-xs text-emerald-800/80">{t("profile.stats.cards.total.helper")}</div>
              </div>
              <div className="rounded-2xl border border-amber-100 bg-amber-50/80 p-4">
                <div className="text-xs tracking-wide uppercase text-amber-900 font-bold">{t("profile.stats.cards.hold.label")}</div>
                <div className="text-3xl font-black text-amber-900 mt-1">{totals.hold}</div>
                <div className="text-xs text-amber-800/80">{t("profile.stats.cards.hold.helper")}</div>
              </div>
              <div className="rounded-2xl border border-sky-100 bg-sky-50/80 p-4">
                <div className="text-xs tracking-wide uppercase text-sky-900 font-bold">{t("profile.stats.cards.paid.label")}</div>
                <div className="text-3xl font-black text-sky-900 mt-1">{totals.paid}</div>
                <div className="text-xs text-sky-800/80">{t("profile.stats.cards.paid.helper")}</div>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <div className="text-xs tracking-wide uppercase text-slate-600 font-bold">{t("profile.stats.cards.balance.label")}</div>
                <div className="text-3xl font-black text-slate-900 mt-1">
                  {formatPrice(userBalance ?? profile?.balance ?? 0, "UZS")}
                </div>
                <div className="text-xs text-slate-500">{t("profile.stats.cards.balance.helper")}</div>
              </div>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="text-base font-extrabold text-slate-900">{t("profile.stats.table.title")}</div>
                <div className="text-xs text-slate-500">{t("profile.stats.table.subtitle")}</div>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="text-slate-500">
                      <th className="text-left py-2">{t("profile.stats.table.headers.title")}</th>
                      <th className="text-left py-2">{t("profile.stats.table.headers.code")}</th>
                      <th className="text-right py-2">{t("profile.stats.table.headers.total")}</th>
                      <th className="text-right py-2">{t("profile.stats.table.headers.hold")}</th>
                      <th className="text-right py-2">{t("profile.stats.table.headers.paid")}</th>
                      <th className="text-right py-2">{t("profile.stats.table.headers.earned")}</th>
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
                          {t("profile.stats.table.empty")}
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
          <section className="mt-6 rounded-[30px] border border-white/80 bg-white p-4 sm:p-5 shadow-[0_25px_80px_rgba(15,23,42,0.05)]">
            <div className="mb-6">
              <p className="text-xs uppercase tracking-[0.35em] text-[#015338]">{t("profile.payments.badge")}</p>
              <h3 className="text-2xl font-black text-slate-900">{t("profile.payments.title")}</h3>
              <p className="text-sm text-slate-500">{t("profile.payments.subtitle")}</p>
            </div>

            {/* Форма вывода средств */}
            <div className="mb-8 rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-6 shadow-[0_8px_30px_rgba(15,23,42,0.08)]">
              <h4 className="mb-4 text-lg font-bold text-slate-900">{t("profile.payments.form.title")}</h4>
              
              {withdrawalSuccess && (
                <div className="mb-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">
                  {t("profile.payments.form.success")}
                </div>
              )}

              {withdrawalError && (
                <div className="mb-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-600">
                  {withdrawalError}
                </div>
              )}

              <form onSubmit={handleWithdrawal} className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-slate-700">
                      {t("profile.payments.form.amountLabel")}
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        value={withdrawalAmount}
                        onChange={(e) => setWithdrawalAmount(e.target.value)}
                        placeholder={t("profile.payments.form.amountPlaceholder")}
                        min="1"
                        max={userBalance ?? undefined}
                        step="0.01"
                        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 focus:border-[#04734b] focus:outline-none focus:ring-2 focus:ring-[#04734b]/20"
                        required
                      />
                      {userBalance !== null && (
                        <div className="mt-2 text-xs text-slate-500">
                          {t("profile.payments.form.availableBalance")}: {formatPrice(userBalance, "UZS")}
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-semibold text-slate-700">
                      {t("profile.payments.form.cardNumberLabel")}
                    </label>
                    <input
                      type="text"
                      value={cardNumber}
                      onChange={handleCardNumberChange}
                      placeholder={t("profile.payments.form.cardNumberPlaceholder")}
                      maxLength={19}
                      className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 focus:border-[#04734b] focus:outline-none focus:ring-2 focus:ring-[#04734b]/20"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    {t("profile.payments.form.cardholderNameLabel")}
                  </label>
                  <input
                    type="text"
                    value={cardholderName}
                    onChange={(e) => setCardholderName(e.target.value)}
                    placeholder={t("profile.payments.form.cardholderNamePlaceholder")}
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 focus:border-[#04734b] focus:outline-none focus:ring-2 focus:ring-[#04734b]/20"
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={withdrawalLoading || userBalance === null || userBalance === 0}
                  className="w-full rounded-2xl py-3 text-sm font-semibold uppercase tracking-wide text-white shadow-[0_22px_48px_rgba(6,78,59,0.45)] ring-1 ring-white/20 transition hover:scale-[1.01] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
                  style={{ background: "linear-gradient(92.41deg, #003d32, #04734b)" }}
                >
                  {withdrawalLoading ? t("profile.payments.form.submitting") : t("profile.payments.form.submit")}
                </button>
              </form>
            </div>

            {/* Статистика выводов */}
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_8px_30px_rgba(0,0,0,0.04)]">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h4 className="text-base font-extrabold text-slate-900">{t("profile.payments.history.title")}</h4>
                  <p className="text-xs text-slate-500">{t("profile.payments.history.subtitle")}</p>
                </div>
              </div>

              {withdrawalsLoading && (
                <div className="py-8 text-center">
                  <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-[#04734b]"></div>
                  <p className="mt-2 text-sm text-slate-500">{t("profile.payments.history.loading")}</p>
                </div>
              )}

              {withdrawalsError && (
                <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
                  {withdrawalsError}
                </div>
              )}

              {!withdrawalsLoading && !withdrawalsError && (
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-500">
                        <th className="text-left py-3">{t("profile.payments.history.table.date")}</th>
                        <th className="text-left py-3">{t("profile.payments.history.table.amount")}</th>
                        <th className="text-left py-3">{t("profile.payments.history.table.cardNumber")}</th>
                        <th className="text-left py-3">{t("profile.payments.history.table.cardholderName")}</th>
                        <th className="text-left py-3">{t("profile.payments.history.table.status")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {withdrawals.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="py-8 text-center text-slate-500">
                            {t("profile.payments.history.empty")}
                          </td>
                        </tr>
                      ) : (
                        withdrawals.map((withdrawal) => (
                          <tr key={withdrawal.id} className="border-b border-slate-100 hover:bg-slate-50">
                            <td className="py-3 text-slate-600">
                              {new Date(withdrawal.created_at).toLocaleString()}
                            </td>
                            <td className="py-3 font-semibold text-slate-900">
                              {formatPrice(withdrawal.amount, "UZS")}
                            </td>
                            <td className="py-3 text-slate-600">
                              **** {withdrawal.card_number.slice(-4)}
                            </td>
                            <td className="py-3 text-slate-600">{withdrawal.cardholder_name}</td>
                            <td className="py-3">
                              <span
                                className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-bold ${
                                  withdrawal.status === "completed" || withdrawal.status === "paid"
                                    ? "bg-emerald-100 text-emerald-700"
                                    : withdrawal.status === "pending"
                                    ? "bg-amber-100 text-amber-700"
                                    : withdrawal.status === "rejected" || withdrawal.status === "failed"
                                    ? "bg-rose-100 text-rose-700"
                                    : "bg-slate-100 text-slate-700"
                                }`}
                              >
                                {withdrawal.status === "completed" || withdrawal.status === "paid"
                                  ? t("profile.payments.history.status.completed")
                                  : withdrawal.status === "pending"
                                  ? t("profile.payments.history.status.pending")
                                  : withdrawal.status === "rejected" || withdrawal.status === "failed"
                                  ? t("profile.payments.history.status.rejected")
                                  : withdrawal.status}
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </section>
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
                {t("profile.dialog.subtitle")}
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
                  {t("profile.dialog.copy")}
                </button>
                <button
                  className={`${cn.button} ${cn.secondary} ${cn.compact}`}
                  onClick={() => setDialog({ open: false })}
                >
                  {t("profile.dialog.close")}
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
                aria-label={t("profile.dialog.close")}
              >
                ×
              </button>
              <div className="mb-4 flex flex-col gap-1">
                <p className="text-xs uppercase tracking-[0.4em] text-[#fb923c]">{t("profile.createModal.badge")}</p>
                <h4 className="text-xl font-black text-slate-900">{createModal.product?.product_name}</h4>
                <p className="text-sm text-slate-500">
                  {t("profile.createModal.description")}
                </p>
              </div>
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    {t("profile.createModal.titleLabel")}
                  </label>
                  <input
                    value={createModal.title}
                    onChange={(e) => setCreateModal({ ...createModal, title: e.target.value })}
                    placeholder={t("profile.createModal.titlePlaceholder")}
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
                  {t("profile.createModal.terms")}
                </label>
                {createError && (
                  <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-600">
                    {createError}
                  </div>
                )}
                <div className="flex flex-col gap-2 sm:flex-row">
                  <button
                    className="flex-1 rounded-2xl py-3 text-sm font-semibold text-white shadow-[0_18px_38px_rgba(6,78,59,0.35)] transition hover:brightness-110"
                    style={{ background: "linear-gradient(92.41deg, rgb(0, 61, 50), rgb(4, 115, 75))" }}
                    onClick={submitCreateReferral}
                    disabled={createLoading || !createModal.agree}
                  >
                    {createLoading ? t("profile.createModal.submitting") : t("profile.createModal.submit")}
                  </button>
                  <button
                    className="flex-1 rounded-2xl border border-slate-200 py-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
                    onClick={() => setCreateModal({ open: false, title: "", agree: false })}
                  >
                    {t("profile.createModal.cancel")}
                  </button>
                </div>
                {createModal.createdLink && (
                  <div className="space-y-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-emerald-800">
                      {t("profile.createModal.successBadge")}
                    </p>
                    <div className="flex items-center gap-2">
                      <input
                        readOnly
                        value={shortenUrl(createModal.createdLink, 40)}
                        title={createModal.createdLink}
                        className="flex-1 rounded-2xl border border-emerald-200 bg-white px-3 py-2 text-sm text-emerald-800 focus:outline-none cursor-pointer"
                        onClick={(e) => {
                          e.currentTarget.select();
                          handleCopy(createModal.createdLink!);
                        }}
                      />
                      <button
                        className="inline-flex items-center justify-center rounded-2xl bg-white px-4 py-2 text-sm font-semibold text-[#015338] shadow-[0_16px_30px_rgba(255,255,255,0.35)] transition hover:translate-y-0.5"
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
