import React from "react";
import useSEO from "../hooks/useSEO";
import ProductsList from "../components/ProductsList";
import SimpleSlider from "../components/SimpleSlider";

export function MainPage() {
  useSEO({
    title: "OZAR — onlayn do'kon",
    description: "Smartfonlar, elektronika va maishiy texnika. O'zbekiston bo'ylab tez yetkazib berish.",
    canonical: typeof window !== 'undefined' ? window.location.origin + '/' : undefined,
    openGraph: {
      'og:title': "OZAR — onlayn do'kon",
      'og:description': "Smartfonlar, elektronika va maishiy texnika. O'zbekiston bo'ylab tez yetkazib berish.",
      'og:type': 'website',
      'og:url': typeof window !== 'undefined' ? window.location.origin + '/' : '',
    },
    twitter: {
      'twitter:card': 'summary_large_image',
      'twitter:title': "OZAR — onlayn do'kon",
      'twitter:description': "Smartfonlar, elektronika va maishiy texnika. O'zbekiston bo'ylab tez yetkazib berish."
    }
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
