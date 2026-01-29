import { useEffect, useMemo, useState, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "../hooks/useAuth";
import { shopAPI, paymentAPI } from "../services/api";
import { useProductsPaged } from "../hooks/useProducts";
// Полностью переводим страницу профиля на Tailwind (без SCSS-модуля)
import { formatPrice, getProductImageUrl, getVariantMainImage, shortenUrl } from "../utils/helpers";
import { logger } from "../utils/logger";
import { resolveProductDescription, resolveProductName } from "../utils/productUtils";
import { PROFILE_MARKET_SEARCH_LIMIT } from "../config/pagination";
import { useFlows } from "../hooks/useFlows";
import SkeletonGrid from "../components/SkeletonGrid";
import useSEO from "../hooks/useSEO";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useProfileData } from "../hooks/useProfileData";
import { useReferralActions } from "../hooks/useReferralActions";
import { useDebounce } from "../hooks/useDebounce";

export function Profile() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { profile, isAuthenticated, logout, fetchUserProfile } = useAuth();

  type ProfileTab = "market" | "oqim" | "stats" | "payments";
  const isProfileTab = (value: any): value is ProfileTab =>
    value === "market" || value === "oqim" || value === "stats" || value === "payments";

  // Важно: таб должен сохраняться при refresh.
  // Поэтому используем query-параметр ?tab=stats и синхронизируем с состоянием.
  const [activeTab, setActiveTab] = useState<ProfileTab>(() => {
    try {
      const raw = typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("tab") : null;
      return isProfileTab(raw) ? raw : "market";
    } catch {
      return "market";
    }
  });
  const [loadingProductId, setLoadingProductId] = useState<string | null>(null);
  const [showBalanceDetails, setShowBalanceDetails] = useState(false);
  
  // Состояния для поиска и сортировки в Market
  const [marketSearchQuery, setMarketSearchQuery] = useState<string>("");
  const [marketSortBy, setMarketSortBy] = useState<string>("default");
  
  // Состояния для подсказок поиска
  const [searchSuggestions, setSearchSuggestions] = useState<Array<{ product_name: string; product_id: string }>>([]);
  const [showSearchSuggestions, setShowSearchSuggestions] = useState(false);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const debouncedSearchQuery = useDebounce(marketSearchQuery, 300);
  const searchInputRef = useRef<HTMLDivElement>(null);
  // Базовая витрина (постранично), чтобы не тянуть весь каталог в Profile
  const {
    products: baseProducts,
    loading: baseProductsLoading,
    error: baseProductsError,
    hasMore: baseHasMore,
    loadMore: baseLoadMore,
  } = useProductsPaged();
  const { flows, removeFlow, clearFlows } = useFlows();

  // Режим поиска в Market (серверный поиск + пагинация)
  const [marketSearchRaw, setMarketSearchRaw] = useState<any[]>([]);
  const [marketSearchOffset, setMarketSearchOffset] = useState(0);
  const [marketSearchHasMore, setMarketSearchHasMore] = useState(true);
  const [marketSearchLoading, setMarketSearchLoading] = useState(false);
  const [marketSearchError, setMarketSearchError] = useState<string | null>(null);
  const MARKET_SEARCH_LIMIT = PROFILE_MARKET_SEARCH_LIMIT;
  const isMarketSearchMode = debouncedSearchQuery.trim().length >= 2;
  
  // Состояния для раздела платежей
  const [withdrawalAmount, setWithdrawalAmount] = useState<string>("");
  const [cardNumber, setCardNumber] = useState<string>("");
  const [cardholderName, setCardholderName] = useState<string>("");
  const [withdrawalLoading, setWithdrawalLoading] = useState(false);
  const [withdrawalError, setWithdrawalError] = useState<string | null>(null);
  const [withdrawalSuccess, setWithdrawalSuccess] = useState(false);
  // Платежные поручения (statements)
  const [statementAmount, setStatementAmount] = useState<string>("");
  const [statementCardNumber, setStatementCardNumber] = useState<string>("");
  const [statementCardHolder, setStatementCardHolder] = useState<string>("");
  const [statementDescription, setStatementDescription] = useState<string>("");
  const [statementLoading, setStatementLoading] = useState(false);
  const [statementError, setStatementError] = useState<string | null>(null);
  const [statementSuccess, setStatementSuccess] = useState(false);
  const [statements, setStatements] = useState<Array<{
    id: string;
    card_holder_name: string;
    card_number: string;
    amount: number;
    status?: string;
    type?: string;
    description?: string;
    image?: string;
    created_at: string;
  }>>([]);
  const [statementsLoading, setStatementsLoading] = useState(false);
  const [statementsError, setStatementsError] = useState<string | null>(null);
  const [statementsStatus, setStatementsStatus] = useState<string>("");
  const [statementsPagination, setStatementsPagination] = useState<{ offset: number; limit: number; total: number }>({
    offset: 0,
    limit: 10,
    total: 0,
  });
  
  // Состояние для отслеживания скопированных ссылок (для показа галочки)
  const [copiedLinkId, setCopiedLinkId] = useState<string | null>(null);

  // Поиск по ссылкам (Oqim)
  const [oqimSearchQuery, setOqimSearchQuery] = useState<string>("");
  const debouncedOqimSearchQuery = useDebounce(oqimSearchQuery, 250);
  
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

  const [confirmModal, setConfirmModal] = useState<{
    open: boolean;
    title: string;
    message: string;
    confirmLabel: string;
    danger?: boolean;
    onConfirm?: () => void | Promise<void>;
  }>({
    open: false,
    title: "",
    message: "",
    confirmLabel: "",
    danger: false,
    onConfirm: undefined,
  });
  const [confirmLoading, setConfirmLoading] = useState(false);

  const openConfirmModal = (opts: {
    title: string;
    message: string;
    confirmLabel: string;
    danger?: boolean;
    onConfirm: () => void | Promise<void>;
  }) => {
    setConfirmLoading(false);
    setConfirmModal({ open: true, ...opts });
  };

  const closeConfirmModal = () => {
    if (confirmLoading) return;
    setConfirmModal((prev) => ({ ...prev, open: false }));
  };

  const runConfirm = async () => {
    if (!confirmModal.onConfirm) return;
    try {
      setConfirmLoading(true);
      await confirmModal.onConfirm();
      setConfirmModal((prev) => ({ ...prev, open: false }));
    } finally {
      setConfirmLoading(false);
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

  // Загрузка истории при открытии вкладки платежей
  useEffect(() => {
    if (activeTab === "payments" && isAuthenticated) {
      loadStatements({ offset: 0, limit: statementsPagination.limit });
    }
  }, [activeTab, isAuthenticated]); // eslint-disable-line react-hooks/exhaustive-deps

  // URL -> state (back/forward, manual edits, refresh)
  useEffect(() => {
    const raw = searchParams.get("tab");
    if (isProfileTab(raw) && raw !== activeTab) {
      setActiveTab(raw);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  // state -> URL (клики по табам/программные смены)
  useEffect(() => {
    const current = searchParams.get("tab");
    if (current === activeTab) return;
    const next = new URLSearchParams(searchParams);
    next.set("tab", activeTab);
    setSearchParams(next, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

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

    if (availableBalance !== null && amount > availableBalance) {
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
        card_holder_name: cardholderName.trim(),
        description: "string",
      });
      setWithdrawalSuccess(true);
      setWithdrawalAmount("");
      setCardNumber("");
      setCardholderName("");
      // Обновляем баланс
      await profileData.refreshBalance();
      setTimeout(() => {
        setWithdrawalSuccess(false);
      }, 2000);
    } catch (error: any) {
      setWithdrawalError(error?.response?.data?.message || error?.message || t("profile.payments.form.errors.submitError"));
      logger.errorWithContext(error, { context: 'handleWithdrawal' });
    } finally {
      setWithdrawalLoading(false);
    }
  };

  // Создание платежного поручения (statement)
  const handleCreateStatement = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatementError(null);
    setStatementSuccess(false);

    const amount = parseFloat(statementAmount);
    if (!amount || amount <= 0) {
      setStatementError(t("profile.payments.form.errors.invalidAmount"));
      return;
    }
    if (!statementCardNumber || statementCardNumber.replace(/\s/g, "").length < 16) {
      setStatementError(t("profile.payments.form.errors.invalidCard"));
      return;
    }
    if (!statementCardHolder || statementCardHolder.trim().length < 2) {
      setStatementError(t("profile.payments.form.errors.invalidName"));
      return;
    }

    try {
      setStatementLoading(true);
      await paymentAPI.createStatement({
        amount,
        card_number: statementCardNumber.replace(/\s/g, ""),
        card_holder_name: statementCardHolder.trim(),
        description: statementDescription,
      });
      setStatementSuccess(true);
      setStatementAmount("");
      setStatementCardNumber("");
      setStatementCardHolder("");
      setStatementDescription("");
    } catch (error: any) {
      setStatementError(
        error?.response?.data?.message ||
        error?.message ||
        t("profile.payments.form.errors.submitError")
      );
      logger.errorWithContext(error, { context: 'createStatement' });
    } finally {
      setStatementLoading(false);
    }
  };

  // Загрузка statements
  const loadStatements = async (opts?: { status?: string; offset?: number; limit?: number }) => {
    try {
      setStatementsLoading(true);
      setStatementsError(null);
      const status = opts?.status ?? statementsStatus;
      const offset = opts?.offset ?? statementsPagination.offset;
      const limit = opts?.limit ?? statementsPagination.limit;
      const response = await paymentAPI.getStatements({ status, offset, limit });
      const data = (response as any)?.data;
      const items = data?.items || data?.data?.items || [];
      const total = data?.total ?? items.length;
      const sortedItems = Array.isArray(items)
        ? items.slice().sort((a: any, b: any) => {
            const aTime = a?.created_at ? new Date(a.created_at).getTime() : 0;
            const bTime = b?.created_at ? new Date(b.created_at).getTime() : 0;
            return bTime - aTime;
          })
        : [];
      setStatements(sortedItems);
      setStatementsPagination({ offset, limit, total });
      if (opts?.status !== undefined) {
        setStatementsStatus(status);
      }
    } catch (error: any) {
      setStatementsError(error?.response?.data?.message || error?.message || t("profile.payments.history.loadError"));
      logger.errorWithContext(error, { context: 'loadStatements' });
    } finally {
      setStatementsLoading(false);
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
    balanceSummary,
    balanceLoading,
    balanceError,
  } = profileData;

  const availableBalance = useMemo(() => {
    if (typeof balanceSummary?.available_balance === "number") {
      return balanceSummary.available_balance;
    }
    return null;
  }, [balanceSummary?.available_balance]);

  const totalBalance = useMemo(() => {
    if (typeof balanceSummary?.total_balance === "number") {
      return balanceSummary.total_balance;
    }
    return 0;
  }, [balanceSummary?.total_balance]);

  const availableBalanceLabel =
    availableBalance === null
      ? "—"
      : formatPrice(availableBalance, "UZS");

  const oqimQuery = useMemo(() => debouncedOqimSearchQuery.trim().toLowerCase(), [debouncedOqimSearchQuery]);
  const apiFlowById = useMemo(() => {
    const m = new Map<string, any>();
    for (const f of Array.isArray(apiFlows) ? apiFlows : []) {
      if (f?.id) m.set(String(f.id), f);
    }
    return m;
  }, [apiFlows]);

  const filteredReferralStats = useMemo(() => {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    let result = Array.isArray(referralStats) ? referralStats : [];
    
    // Фильтрация по поисковому запросу
    if (oqimQuery) {
      result = result.filter((r: any) => {
        const linkedFlow = apiFlowById.get(String(r?.id || ""));
        const referralCode = String(linkedFlow?.code || "").trim();
        const shareLink = linkedFlow?.link
          ? String(linkedFlow.link)
          : (linkedFlow && linkedFlow.product_id && referralCode)
          ? `${origin}/r/${encodeURIComponent(String(linkedFlow.product_id))}/${encodeURIComponent(referralCode)}`
          : "";
        const productName = linkedFlow?.orders?.[0]?.items?.[0]?.product_name || linkedFlow?.product_name || "";
        const linkTitle = r?.title || r?.code || "";
        const hay = [linkTitle, r?.code, productName, referralCode, shareLink].join(" ").toLowerCase();
        return hay.includes(oqimQuery);
      });
    }
    
    // Сортировка по дате создания (новые сверху)
    return result.slice().sort((a: any, b: any) => {
      const linkedFlowA = apiFlowById.get(String(a?.id || ""));
      const linkedFlowB = apiFlowById.get(String(b?.id || ""));
      const dateA = linkedFlowA?.created_at || (linkedFlowA as any)?.createdAt || "";
      const dateB = linkedFlowB?.created_at || (linkedFlowB as any)?.createdAt || "";
      const timeA = dateA ? new Date(dateA).getTime() : 0;
      const timeB = dateB ? new Date(dateB).getTime() : 0;
      return timeB - timeA; // Новые сверху (убывание)
    });
  }, [oqimQuery, referralStats, apiFlowById]);

  const filteredLocalFlows = useMemo(() => {
    let result = Array.isArray(flows) ? flows : [];
    
    // Фильтрация по поисковому запросу
    if (oqimQuery) {
      result = result.filter((f: any) => {
        const hay = [f?.productName, f?.link, f?.id].join(" ").toLowerCase();
        return hay.includes(oqimQuery);
      });
    }
    
    // Сортировка по дате создания (новые сверху)
    return result.slice().sort((a: any, b: any) => {
      const dateA = a?.createdAt || "";
      const dateB = b?.createdAt || "";
      const timeA = dateA ? new Date(dateA).getTime() : 0;
      const timeB = dateB ? new Date(dateB).getTime() : 0;
      return timeB - timeA; // Новые сверху (убывание)
    });
  }, [oqimQuery, flows]);

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

  const heroHighlights = [
    {
      id: "balance",
      label: t("profile.hero.highlights.balance.label"),
      value: availableBalanceLabel,
      helper: t("profile.hero.highlights.balance.helper"),
      onClick: () => {
        setActiveTab("stats");
        setShowBalanceDetails(true);
      },
    },
    {
      id: "flows",
      label: t("profile.hero.highlights.flows.label"),
      value: ((apiFlows?.length || 0) + (flows?.length || 0)).toLocaleString("ru-RU"),
      helper: t("profile.hero.highlights.flows.helper"),
    },
    {
      id: "earnings",
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

  const marketSourceProducts = useMemo(() => {
    return isMarketSearchMode ? marketSearchRaw : baseProducts;
  }, [isMarketSearchMode, marketSearchRaw, baseProducts]);

  // Фильтрация и сортировка продуктов для Market (поверх текущего источника)
  const filteredAndSortedProducts = useMemo(() => {
    // Фильтрация по поисковому запросу
    const filtered = marketSourceProducts.filter((p: any) => {
      // Не показываем товары с нулевым доходом
      if (!p.refferal_price || Number(p.refferal_price) <= 0) return false;

      // Если включён серверный поиск — здесь уже "подборка", доп. фильтр не нужен
      if (isMarketSearchMode) return true;

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
  }, [marketSourceProducts, marketSearchQuery, marketSortBy, isMarketSearchMode]);

  const marketHasMore = isMarketSearchMode ? marketSearchHasMore : baseHasMore;
  const marketLoading = isMarketSearchMode ? marketSearchLoading : baseProductsLoading;
  const marketError = isMarketSearchMode ? marketSearchError : baseProductsError;
  const loadMoreMarket = () => {
    if (isMarketSearchMode) {
      void loadMoreMarketSearch();
    } else {
      void baseLoadMore();
    }
  };

  // Закрытие подсказок при клике вне компонента
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchInputRef.current && !searchInputRef.current.contains(event.target as Node)) {
        setShowSearchSuggestions(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Загрузка подсказок для поиска
  useEffect(() => {
    const fetchSuggestions = async () => {
      if (debouncedSearchQuery.trim().length < 2) {
        setSearchSuggestions([]);
        setShowSearchSuggestions(false);
        return;
      }

      setSuggestionsLoading(true);
      try {
        const response = await shopAPI.searchProducts(debouncedSearchQuery.trim(), { offset: 0, limit: 5 });
        const raw = (response as any)?.data;
        const data: any[] = Array.isArray(raw) ? raw : Array.isArray(raw?.data) ? raw.data : [];
        
        const uniqueSuggestions: Array<{ product_name: string; product_id: string }> = [];
        const seenNames = new Set<string>();
        
        data.forEach((item: any) => {
          const productName = item.product_name || item.name || "";
          if (productName && !seenNames.has(productName.toLowerCase())) {
            seenNames.add(productName.toLowerCase());
            uniqueSuggestions.push({
              product_name: productName,
              product_id: item.product_id || item.id || "",
            });
          }
        });

        setSearchSuggestions(uniqueSuggestions);
        setShowSearchSuggestions(uniqueSuggestions.length > 0);
      } catch (error) {
        console.error("Error fetching search suggestions:", error);
        setSearchSuggestions([]);
        setShowSearchSuggestions(false);
      } finally {
        setSuggestionsLoading(false);
      }
    };

    fetchSuggestions();
  }, [debouncedSearchQuery]);

  // Серверный поиск Market (первая страница)
  useEffect(() => {
    let cancelled = false;
    const q = debouncedSearchQuery.trim();

    const run = async () => {
      if (q.length < 2) {
        setMarketSearchRaw([]);
        setMarketSearchOffset(0);
        setMarketSearchHasMore(true);
        setMarketSearchError(null);
        setMarketSearchLoading(false);
        return;
      }

      setMarketSearchLoading(true);
      setMarketSearchError(null);
      setMarketSearchOffset(0);
      setMarketSearchHasMore(true);

      try {
        const response = await shopAPI.searchProducts(q, { offset: 0, limit: MARKET_SEARCH_LIMIT });
        const raw = (response as any)?.data;
        const data: any[] = Array.isArray(raw) ? raw : Array.isArray(raw?.data) ? raw.data : [];
        if (cancelled) return;
        setMarketSearchRaw(data);
        setMarketSearchOffset(data.length);
        setMarketSearchHasMore(data.length > 0);
      } catch (e: any) {
        if (cancelled) return;
        setMarketSearchError(e?.response?.data?.message || e?.message || t("search.error"));
        setMarketSearchRaw([]);
        setMarketSearchHasMore(false);
      } finally {
        if (!cancelled) setMarketSearchLoading(false);
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [MARKET_SEARCH_LIMIT, debouncedSearchQuery, t]);

  const loadMoreMarketSearch = async () => {
    const q = debouncedSearchQuery.trim();
    if (marketSearchLoading || !marketSearchHasMore || q.length < 2) return;
    setMarketSearchLoading(true);
    setMarketSearchError(null);
    try {
      const response = await shopAPI.searchProducts(q, { offset: marketSearchOffset, limit: MARKET_SEARCH_LIMIT });
      const raw = (response as any)?.data;
      const data: any[] = Array.isArray(raw) ? raw : Array.isArray(raw?.data) ? raw.data : [];

      const existing = new Set(
        marketSearchRaw.map((it: any) => `${it?.product_id || it?.id || ""}_${it?.variant_id || it?.variantId || ""}`)
      );
      const merged = marketSearchRaw.slice();
      for (const item of data) {
        const key = `${item?.product_id || item?.id || ""}_${item?.variant_id || item?.variantId || ""}`;
        if (!existing.has(key)) {
          existing.add(key);
          merged.push(item);
        }
      }
      setMarketSearchRaw(merged);
      const grew = merged.length > marketSearchRaw.length;
      setMarketSearchOffset(marketSearchOffset + data.length);
      setMarketSearchHasMore(data.length > 0 && grew);
    } catch (e: any) {
      setMarketSearchError(e?.response?.data?.message || e?.message || t("search.error"));
    } finally {
      setMarketSearchLoading(false);
    }
  };

  // Market: используем кнопку "Показать ещё" вместо infinite scroll

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
        <div className="container mx-auto px-4 py-6">
          <div className="rounded-2xl bg-white shadow-[0_8px_30px_rgba(0,0,0,0.06)] ring-1 ring-gray-100 p-6 text-gray-800">
            <p className="text-center">{t("profile.guestPrompt")}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 pb-28">
      <div className="container mx-auto px-4 py-6 text-gray-800">
        <section className="relative overflow-hidden rounded-[32px] bg-gradient-to-r from-[#003d32] via-[#015a41] to-[#04734b] px-6 py-7 text-white shadow-[0_25px_70px_rgba(0,61,50,0.35)]">
          <div
            className="pointer-events-none absolute inset-0 opacity-30 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.5),_transparent_55%)]"
            aria-hidden="true"
          />
          <div className="relative flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div className="flex items-start gap-4">
              {/* <img
                className="h-20 w-20 rounded-[24px] border-2 border-white/70 object-cover shadow-2xl"
                src={profileAvatar}
                alt={fullName}
                loading="lazy"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).src = "/img/NaturalTitanium.jpg";
                }}
              /> */}
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
                    onClick={() =>
                      openConfirmModal({
                        title: t("profile.hero.logout"),
                        message: t("profile.confirm.logout"),
                        confirmLabel: t("profile.hero.logout"),
                        danger: true,
                        onConfirm: async () => {
                          await logout();
                          navigate("/", { replace: true });
                        },
                      })
                    }
                    className="inline-flex items-center justify-center rounded-2xl border border-white/40 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10"
                  >
                    {t("profile.hero.logout")}
                  </button>
                </div>
              </div>
            </div>
            <div className="grid w-full max-w-xl gap-3 sm:grid-cols-3">
              {heroHighlights.map((card) =>
                card.onClick ? (
                  <button
                    key={card.id}
                    type="button"
                    onClick={card.onClick}
                    className="rounded-2xl border border-white/25 bg-white/10 p-4 text-left backdrop-blur-md shadow-[0_15px_40px_rgba(0,0,0,0.12)] transition hover:bg-white/15"
                  >
                    <p className="text-xs uppercase tracking-wide text-white/70">{card.label}</p>
                    <p className="mt-1 text-2xl font-black">{card.value}</p>
                    <p className="text-xs text-white/75">{card.helper}</p>
                  </button>
                ) : (
                  <div
                    key={card.id}
                    className="rounded-2xl border border-white/25 bg-white/10 p-4 backdrop-blur-md shadow-[0_15px_40px_rgba(0,0,0,0.12)]"
                  >
                    <p className="text-xs uppercase tracking-wide text-white/70">{card.label}</p>
                    <p className="mt-1 text-2xl font-black">{card.value}</p>
                    <p className="text-xs text-white/75">{card.helper}</p>
                  </div>
                )
              )}
            </div>
          </div>
        </section>

        <div className="mt-8 rounded-3xl border border-emerald-100 bg-white/95 p-2 shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
          <div className="flex flex-wrap gap-2">
            {tabItems.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveTab(tab.id);
                    const next = new URLSearchParams(searchParams);
                    next.set("tab", tab.id);
                    setSearchParams(next, { replace: true });
                  }}
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
          <section className="mt-6 rounded-[30px] border border-white/80 bg-white p-4 sm:p-5 shadow-[0_25px_80px_rgba(15,23,42,0.05)]">
            <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.35em] text-[#015338]">{t("profile.market.badge")}</p>
                <h3 className="text-2xl font-black text-slate-900">{t("profile.market.title")}</h3>
                <p className="text-sm text-slate-500">{t("profile.market.subtitle")}</p>
              </div>
              
            </div>
            
            {/* Поиск и сортировка */}
            <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex-1 max-w-md">
                <div ref={searchInputRef} className="relative">
                  <input
                    type="text"
                    value={marketSearchQuery}
                    onChange={(e) => setMarketSearchQuery(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Escape") {
                        setMarketSearchQuery("");
                        setShowSearchSuggestions(false);
                      }
                    }}
                    onFocus={() => {
                      if (searchSuggestions.length > 0 && debouncedSearchQuery.trim().length >= 2) {
                        setShowSearchSuggestions(true);
                      }
                    }}
                    placeholder={t("profile.market.search.placeholder")}
                    className="w-full rounded-2xl border border-slate-200 bg-white px-10 py-3 pl-11 text-sm font-semibold text-slate-900 placeholder:text-slate-400 focus:border-[#04734b] focus:outline-none focus:ring-2 focus:ring-[#04734b]/20"
                    autoComplete="off"
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

                  {marketSearchQuery.trim().length > 0 && (
                    <button
                      type="button"
                      className="absolute right-3 top-1/2 -translate-y-1/2 inline-flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-700"
                      onClick={() => {
                        setMarketSearchQuery("");
                        setShowSearchSuggestions(false);
                      }}
                      aria-label={t("common.actions.clearAll") || "Очистить"}
                    >
                      ×
                    </button>
                  )}
                  
                  {/* Выпадающий список подсказок */}
                  {showSearchSuggestions && searchSuggestions.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-lg border border-slate-200 max-h-80 overflow-y-auto z-50">
                      {suggestionsLoading && (
                        <div className="p-4 text-center text-slate-500 text-sm">
                          {t("common.loading") || "Загрузка..."}
                        </div>
                      )}
                      {!suggestionsLoading && searchSuggestions.map((suggestion, index) => (
                        <button
                          key={`${suggestion.product_id}-${index}`}
                          type="button"
                          onClick={() => {
                            setMarketSearchQuery(suggestion.product_name);
                            setShowSearchSuggestions(false);
                          }}
                          className="w-full px-4 py-3 text-left hover:bg-slate-50 transition-colors border-b border-slate-100 last:border-b-0 focus:bg-slate-50 focus:outline-none"
                        >
                          <div className="flex items-center gap-3">
                            <svg 
                              className="w-5 h-5 text-slate-400 flex-shrink-0" 
                              fill="none" 
                              stroke="currentColor" 
                              viewBox="0 0 24 24"
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                            <span className="text-slate-900 text-sm truncate">{suggestion.product_name}</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <div className="flex w-full items-center gap-3 sm:w-auto sm:justify-end">
                <label className="text-sm font-semibold text-slate-700 whitespace-nowrap">
                  {t("profile.market.sort.label")}:
                </label>
                <select
                  value={marketSortBy}
                  onChange={(e) => setMarketSortBy(e.target.value)}
                  className="w-full sm:w-auto min-w-0 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 focus:border-[#04734b] focus:outline-none focus:ring-2 focus:ring-[#04734b]/20 cursor-pointer"
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
            
            {marketLoading && filteredAndSortedProducts.length === 0 && (
              <div className="rounded-2xl border border-dashed border-slate-200 p-6">
                <SkeletonGrid count={8} columns={4} />
              </div>
            )}
            {marketError && (
              <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
                {t("profile.market.error", { message: String(marketError) })}
              </div>
            )}
            {!marketError && (
              filteredAndSortedProducts.length === 0 ? (
                !marketLoading ? (
                  <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center">
                    <p className="text-sm font-semibold text-slate-500">{t("profile.market.search.empty")}</p>
                  </div>
                ) : null
              ) : (
                <>
                  {marketLoading && (
                    <div className="mb-3 flex items-center justify-between rounded-2xl border border-slate-100 bg-white/70 px-4 py-3 text-sm text-slate-600 shadow-sm backdrop-blur">
                      <span className="font-semibold">{t("common.loading") || "Загрузка..."}</span>
                      <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-[#04734b]" />
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 xl:grid-cols-4">
                    {filteredAndSortedProducts.map((p: any, index: number) => {
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
                        const payload = response.data as any;
                        const productData = payload?.data ?? payload;
                        const firstVariant = productData.variants?.[0];
                        const productForState = {
                          product_id: productId,
                          product_name: resolveProductName(productData) || p.product_name,
                          product_description: resolveProductDescription(productData) || p.product_description,
                          name_uz: productData.name_uz || productData.name || productData.product_name,
                          name_ru: productData.name_ru || productData.product_name_ru,
                          description_uz: productData.description_uz || productData.product_description_uz || productData.description || productData.product_description,
                          description_ru: productData.description_ru || productData.product_description_ru || productData.description || productData.product_description,
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
                        className="group relative flex h-full min-h-[300px] sm:min-h-[360px] flex-col rounded-[24px] border border-slate-100 bg-gradient-to-b from-white to-slate-50/30 p-3 sm:p-4 shadow-[0_18px_35px_rgba(15,23,42,0.07)] transition hover:-translate-y-1 hover:shadow-[0_25px_50px_rgba(15,23,42,0.12)]"
                      >
                        <button
                          type="button"
                          onClick={handleOpenProduct}
                          className="relative h-[190px] sm:h-[220px] overflow-hidden rounded-2xl bg-white"
                          disabled={isLoadingCard || !canOpenProduct}
                        >
                          <img
                            src={getVariantMainImage(p.variant_media) || getProductImageUrl(p.main_image)}
                            alt={p.product_name}
                            className="h-full w-full object-contain p-0 transition duration-300 group-hover:scale-[1.02]"
                            loading="lazy"
                            onError={(e) => {
                              (e.currentTarget as HTMLImageElement).src = "/img/NaturalTitanium.jpg";
                            }}
                          />
                          <span className="absolute left-2 top-2 max-w-[80%] inline-flex items-center rounded-full bg-white/85 px-2 py-0.5 text-[10px] sm:text-xs font-semibold text-slate-800 truncate">
                            {categoryLabel || "—"}
                          </span>
                          {isLoadingCard && (
                            <span className="absolute inset-0 grid place-items-center bg-white/70 text-xs font-semibold text-slate-600">
                              {t("profile.market.card.loading")}
                            </span>
                          )}
                        </button>
                        <div className="mt-3 sm:mt-4 flex flex-1 flex-col gap-3 sm:gap-4">
                          <div>
                            <h4 className="min-h-[36px] text-sm sm:text-base font-bold leading-snug text-slate-900 line-clamp-2">
                              {p.product_name}
                            </h4>
                            <p className="mt-1 hidden sm:block text-xs uppercase tracking-wide text-slate-500 truncate">
                              {t("profile.market.card.skuLabel")}: {p.variant_sku || "—"}
                            </p>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 items-start sm:items-center gap-2 sm:gap-3 rounded-2xl bg-slate-100/60 px-3 py-2 min-h-[64px]">
                            <div className="min-w-0 flex flex-col">
                              <span className="text-[11px] sm:text-xs text-slate-500">{t("profile.market.card.priceLabel")}</span>
                              <span className="text-base sm:text-lg font-extrabold text-slate-900 leading-tight tabular-nums">
                                {priceValue}
                              </span>
                            </div>
                            <div className="min-w-0 flex flex-col sm:border-l sm:border-slate-200 sm:pl-3">
                              <span className="text-[11px] sm:text-xs text-slate-500">{t("profile.market.card.incomeLabel")}</span>
                              <span className="inline-flex items-center gap-2 text-xs sm:text-sm font-semibold text-[#04734b] tabular-nums">
                                {referralValue}
                                <span className="rounded-full bg-[#e6f8ef] px-2 py-0.5 text-[11px] font-bold text-[#04734b] shrink-0">
                                  +
                                </span>
                              </span>
                            </div>
                          </div>
                          <div className="mt-auto space-y-3">
                            <button
                              type="button"
                              className="group relative h-10 sm:h-11 w-full rounded-[18px] text-xs sm:text-sm font-semibold tracking-wide text-white shadow-[0_18px_40px_rgba(6,78,59,0.40)] ring-1 ring-white/20 transition hover:scale-[1.01] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
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
                            {/* <button
                              type="button"
                              className="h-12 w-full rounded-[18px] border border-slate-200 bg-white text-sm font-semibold text-slate-800 shadow-[0_12px_30px_rgba(15,23,42,0.1)] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
                              onClick={handleOpenProduct}
                              disabled={isLoadingCard || !canOpenProduct}
                            >
                              {t("profile.market.card.view")}
                            </button> */}
                          </div>
                        </div>
                      </article>
                    );
                  })}
                  </div>
                  {/* Кнопка вместо infinite scroll */}
                  {marketHasMore && (
                    <div className="mt-6 flex justify-center">
                      <button
                        type="button"
                        onClick={loadMoreMarket}
                        disabled={marketLoading}
                        className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {marketLoading ? (
                          <>
                            <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-[#04734b]" />
                            {t("common.loading") || "Загрузка..."}
                          </>
                        ) : (
                          t("common.actions.loadMore") || "Показать ещё"
                        )}
                      </button>
                    </div>
                  )}
                </>
              )
            )}
          </section>
        )}

        {activeTab === "oqim" && (
          <section className="mt-6 rounded-[30px] border border-slate-100 bg-white p-4 sm:p-6 shadow-[0_25px_80px_rgba(15,23,42,0.06)]">
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="text-xs uppercase tracking-[0.35em] text-[#015338]">{t("profile.tabs.flows")}</p>
              </div>
              <div className="w-full sm:max-w-md">
                <div className="relative">
                  <input
                    type="text"
                    value={oqimSearchQuery}
                    onChange={(e) => setOqimSearchQuery(e.target.value)}
                    placeholder={t("profile.flows.search.placeholder")}
                    className="w-full rounded-2xl border border-slate-200 bg-white px-10 py-3 pl-11 text-sm font-semibold text-slate-900 placeholder:text-slate-400 focus:border-[#04734b] focus:outline-none focus:ring-2 focus:ring-[#04734b]/20"
                    autoComplete="off"
                  />
                  <svg
                    className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                    />
                  </svg>
                  {oqimSearchQuery.trim().length > 0 && (
                    <button
                      type="button"
                      className="absolute right-3 top-1/2 -translate-y-1/2 inline-flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-700"
                      onClick={() => setOqimSearchQuery("")}
                      aria-label={t("common.actions.clearAll") || "Очистить"}
                    >
                      ×
                    </button>
                  )}
                </div>
              </div>
            </div>
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
            {apiFlowsError && (
              <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
                {apiFlowsError}
              </div>
            )}
            {referralNotice && String(referralNotice.message || "").trim() && (
              <div
                className={`mb-3 rounded-2xl border px-4 py-3 text-sm font-semibold ${
                  referralNotice.type === "success"
                    ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                    : "border-rose-200 bg-rose-50 text-rose-800"
                }`}
                role="status"
                aria-live="polite"
              >
                {referralNotice.message}
              </div>
            )}
            {!apiFlowsLoading && !apiFlowsError && (
              <div className="grid gap-3 sm:gap-4 md:grid-cols-2 xl:grid-cols-3">
                {filteredReferralStats.length === 0 && filteredLocalFlows.length === 0 && (
                  <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-sm font-semibold text-slate-500">
                    {oqimSearchQuery.trim().length > 0 ? t("profile.flows.search.empty") : t("profile.flows.empty")}
                  </div>
                )}
                {filteredReferralStats.map((r) => {
                  const linkedFlow = apiFlowById.get(String(r?.id || ""));
                  const origin = typeof window !== "undefined" ? window.location.origin : "";
                  const referralCode = String(linkedFlow?.code || "").trim();
                  const shareLink = linkedFlow?.link
                    ? String(linkedFlow.link)
                    : (linkedFlow && linkedFlow.product_id && referralCode)
                    ? `${origin}/r/${encodeURIComponent(String(linkedFlow.product_id))}/${encodeURIComponent(referralCode)}`
                    : "";
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
                      className="group p-4 sm:p-5 border border-slate-100 rounded-3xl bg-white shadow-[0_10px_30px_rgba(15,23,42,0.06)] transition hover:-translate-y-0.5 hover:shadow-[0_18px_50px_rgba(15,23,42,0.10)]"
                      style={{ minHeight: 170 }}
                    >
                      <div className="flex flex-col gap-3 max-w-full">
                        {/* Верхняя часть: заголовок и код */}
                        <div className="flex flex-col gap-2">
                          <div className="flex items-start justify-between gap-3 min-w-0">
                            <div className="min-w-0">
                              <div
                                className="text-sm sm:text-base font-extrabold text-slate-900 line-clamp-2"
                                title={linkTitle}
                              >
                                {linkTitle}
                              </div>
                              {productName && (
                                <div className="mt-0.5 text-xs text-slate-500 line-clamp-1" title={productName}>
                                  {productName}
                                </div>
                              )}
                            </div>
                            <div className="flex flex-wrap items-center justify-end gap-2 shrink-0">
                              <span className="inline-flex h-6 items-center px-2 rounded-full text-[10px] sm:text-xs font-bold border border-emerald-200 text-emerald-800 bg-emerald-50 whitespace-nowrap">
                                {r.code}
                              </span>
                              <span className="inline-flex h-6 items-center px-2 rounded-full text-[10px] sm:text-xs font-bold border border-emerald-200 text-emerald-800 bg-emerald-50 whitespace-nowrap">
                                {formatPrice(r.product_referal_price || 0)}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Средняя часть: ссылка и кнопки */}
                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 max-w-full">
                          <div 
                            className="flex-1 min-w-0 relative rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5 cursor-pointer hover:bg-slate-100 transition-colors overflow-hidden"
                            title={shareLink}
                            onClick={() => shareLink && handleCopyFlowLink(shareLink, r.id)}
                          >
                            <div className="flex items-center gap-2 max-w-full">
                              <svg 
                                className="w-4 h-4 text-slate-400 flex-shrink-0" 
                                fill="none" 
                                stroke="currentColor" 
                                viewBox="0 0 24 24"
                              >
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                              </svg>
                              <span className="text-xs sm:text-sm text-slate-700 font-mono truncate flex-1 min-w-0">
                                {shareLink ? (
                                  <span className="block truncate" title={shareLink}>
                                    <span className="sm:hidden">{shortenUrl(shareLink, 28)}</span>
                                    <span className="hidden sm:inline md:hidden">{shortenUrl(shareLink, 42)}</span>
                                    <span className="hidden md:inline">{shortenUrl(shareLink, 64)}</span>
                                  </span>
                                ) : (
                                  <span className="text-slate-400 italic">{t("profile.flows.noLink") || "Ссылка не доступна"}</span>
                                )}
                              </span>
                            </div>
                          </div>
                          <div className="inline-flex items-center gap-2 flex-shrink-0">
                            <button
                              className={`h-8 w-8 sm:h-9 sm:w-9 inline-flex items-center justify-center rounded-lg border transition-colors ${
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
                              className={`h-8 w-8 sm:h-9 sm:w-9 inline-flex items-center justify-center rounded-lg border ${
                                deletingReferralId === r.id ? "opacity-50 cursor-not-allowed" : ""
                              } border-red-200 hover:bg-red-50 transition-colors`}
                              title={t("profile.flows.delete")}
                              aria-label={t("profile.flows.delete")}
                              onClick={() => {
                                openConfirmModal({
                                  title: t("profile.flows.delete"),
                                  message: t("profile.confirm.deleteLink"),
                                  confirmLabel: t("common.actions.delete"),
                                  danger: true,
                                  onConfirm: async () => {
                                    profileData.removeReferralById(r.id);
                                    try {
                                      await handleDeleteReferral(r.id);
                                    } catch {
                                      profileData.loadReferrals();
                                    }
                                  },
                                });
                              }}
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

                        {/* Нижняя часть: дата */}
                        <div className="flex items-center justify-between gap-2 text-xs text-slate-500 pt-2 border-t border-slate-100">
                          <span className="min-w-0 truncate">{createdAt ? new Date(createdAt).toLocaleString('ru-RU', { 
                            day: '2-digit', 
                            month: '2-digit', 
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          }) : "—"}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
                {filteredLocalFlows.map((f) => {
                  const isCopied = copiedLinkId === f.id;
                  
                  return (
                    <div
                      key={f.id}
                      className="group p-4 sm:p-5 border border-slate-100 rounded-3xl bg-white shadow-[0_10px_30px_rgba(15,23,42,0.06)] transition hover:-translate-y-0.5 hover:shadow-[0_18px_50px_rgba(15,23,42,0.10)]"
                      style={{ minHeight: 170 }}
                    >
                      <div className="flex flex-col gap-3 max-w-full">
                        {/* Верхняя часть: название товара и комиссия */}
                        <div className="flex flex-col sm:flex-row sm:items-start gap-2 sm:gap-3 max-w-full">
                          <div className="flex-1 min-w-0 max-w-full">
                            <div className="text-sm sm:text-base font-extrabold text-slate-900 line-clamp-2" title={f.productName}>
                              {f.productName}
                            </div>
                          </div>
                          <span className="inline-flex h-6 items-center px-2 rounded-full text-[10px] sm:text-xs font-bold border border-emerald-300 text-emerald-700 bg-emerald-50 whitespace-nowrap flex-shrink-0">
                            + {formatPrice(f.commission || 0)}
                          </span>
                        </div>

                        {/* Средняя часть: ссылка и кнопки */}
                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 max-w-full">
                          <div 
                            className="flex-1 min-w-0 relative rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5 cursor-pointer hover:bg-slate-100 transition-colors overflow-hidden"
                            title={f.link}
                            onClick={() => handleCopyFlowLink(f.link, f.id)}
                          >
                            <div className="flex items-center gap-2 max-w-full">
                              <svg 
                                className="w-4 h-4 text-slate-400 flex-shrink-0" 
                                fill="none" 
                                stroke="currentColor" 
                                viewBox="0 0 24 24"
                              >
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                              </svg>
                              <span className="text-xs sm:text-sm text-slate-700 font-mono truncate flex-1 min-w-0" title={f.link}>
                                <span className="sm:hidden">{shortenUrl(f.link, 28)}</span>
                                <span className="hidden sm:inline md:hidden">{shortenUrl(f.link, 42)}</span>
                                <span className="hidden md:inline">{shortenUrl(f.link, 64)}</span>
                              </span>
                            </div>
                          </div>
                          <div className="inline-flex items-center gap-2 flex-shrink-0">
                            <button
                              className={`h-8 w-8 sm:h-9 sm:w-9 inline-flex items-center justify-center rounded-lg border transition-colors ${
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
                              className="h-8 w-8 sm:h-9 sm:w-9 inline-flex items-center justify-center rounded-lg border border-red-200 hover:bg-red-50 transition-colors"
                              title={t("profile.flows.delete")}
                              aria-label={t("profile.flows.delete")}
                              onClick={() => {
                                openConfirmModal({
                                  title: t("profile.flows.delete"),
                                  message: t("profile.confirm.deleteLink"),
                                  confirmLabel: t("common.actions.delete"),
                                  danger: true,
                                  onConfirm: () => removeFlow(f.id),
                                });
                              }}
                            >
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M3 6h18" stroke="#dc2626" strokeWidth="2" strokeLinecap="round"/>
                                <path d="M8 6v-2a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" stroke="#dc2626" strokeWidth="2"/>
                                <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" stroke="#dc2626" strokeWidth="2"/>
                              </svg>
                            </button>
                          </div>
                        </div>

                        {/* Нижняя часть: дата */}
                        <div className="flex items-center justify-between text-xs text-slate-500 pt-1 border-t border-slate-100">
                          <span>{new Date(f.createdAt).toLocaleString('ru-RU', { 
                            day: '2-digit', 
                            month: '2-digit', 
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
                {flows.length > 0 && (
                  <div className="sm:col-span-2 lg:col-span-3">
                    <button
                      className="rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                      onClick={() => {
                        openConfirmModal({
                          title: t("profile.flows.clear"),
                          message: t("profile.confirm.clearLinks"),
                          confirmLabel: t("common.actions.clearAll"),
                          danger: true,
                          onConfirm: () => clearFlows(),
                        });
                      }}
                    >
                      {t("profile.flows.clear")}
                    </button>
                  </div>
                )}
              </div>
            )}
          </section>
        )}

        {confirmModal.open && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 px-4 backdrop-blur-sm"
            onClick={closeConfirmModal}
            role="dialog"
            aria-modal="true"
            aria-label={confirmModal.title}
          >
            <div
              className="relative w-full max-w-md rounded-[32px] bg-white p-6 shadow-[0_35px_80px_rgba(15,23,42,0.25)]"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                className="absolute right-4 top-4 inline-flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 disabled:opacity-60"
                onClick={closeConfirmModal}
                disabled={confirmLoading}
                aria-label={t("common.actions.close")}
              >
                ×
              </button>
              <div className="mb-2 text-lg font-black text-slate-900">{confirmModal.title}</div>
              <div className="text-sm text-slate-500">{confirmModal.message}</div>
              <div className="mt-5 flex flex-col gap-2 sm:flex-row">
                <button
                  type="button"
                  className="flex-1 rounded-2xl border border-slate-200 py-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                  onClick={closeConfirmModal}
                  disabled={confirmLoading}
                >
                  {t("common.actions.cancel")}
                </button>
                <button
                  type="button"
                  className={`flex-1 rounded-2xl py-3 text-sm font-semibold text-white shadow-[0_18px_38px_rgba(15,23,42,0.16)] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60 ${
                    confirmModal.danger ? "bg-rose-600" : ""
                  }`}
                  style={!confirmModal.danger ? { background: "linear-gradient(92.41deg, #003d32, #04734b)" } : undefined}
                  onClick={() => void runConfirm()}
                  disabled={confirmLoading}
                >
                  {confirmLoading ? (t("common.loading") || "Загрузка...") : confirmModal.confirmLabel}
                </button>
              </div>
            </div>
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
              <button
                type="button"
                className="rounded-2xl border border-slate-200 bg-white p-4 text-left transition hover:border-emerald-200 hover:shadow-sm"
                onClick={() => setShowBalanceDetails((prev) => !prev)}
              >
                <div className="text-xs tracking-wide uppercase text-slate-600 font-bold">{t("profile.stats.cards.balance.label")}</div>
                <div className="text-3xl font-black text-slate-900 mt-1">
                  {availableBalanceLabel}
                </div>
                <div className="text-xs text-slate-500">{t("profile.stats.cards.balance.helper")}</div>
                {balanceLoading && (
                  <div className="mt-2 text-xs text-slate-400">{t("common.loading") || "Загрузка..."}</div>
                )}
                {balanceError && (
                  <div className="mt-2 text-xs text-rose-500">{balanceError}</div>
                )}
              </button>
            </div>

            {showBalanceDetails && balanceSummary && (
              <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                  <div className="text-xs tracking-wide uppercase text-slate-500">{t("profile.balance.total", "Umumiy doromad")}</div>
                  <div className="mt-1 text-lg font-bold text-slate-900">{formatPrice(totalBalance, "UZS")}</div>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                  <div className="text-xs tracking-wide uppercase text-slate-500">{t("profile.balance.available", "Доступно")}</div>
                  <div className="mt-1 text-lg font-bold text-emerald-700">
                    {availableBalance === null ? "—" : formatPrice(availableBalance, "UZS")}
                  </div>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                  <div className="text-xs tracking-wide uppercase text-slate-500">{t("profile.balance.holds", "На удержании")}</div>
                  <div className="mt-1 text-lg font-bold text-amber-700">
                    {formatPrice(balanceSummary.active_holds ?? 0, "UZS")}
                  </div>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                  <div className="text-xs tracking-wide uppercase text-slate-500">{t("profile.balance.credits", "Начисления")}</div>
                  <div className="mt-1 text-lg font-bold text-slate-900">
                    {formatPrice(balanceSummary.total_credits ?? 0, "UZS")}
                  </div>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                  <div className="text-xs tracking-wide uppercase text-slate-500">{t("profile.balance.debits", "Списания")}</div>
                  <div className="mt-1 text-lg font-bold text-slate-900">
                    {formatPrice(balanceSummary.total_debits ?? 0, "UZS")}
                  </div>
                </div>
              </div>
            )}

            {balanceSummary && (
              <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                  <div className="text-xs tracking-wide uppercase text-slate-500">{t("profile.balance.referralPending", "Рефералка в ожидании")}</div>
                  <div className="mt-1 text-lg font-bold text-slate-900">
                    {formatPrice(balanceSummary.referral_pending ?? 0, "UZS")}
                  </div>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                  <div className="text-xs tracking-wide uppercase text-slate-500">{t("profile.balance.referralActive", "Рефералка активна")}</div>
                  <div className="mt-1 text-lg font-bold text-slate-900">
                    {formatPrice(balanceSummary.referral_active ?? 0, "UZS")}
                  </div>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                  <div className="text-xs tracking-wide uppercase text-slate-500">{t("profile.balance.referralCancelled", "Рефералка отменена")}</div>
                  <div className="mt-1 text-lg font-bold text-slate-900">
                    {formatPrice(balanceSummary.referral_cancelled ?? 0, "UZS")}
                  </div>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                  <div className="text-xs tracking-wide uppercase text-slate-500">{t("profile.balance.referralPaid", "Рефералка оплачена")}</div>
                  <div className="mt-1 text-lg font-bold text-slate-900">
                    {formatPrice(balanceSummary.referral_paid ?? 0, "UZS")}
                  </div>
                </div>
              </div>
            )}

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
                        max={availableBalance ?? undefined}
                        step="0.01"
                        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 focus:border-[#04734b] focus:outline-none focus:ring-2 focus:ring-[#04734b]/20"
                        required
                      />
                      {availableBalance !== null && (
                        <div className="mt-2 text-xs text-slate-500">
                          {t("profile.payments.form.availableBalance")}: {formatPrice(availableBalance, "UZS")}
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
                  disabled={withdrawalLoading || availableBalance === null || availableBalance === 0}
                  className="w-full rounded-2xl py-3 text-sm font-semibold uppercase tracking-wide text-white shadow-[0_22px_48px_rgba(6,78,59,0.45)] ring-1 ring-white/20 transition hover:scale-[1.01] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
                  style={{ background: "linear-gradient(92.41deg, #003d32, #04734b)" }}
                >
                  {withdrawalLoading ? t("profile.payments.form.submitting") : t("profile.payments.form.submit")}
                </button>
              </form>
            </div>


            {/* История платежных поручений */}
            <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_8px_30px_rgba(0,0,0,0.04)]">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h4 className="text-base font-extrabold text-slate-900">История поручений</h4>
                  <p className="text-xs text-slate-500">Последние заявки на платежи</p>
                </div>
                <div className="flex items-center gap-2">
                  <select
                    value={statementsStatus}
                    onChange={(e) => loadStatements({ status: e.target.value, offset: 0 })}
                    className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 focus:border-[#04734b] focus:outline-none focus:ring-2 focus:ring-[#04734b]/20"
                  >
                    <option value="">Все</option>
                    <option value="pending">Ожидает</option>
                    <option value="approved">Одобрено</option>
                    <option value="rejected">Отклонено</option>
                  </select>
                  <button
                    type="button"
                    onClick={() => loadStatements({ offset: 0 })}
                    className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:border-slate-300"
                  >
                    Обновить
                  </button>
                </div>
              </div>

              {statementsLoading && (
                <div className="py-6 text-center">
                  <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-[#04734b]"></div>
                  <p className="mt-2 text-sm text-slate-500">Загружаем поручения...</p>
                </div>
              )}

              {statementsError && (
                <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
                  {statementsError}
                </div>
              )}

              {!statementsLoading && !statementsError && (
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-500">
                        <th className="text-left py-3 px-2">{t("profile.payments.statements.table.image", "Фото")}</th>
                        <th className="text-left py-3 px-2">Дата</th>
                        <th className="text-left py-3 px-2">Сумма</th>
                        <th className="text-left py-3 px-2">Карта</th>
                        <th className="text-left py-3 px-2">Держатель</th>
                        <th className="text-left py-3 px-2">Статус</th>
                        <th className="text-left py-3 px-2">Описание</th>
                      </tr>
                    </thead>
                    <tbody>
                      {statements.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="py-8 text-center text-slate-500">
                            Нет поручений
                          </td>
                        </tr>
                      ) : (
                        statements.map((s) => {
                          const statusValue = s.status || s.type || "";
                          const normalizedDescription =
                            (s.description || "").trim().toLowerCase() === "string"
                              ? "----"
                              : (s.description || "----");
                          const cardLast4 = s.card_number ? String(s.card_number).slice(-4) : "----";
                          const statementImageBase = "https://api.ozar.uz/media";
                          const imageUrl = s.image
                            ? (s.image.startsWith("http")
                              ? s.image
                              : `${statementImageBase.replace(/\/+$/, "")}/${s.image.replace(/^\/+/, "")}`)
                            : null;

                          return (
                            <tr key={s.id} className="border-b border-slate-100 hover:bg-slate-50">
                              <td className="py-3 px-2 align-middle">
                                {imageUrl ? (
                                  <a
                                    href={imageUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-block rounded-lg border border-slate-200 overflow-hidden bg-slate-50 hover:opacity-90 transition"
                                    title={t("profile.payments.statements.viewImage", "Открыть изображение")}
                                  >
                                    <img
                                      src={imageUrl}
                                      alt=""
                                      className="h-12 w-12 object-cover"
                                      onError={(e) => {
                                        (e.target as HTMLImageElement).style.display = "none";
                                      }}
                                    />
                                  </a>
                                ) : (
                                  <span className="text-slate-400 text-xs">—</span>
                                )}
                              </td>
                              <td className="py-3 px-2 text-slate-600">{new Date(s.created_at).toLocaleString()}</td>
                              <td className="py-3 px-2 font-semibold text-slate-900">{formatPrice(s.amount, "UZS")}</td>
                              <td className="py-3 px-2 text-slate-600">**** {cardLast4}</td>
                              <td className="py-3 px-2 text-slate-600">{s.card_holder_name}</td>
                              <td className="py-3 px-2">
                                <span
                                  className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-bold ${
                                    statusValue === "approved"
                                      ? "bg-emerald-100 text-emerald-700"
                                      : statusValue === "pending"
                                      ? "bg-amber-100 text-amber-700"
                                      : statusValue === "rejected"
                                      ? "bg-rose-100 text-rose-700"
                                      : "bg-slate-100 text-slate-700"
                                  }`}
                                >
                                  {t(`profile.payments.statements.status.${statusValue}`, { defaultValue: statusValue || "----" })}
                                </span>
                              </td>
                              <td className="py-3 px-2 text-slate-600">
                                {normalizedDescription}
                              </td>
                            </tr>
                          );
                        })
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
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 px-4 backdrop-blur-sm"
            onClick={() => setDialog({ open: false })}
          >
            <div
              className="w-full max-w-[520px] rounded-[32px] border border-white/20 bg-white p-6 shadow-[0_35px_80px_rgba(15,23,42,0.25)]"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="text-lg font-black text-slate-900 mb-2">{dialog.title}</div>
              <div className="text-sm text-slate-500 mb-3">{t("profile.dialog.subtitle")}</div>
              <input
                readOnly
                value={dialog.link || ""}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700 focus:outline-none"
                onFocus={(e) => e.currentTarget.select()}
              />
              <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                <button
                  className="flex-1 rounded-2xl py-3 text-sm font-semibold text-white shadow-[0_18px_38px_rgba(6,78,59,0.25)] transition hover:brightness-110"
                  style={{ background: "linear-gradient(92.41deg, #003d32, #04734b)" }}
                  onClick={() => dialog.link && handleCopy(dialog.link)}
                >
                  {t("profile.dialog.copy")}
                </button>
                <button
                  className="flex-1 rounded-2xl border border-slate-200 py-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
                  onClick={() => setDialog({ open: false })}
                >
                  {t("profile.dialog.close")}
                </button>
              </div>
            </div>

            {/* Платежные поручения (statements) */}
            <div className="mt-8 rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-6 shadow-[0_8px_30px_rgba(15,23,42,0.08)]">
              <h4 className="mb-4 text-lg font-bold text-slate-900">Платежное поручение</h4>

              {statementSuccess && (
                <div className="mb-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">
                  Заявка отправлена
                </div>
              )}

              {statementError && (
                <div className="mb-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-600">
                  {statementError}
                </div>
              )}

              <form onSubmit={handleCreateStatement} className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-slate-700">Сумма, UZS</label>
                    <input
                      type="number"
                      value={statementAmount}
                      onChange={(e) => setStatementAmount(e.target.value)}
                      min="1"
                      className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 focus:border-[#04734b] focus:outline-none focus:ring-2 focus:ring-[#04734b]/20"
                      required
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-slate-700">Номер карты</label>
                    <input
                      type="text"
                      value={statementCardNumber}
                      onChange={(e) => setStatementCardNumber(e.target.value)}
                      maxLength={19}
                      className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 focus:border-[#04734b] focus:outline-none focus:ring-2 focus:ring-[#04734b]/20"
                      placeholder="8600 1234 1234 1234"
                      required
                    />
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-slate-700">Держатель карты</label>
                    <input
                      type="text"
                      value={statementCardHolder}
                      onChange={(e) => setStatementCardHolder(e.target.value)}
                      className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 focus:border-[#04734b] focus:outline-none focus:ring-2 focus:ring-[#04734b]/20"
                      placeholder="Имя на карте"
                      required
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-slate-700">Описание (необязательно)</label>
                    <input
                      type="text"
                      value={statementDescription}
                      onChange={(e) => setStatementDescription(e.target.value)}
                      className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 focus:border-[#04734b] focus:outline-none focus:ring-2 focus:ring-[#04734b]/20"
                      placeholder="Комментарий"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={statementLoading}
                  className="w-full rounded-2xl py-3 text-sm font-semibold uppercase tracking-wide text-white shadow-[0_22px_48px_rgba(6,78,59,0.45)] ring-1 ring-white/20 transition hover:scale-[1.01] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
                  style={{ background: "linear-gradient(92.41deg, #003d32, #04734b)" }}
                >
                  {statementLoading ? "Отправляем..." : "Отправить поручение"}
                </button>
              </form>
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
              className="relative w-full max-w-md rounded-[32px] bg-white p-6 shadow-[0_35px_80px_rgba(15,23,42,0.25)]"
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
                    disabled={createLoading}
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

