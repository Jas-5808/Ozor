import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { shopAPI } from "../services/api";
import { useCategoryById, useCategories, getSubcategories } from "../hooks/useCategories";
import { Product } from "../types";
import ProductCard from "../components/ui/ProductCard";
import useSEO from "../hooks/useSEO";
import SkeletonGrid from "../components/SkeletonGrid";

export function CategoryPage() {
  const { id } = useParams<{ id: string }>();
  const { t } = useTranslation();
  const { category, loading: categoryLoading } = useCategoryById(id);
  const { categories } = useCategories();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useSEO({
    title: category ? `${category.name} — OZAR` : "Категория — OZAR",
    robots: "index,follow",
    canonical: typeof window !== "undefined" ? window.location.href : undefined,
  });

  // Получаем подкатегории для текущей категории
  const subcategories = id ? getSubcategories(categories, id) : [];

  useEffect(() => {
    const fetchProducts = async () => {
      if (!id || !category) return;
      
      try {
        setLoading(true);
        setError(null);
        
        // Определяем, является ли текущая категория подкатегорией
        const isSubcategory = category.parent_id !== null;
        const parentCategoryId = category.parent_id;
        
        // Получаем продукты выбранной категории
        const currentCategoryResponse = await shopAPI.getProductsByCategory(id);
        
        // Если это подкатегория, получаем еще продукты родительской категории
        let parentCategoryResponse = null;
        if (isSubcategory && parentCategoryId) {
          try {
            parentCategoryResponse = await shopAPI.getProductsByCategory(parentCategoryId);
          } catch (err) {
            console.warn("Failed to fetch parent category products:", err);
          }
        }
        
        // Получаем остальные продукты (без фильтра по категории)
        const allOtherProductsResponse = await shopAPI.getProducts();
        
        // Функция трансформации
        const transformProduct = (item: any): Product => ({
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
        });
        
        // Трансформируем все продукты
        const currentCategoryProducts = (currentCategoryResponse.data || []).map(transformProduct);
        const parentCategoryProducts = parentCategoryResponse 
          ? (parentCategoryResponse.data || []).map(transformProduct)
          : [];
        const allOtherProducts = (allOtherProductsResponse.data || []).map(transformProduct);
        
        // Фильтруем остальные продукты (исключаем текущую и родительскую категории)
        const otherCategoryProducts = allOtherProducts.filter(product => {
          const productCategoryId = product.category?.id || '';
          return productCategoryId !== id && 
                 (!isSubcategory || productCategoryId !== parentCategoryId);
        });
        
        // Группируем все продукты по product_id для обработки вариантов
        const allProducts = [
          ...currentCategoryProducts,
          ...parentCategoryProducts,
          ...otherCategoryProducts,
        ];
        
        const productsByProductId = new Map<string, Product[]>();
        allProducts.forEach(product => {
          const key = product.product_id;
          if (!productsByProductId.has(key)) {
            productsByProductId.set(key, []);
          }
          productsByProductId.get(key)!.push(product);
        });
        
        // Сортируем варианты внутри каждой группы: сначала с stock > 0, потом остальные
        productsByProductId.forEach((variants) => {
          variants.sort((a, b) => {
            if (a.stock > 0 && b.stock === 0) return -1;
            if (a.stock === 0 && b.stock > 0) return 1;
            return b.stock - a.stock;
          });
        });
        
        // Разделяем на группы по категориям (используя первый вариант каждого продукта)
        const currentGroup: Product[] = [];
        const parentGroup: Product[] = [];
        const otherGroup: Product[] = [];
        const processedProductIds = new Set<string>();
        
        // Сначала обрабатываем продукты текущей категории
        currentCategoryProducts.forEach(product => {
          const productId = product.product_id;
          if (!processedProductIds.has(productId)) {
            const variants = productsByProductId.get(productId) || [product];
            currentGroup.push(variants[0]);
            processedProductIds.add(productId);
          }
        });
        
        // Затем продукты родительской категории (если это подкатегория)
        if (isSubcategory) {
          parentCategoryProducts.forEach(product => {
            const productId = product.product_id;
            if (!processedProductIds.has(productId)) {
              const variants = productsByProductId.get(productId) || [product];
              parentGroup.push(variants[0]);
              processedProductIds.add(productId);
            }
          });
        }
        
        // Остальные продукты
        otherCategoryProducts.forEach(product => {
          const productId = product.product_id;
          if (!processedProductIds.has(productId)) {
            const variants = productsByProductId.get(productId) || [product];
            otherGroup.push(variants[0]);
            processedProductIds.add(productId);
          }
        });
        
        // Сортируем внутри каждой группы: сначала с stock > 0, потом остальные
        const sortByStock = (a: Product, b: Product) => {
          if (a.stock > 0 && b.stock === 0) return -1;
          if (a.stock === 0 && b.stock > 0) return 1;
          return b.stock - a.stock;
        };
        
        currentGroup.sort(sortByStock);
        parentGroup.sort(sortByStock);
        otherGroup.sort(sortByStock);
        
        // Объединяем в правильном порядке
        const sortedProducts = [
          ...currentGroup,
          ...parentGroup,
          ...otherGroup,
        ];
        
        // Добавляем альтернативные варианты для продуктов, у которых основной вариант закончился
        const finalProducts: Product[] = [];
        
        sortedProducts.forEach(mainProduct => {
          const productId = mainProduct.product_id;
          
          // Добавляем основной вариант
          finalProducts.push(mainProduct);
          
          // Если основной вариант закончился (stock === 0), добавляем альтернативные варианты
          if (mainProduct.stock === 0) {
            const allVariants = productsByProductId.get(productId) || [];
            // Добавляем остальные варианты (начиная со второго)
            for (let i = 1; i < allVariants.length; i++) {
              finalProducts.push(allVariants[i]);
            }
          }
        });
        
        setProducts(finalProducts);
      } catch (err) {
        console.error("Error fetching products:", err);
        setError(t("common.errors.productsLoad"));
      } finally {
        setLoading(false);
      }
    };

    if (category) {
      fetchProducts();
    }
  }, [id, category, t]);

  return (
    <div className="container mx-auto px-4 py-6">
      {/* Breadcrumb */}
      <nav className="mb-4 text-sm">
        <ol className="flex items-center gap-2 text-slate-500">
          <li>
            <Link to="/" className="hover:text-[#04734b] transition">
              {t("common.navigation.home")}
            </Link>
          </li>
          <li>/</li>
          <li>
            <Link to="/catalog" className="hover:text-[#04734b] transition">
              {t("catalog.header")}
            </Link>
          </li>
          {category?.parent_name && (
            <>
              <li>/</li>
              <li>
                <Link 
                  to={`/category/${category.parent_id}`} 
                  className="hover:text-[#04734b] transition"
                >
                  {category.parent_name}
                </Link>
              </li>
            </>
          )}
          <li>/</li>
          <li className="text-slate-900 font-medium">
            {categoryLoading ? "..." : category?.name || t("catalog.category")}
          </li>
        </ol>
      </nav>

      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-slate-900">
          {categoryLoading ? (
            <div className="h-8 w-48 bg-slate-200 rounded animate-pulse"></div>
          ) : (
            category?.name || t("catalog.category")
          )}
        </h1>
        {category?.products_count !== undefined && (
          <p className="text-slate-500 mt-1">
            {t("catalog.productsCount", { count: category.products_count })}
          </p>
        )}
      </div>

      {/* Подкатегории */}
      {subcategories.length > 0 && (
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-slate-800 mb-3">
            {t("catalog.subcategories")}
          </h2>
          <div className="flex flex-wrap gap-2">
            {subcategories.map((sub) => (
              <Link
                key={sub.id}
                to={`/category/${sub.id}`}
                className="px-4 py-2 bg-white border border-slate-200 rounded-full text-sm font-medium text-slate-700 hover:border-[#04734b] hover:text-[#04734b] transition shadow-sm"
              >
                {sub.name}
                <span className="ml-1 text-slate-400">({sub.products_count})</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Products Grid */}
      {loading ? (
        <SkeletonGrid count={8} />
      ) : error ? (
        <div className="text-center py-12">
          <div className="text-5xl mb-4">😕</div>
          <p className="text-slate-500">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-6 py-2 bg-[#04734b] text-white rounded-lg hover:brightness-110 transition"
          >
            {t("common.actions.retry")}
          </button>
        </div>
      ) : products.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-5xl mb-4">📦</div>
          <p className="text-slate-500 text-lg">{t("catalog.noProducts")}</p>
          <Link
            to="/catalog"
            className="mt-4 inline-block px-6 py-2 bg-[#04734b] text-white rounded-lg hover:brightness-110 transition"
          >
            {t("catalog.backToCatalog")}
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {products.map((product) => (
            <ProductCard 
              key={`${product.product_id}_${product.variant_id || ''}`} 
              product={product} 
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default CategoryPage;

