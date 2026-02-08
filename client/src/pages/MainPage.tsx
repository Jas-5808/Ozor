import React, { useEffect, useState } from "react";
import { useLocation, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import useSEO from "../hooks/useSEO";
import ProductsList from "../components/ProductsList";
import SimpleSlider from "../components/SimpleSlider";
import SliderBannerBetween from "../components/SliderBannerBetween";
import ProductCard from "../components/ui/ProductCard";
import { shopAPI } from "../services/api";
import { transformProductFromApi } from "../utils/productUtils";

export function MainPage() {
  const { t, i18n } = useTranslation();
  const location = useLocation();
  const pageTitle = t("home.seoTitle");
  const pageDescription = t("home.seoDescription");
  const origin = typeof window !== "undefined" ? window.location.origin : "";

  useSEO({
    title: pageTitle,
    description: pageDescription,
    canonical: origin ? `${origin}/` : undefined,
    openGraph: {
      "og:title": pageTitle,
      "og:description": pageDescription,
      "og:type": "website",
      "og:url": origin ? `${origin}/` : "",
    },
    twitter: {
      "twitter:card": "summary_large_image",
      "twitter:title": pageTitle,
      "twitter:description": pageDescription,
    },
    jsonLd: [
      {
        "@context": "https://schema.org",
        "@type": "WebSite",
        name: "OZAR",
        url: origin ? `${origin}/` : undefined,
        potentialAction: {
          "@type": "SearchAction",
          target: origin ? `${origin}/search?q={search_term_string}` : undefined,
          "query-input": "required name=search_term_string",
        },
      },
      {
        "@context": "https://schema.org",
        "@type": "Organization",
        name: "OZAR",
        url: origin ? `${origin}/` : undefined,
        logo: origin ? `${origin}/img/logo.png` : undefined,
      },
    ],
  });

  // Восстанавливаем позицию скролла, если вернулись со страницы товара
  useEffect(() => {
    const state = location.state as any;
    if (state && typeof state.scrollY === "number") {
      window.scrollTo({ top: state.scrollY, behavior: "auto" });
    }
  }, [location.state]);

  const [discountProducts, setDiscountProducts] = useState<any[]>([]);
  const [discountsLoading, setDiscountsLoading] = useState(true);
  useEffect(() => {
    let cancelled = false;
    setDiscountsLoading(true);
    shopAPI
      .getDiscountProducts({ limit: 8 })
      .then((res) => {
        if (cancelled) return;
        const list = Array.isArray(res?.data) ? res.data : [];
        setDiscountProducts(list.map(transformProductFromApi));
      })
      .catch(() => {
        if (!cancelled) setDiscountProducts([]);
      })
      .finally(() => {
        if (!cancelled) setDiscountsLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  // Блоки по категориям из GET /shop/recommended-products — динамически: для каждой категории свой блок (до 8 товаров) + кнопка в категорию
  type CategoryGroup = { category: { id: string; name: string }; products: any[] };
  const [recommendedListByCategory, setRecommendedListByCategory] = useState<CategoryGroup[]>([]);
  const [recommendedListLoading, setRecommendedListLoading] = useState(true);
  const CATEGORY_BLOCK_SIZE = 8;
  useEffect(() => {
    let cancelled = false;
    setRecommendedListLoading(true);
    shopAPI
      .getRecommendedProductsList()
      .then((res) => {
        if (cancelled) return;
        const items = res?.data?.items as Array<{ category_id?: string; category?: { id: string; name: string }; product?: any }> | undefined;
        if (!Array.isArray(items) || items.length === 0) {
          setRecommendedListByCategory([]);
          return;
        }
        const byCategory = new Map<string, { category: { id: string; name: string }; products: any[] }>();
        for (const it of items) {
          const product = it?.product;
          if (!product) continue;
          const cid = String(it?.category_id ?? product?.category?.id ?? "").trim();
          const cname = it?.category?.name ?? product?.category?.name ?? "";
          if (!cid) continue;
          if (!byCategory.has(cid)) byCategory.set(cid, { category: { id: cid, name: cname || "" }, products: [] });
          byCategory.get(cid)!.products.push(product);
        }
        const groups: CategoryGroup[] = Array.from(byCategory.values()).map((g) => ({
          category: g.category,
          products: g.products.slice(0, CATEGORY_BLOCK_SIZE).map(transformProductFromApi),
        }));
        setRecommendedListByCategory(groups);
      })
      .catch(() => {
        if (!cancelled) setRecommendedListByCategory([]);
      })
      .finally(() => {
        if (!cancelled) setRecommendedListLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  // Блок 2: GET /shop/products/recommended — товары, на которых в Django admin включена галочка «Рекомендуемый» (любые категории); кнопка → каталог
  const [recommendedByFlagProducts, setRecommendedByFlagProducts] = useState<any[]>([]);
  const [recommendedByFlagLoading, setRecommendedByFlagLoading] = useState(true);
  useEffect(() => {
    let cancelled = false;
    setRecommendedByFlagLoading(true);
    shopAPI
      .getRecommendedProducts({ limit: 8 })
      .then((res) => {
        if (cancelled) return;
        const list = Array.isArray(res?.data) ? res.data : [];
        setRecommendedByFlagProducts(list.map(transformProductFromApi));
      })
      .catch(() => {
        if (!cancelled) setRecommendedByFlagProducts([]);
      })
      .finally(() => {
        if (!cancelled) setRecommendedByFlagLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="min-h-screen bg-[#f7f8fa]">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 lg:py-10">
        <div className="space-y-12 sm:space-y-16 lg:space-y-20">
          {/* 1. Hero Slider */}
          <section className="relative rounded-2xl overflow-hidden shadow-sm">
            <SimpleSlider />
          </section>

          {/* 2. Рекомендуемые товары (по галочке в админке) — сразу под слайдером */}
          <section className="bg-white rounded-2xl shadow-sm border border-slate-100/80 overflow-hidden">
            <div className="px-4 sm:px-6 lg:px-8 pt-6 sm:pt-8 pb-4">
              <h2 className="text-2xl sm:text-3xl font-semibold text-slate-900 tracking-tight">
                {t("home.recommended")}
              </h2>
            </div>
            <div className="px-4 sm:px-6 lg:px-8 pb-6 sm:pb-8">
              {recommendedByFlagLoading ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 sm:gap-5 min-h-[220px] place-items-center">
                  <div className="col-span-full flex justify-center py-12">
                    <div className="h-9 w-9 animate-spin rounded-full border-4 border-slate-200 border-t-blue-500" />
                  </div>
                </div>
              ) : recommendedByFlagProducts.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 sm:gap-5 lg:gap-6 items-stretch">
                  {recommendedByFlagProducts.map((product) => (
                    <ProductCard
                      key={product.variant_id ? `${product.product_id}_${product.variant_id}` : product.product_id}
                      product={product}
                      locale={i18n.language}
                    />
                  ))}
                </div>
              ) : null}
            </div>
          </section>

          {/* 3. Фото (баннер) */}
          <SliderBannerBetween slideIndex={0} />

          {/* 4. Динамические блоки по категориям из API recommended-products: фото → блок категории → фото → следующая категория… */}
          {recommendedListLoading ? (
            <section className="bg-white rounded-2xl shadow-sm border border-slate-100/80 overflow-hidden">
              <div className="px-4 sm:px-6 lg:px-8 py-12 flex justify-center">
                <div className="h-9 w-9 animate-spin rounded-full border-4 border-slate-200 border-t-blue-500" />
              </div>
            </section>
          ) : (
            recommendedListByCategory.map((group, idx) => (
              <React.Fragment key={group.category.id}>
                <section className="bg-white rounded-2xl shadow-sm border border-slate-100/80 overflow-hidden">
                  <div className="px-4 sm:px-6 lg:px-8 pt-6 sm:pt-8 pb-4 flex flex-wrap items-center justify-between gap-3">
                    <h2 className="text-2xl sm:text-3xl font-semibold text-slate-900 tracking-tight">
                      {group.category.name}
                    </h2>
                    <Link
                      to={`/category/${group.category.id}`}
                      className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
                    >
                      {t("home.moreProducts")} →
                    </Link>
                  </div>
                  <div className="px-4 sm:px-6 lg:px-8 pb-6 sm:pb-8">
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 sm:gap-5 lg:gap-6 items-stretch">
                      {group.products.map((product) => (
                        <ProductCard
                          key={product.variant_id ? `${product.product_id}_${product.variant_id}` : product.product_id}
                          product={product}
                          locale={i18n.language}
                        />
                      ))}
                    </div>
                  </div>
                </section>
                <SliderBannerBetween slideIndex={idx + 1} />
              </React.Fragment>
            ))
          )}

          {/* 5. Скидки */}
          <section className="bg-white rounded-2xl shadow-sm border border-slate-100/80 overflow-hidden">
            <div className="px-4 sm:px-6 lg:px-8 pt-6 sm:pt-8 pb-4 flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-2xl sm:text-3xl font-semibold text-slate-900 tracking-tight">
                {t("home.discounts")}
              </h2>
              <Link
                to="/discounts"
                className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
              >
                {t("home.moreProducts")} →
              </Link>
            </div>
            <div className="px-4 sm:px-6 lg:px-8 pb-6 sm:pb-8">
              {discountsLoading ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 sm:gap-5 min-h-[220px] place-items-center">
                  <div className="col-span-full flex justify-center py-12">
                    <div className="h-9 w-9 animate-spin rounded-full border-4 border-slate-200 border-t-blue-500" />
                  </div>
                </div>
              ) : discountProducts.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 sm:gap-5 lg:gap-6 items-stretch">
                  {discountProducts.map((product) => (
                    <ProductCard
                      key={product.variant_id ? `${product.product_id}_${product.variant_id}` : product.product_id}
                      product={product}
                      locale={i18n.language}
                    />
                  ))}
                </div>
              ) : null}
            </div>
          </section>

          <SliderBannerBetween slideIndex={recommendedListByCategory.length + 1} />

          {/* 6. Все товары */}
          <section className="bg-white rounded-2xl shadow-sm border border-slate-100/80 overflow-hidden">
            <div className="px-4 sm:px-6 lg:px-8 pt-6 sm:pt-8 pb-4">
              <h2 className="text-2xl sm:text-3xl font-semibold text-slate-900 tracking-tight">
                {t("catalog.otherProducts")}
              </h2>
            </div>
            <div className="px-4 sm:px-6 lg:px-8 pb-6 sm:pb-8">
              <ProductsList />
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
export default MainPage;
