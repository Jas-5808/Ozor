import React, { useState, useEffect, useMemo } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { shopAPI } from "../services/api";
import { Product } from "../types";
import ProductCard from "../components/ui/ProductCard";
import useSEO from "../hooks/useSEO";
import SkeletonGrid from "../components/SkeletonGrid";

export function SearchPage() {
  const [searchParams] = useSearchParams();
  const query = searchParams.get("q") || "";
  const { t } = useTranslation();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const limit = 20;

  useSEO({
    title: query ? `${t("search.title")}: ${query} — OZAR` : t("search.title") + " — OZAR",
    robots: "index,follow",
    canonical: typeof window !== "undefined" ? window.location.href : undefined,
  });

  useEffect(() => {
    const fetchProducts = async () => {
      if (!query.trim()) {
        setProducts([]);
        setLoading(false);
        setError(null);
        return;
      }

      setLoading(true);
      setError(null);
      setOffset(0);
      setHasMore(true);

      try {
        const response = await shopAPI.searchProducts(query, { offset: 0, limit });
        const data = response.data || [];

        // Трансформируем продукты
        const transformedProducts = data.map((item: any): Product => ({
          product_id: item.product_id || item.id,
          product_name: item.product_name || item.name,
          product_description: item.product_description || item.description || "",
          category: item.category,
          refferal_price: item.refferal_price || 0,
          main_image: item.main_image || "",
          variant_id: item.variant_id || "",
          variant_sku: item.variant_sku || item.sku || "",
          price: item.price || item.base_price || 0,
          stock: item.stock || 0,
          variant_attributes: item.variant_attributes || [],
          variant_media: item.variant_media || [],
        }));

        // Группируем по product_id и выбираем лучший вариант (сначала в наличии)
        const productsByProductId = new Map<string, Product[]>();
        transformedProducts.forEach((product) => {
          const key = product.product_id;
          if (!productsByProductId.has(key)) {
            productsByProductId.set(key, []);
          }
          productsByProductId.get(key)!.push(product);
        });

        const finalProducts: Product[] = [];
        productsByProductId.forEach((productVariants) => {
          // Сортируем: сначала в наличии, потом отсутствующие
          productVariants.sort((a, b) => {
            if (a.stock > 0 && b.stock === 0) return -1;
            if (a.stock === 0 && b.stock > 0) return 1;
            return 0;
          });
          if (productVariants.length > 0) {
            finalProducts.push(productVariants[0]);
          }
        });

        // Сортируем: сначала товары с запросом в названии, потом остальные
        const queryLower = query.toLowerCase().trim();
        finalProducts.sort((a, b) => {
          const aNameMatch = a.product_name?.toLowerCase().includes(queryLower) || false;
          const bNameMatch = b.product_name?.toLowerCase().includes(queryLower) || false;
          
          if (aNameMatch && !bNameMatch) return -1;
          if (!aNameMatch && bNameMatch) return 1;
          
          // Если оба совпадают или оба не совпадают, приоритет товарам в наличии
          if (a.stock > 0 && b.stock === 0) return -1;
          if (a.stock === 0 && b.stock > 0) return 1;
          
          return 0;
        });

        setProducts(finalProducts);
        setHasMore(data.length === limit);
      } catch (err: any) {
        console.error("Error searching products:", err);
        setError(err?.response?.data?.message || err?.message || t("search.error"));
        setProducts([]);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, [query, t]);

  const loadMore = async () => {
    if (loading || !hasMore || !query.trim()) return;

    setLoading(true);
    try {
      const newOffset = offset + limit;
      const response = await shopAPI.searchProducts(query, { offset: newOffset, limit });
      const data = response.data || [];

      const transformedProducts = data.map((item: any): Product => ({
        product_id: item.product_id || item.id,
        product_name: item.product_name || item.name,
        product_description: item.product_description || item.description || "",
        category: item.category,
        refferal_price: item.refferal_price || 0,
        main_image: item.main_image || "",
        variant_id: item.variant_id || "",
        variant_sku: item.variant_sku || item.sku || "",
        price: item.price || item.base_price || 0,
        stock: item.stock || 0,
        variant_attributes: item.variant_attributes || [],
        variant_media: item.variant_media || [],
      }));

      // Группируем и добавляем к существующим
      const productsByProductId = new Map<string, Product[]>();
      [...products, ...transformedProducts].forEach((product) => {
        const key = product.product_id;
        if (!productsByProductId.has(key)) {
          productsByProductId.set(key, []);
        }
        productsByProductId.get(key)!.push(product);
      });

      const finalProducts: Product[] = [];
      productsByProductId.forEach((productVariants) => {
        productVariants.sort((a, b) => {
          if (a.stock > 0 && b.stock === 0) return -1;
          if (a.stock === 0 && b.stock > 0) return 1;
          return 0;
        });
        if (productVariants.length > 0) {
          finalProducts.push(productVariants[0]);
        }
      });

      // Сортируем: сначала товары с запросом в названии, потом остальные
      const queryLower = query.toLowerCase().trim();
      finalProducts.sort((a, b) => {
        const aNameMatch = a.product_name?.toLowerCase().includes(queryLower) || false;
        const bNameMatch = b.product_name?.toLowerCase().includes(queryLower) || false;
        
        if (aNameMatch && !bNameMatch) return -1;
        if (!aNameMatch && bNameMatch) return 1;
        
        // Если оба совпадают или оба не совпадают, приоритет товарам в наличии
        if (a.stock > 0 && b.stock === 0) return -1;
        if (a.stock === 0 && b.stock > 0) return 1;
        
        return 0;
      });

      setProducts(finalProducts);
      setOffset(newOffset);
      setHasMore(data.length === limit);
    } catch (err: any) {
      console.error("Error loading more products:", err);
      setError(err?.response?.data?.message || err?.message || t("search.error"));
    } finally {
      setLoading(false);
    }
  };

  // Подсчет уникальных категорий
  const uniqueCategoriesCount = useMemo(() => {
    const categoryIds = new Set<string>();
    products.forEach((product) => {
      if (product.category?.id) {
        categoryIds.add(product.category.id);
      }
    });
    return categoryIds.size;
  }, [products]);

  if (!query.trim()) {
    return (
      <div className="container mx-auto px-4 py-6">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-2xl font-bold text-slate-900 mb-4">{t("search.title")}</h1>
          <p className="text-slate-600">{t("search.emptyQuery")}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          {products.length > 0 && (
            <h1 className="text-2xl md:text-3xl font-bold text-slate-900 mb-2">
              {t("search.foundInCategories", { 
                productsCount: products.length, 
                categoriesCount: uniqueCategoriesCount 
              })}
            </h1>
          )}
        </div>

        {loading && products.length === 0 && (
          <div className="rounded-2xl border border-gray-200 p-6">
            <SkeletonGrid count={8} columns={4} />
          </div>
        )}

        {error && (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
            {error}
          </div>
        )}

        {!loading && !error && products.length === 0 && (
          <div className="rounded-2xl border border-gray-200 bg-gray-50 p-8 text-center">
            <p className="text-lg text-slate-600 mb-2">{t("search.noResults")}</p>
            <p className="text-sm text-slate-500">{t("search.tryDifferent")}</p>
          </div>
        )}

        {products.length > 0 && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-6">
              {products.map((product) => (
                <ProductCard key={`${product.product_id}-${product.variant_id}`} product={product} />
              ))}
            </div>

            {hasMore && (
              <div className="text-center">
                <button
                  onClick={loadMore}
                  disabled={loading}
                  className="px-6 py-3 rounded-2xl bg-white border border-gray-200 text-slate-700 font-semibold hover:bg-gray-50 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? t("search.loading") : t("search.loadMore")}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

