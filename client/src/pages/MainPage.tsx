import React from "react";
import { useTranslation } from "react-i18next";
import useSEO from "../hooks/useSEO";
import ProductsList from "../components/ProductsList";
import SimpleSlider from "../components/SimpleSlider";

export function MainPage() {
  const { t } = useTranslation();
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
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="container mx-auto px-4 py-6">
        <div className="space-y-8">
          {/* Hero Slider */}
          <div className="relative">
            <SimpleSlider />
          </div>

          {/* Products Section */}
          <div className="space-y-6">
            {/* <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-800">
                Популярные товары
              </h2>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <span>Всего товаров</span>
                <span className="bg-blue-100 text-blue-600 px-2 py-1 rounded-full text-xs font-medium">
                  Новинки
                </span>
              </div>
            </div> */}
            <ProductsList />
          </div>
        </div>
      </div>
    </div>
  );
}
export default MainPage;
