import React, { memo, useMemo, useCallback, useState, useEffect } from "react";
import { shopAPI } from "../services/api";
import { Product } from "../types";
import ProductCard from "./ui/ProductCard";
import SkeletonGrid from "./SkeletonGrid";
import { useTranslation } from "react-i18next";
// CSS module removed - using Tailwind utilities

const ProductsListComponent: React.FC = () => {
  const { t } = useTranslation();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [loadingMore, setLoadingMore] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const limit = 20;

  const handleToggleLike = useCallback((productId: string) => {
    // Логика переключения лайка обрабатывается в AppContext
    // Этот callback оставлен для совместимости
  }, []);

  const fetchProducts = useCallback(async (currentOffset: number, append: boolean = false) => {
    try {
      if (append) {
        setLoadingMore(true);
      } else {
        setLoading(true);
      }
      setError(null);

      const response = await shopAPI.getProducts({ offset: currentOffset, limit });
      const data = response.data || [];

      // Фильтруем товары: показываем только те, у которых есть цена (price > 0)
      const filteredProducts = data.filter(
        (product: any) => product.price && product.price > 0
      );

      // Трансформируем продукты
      const transformedProducts = filteredProducts.map((item: any): Product => ({
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

      if (append) {
        // При добавлении новых товаров, обновляем список с учетом существующих
        setProducts((prevProducts) => {
          // Группируем по product_id
          const productsByProductId = new Map<string, Product[]>();
          [...prevProducts, ...transformedProducts].forEach((product) => {
            const key = product.product_id;
            if (!productsByProductId.has(key)) {
              productsByProductId.set(key, []);
            }
            productsByProductId.get(key)!.push(product);
          });

          // Сначала основные товары (по одному варианту), потом варианты
          const mainProducts: Product[] = [];
          const variantProducts: Product[] = [];
          
          productsByProductId.forEach((productVariants) => {
            // Сортируем: сначала в наличии, потом отсутствующие
            productVariants.sort((a, b) => {
              if (a.stock > 0 && b.stock === 0) return -1;
              if (a.stock === 0 && b.stock > 0) return 1;
              return 0;
            });
            
            // Первый вариант - основной товар
            if (productVariants.length > 0) {
              mainProducts.push(productVariants[0]);
            }
            
            // Остальные варианты
            if (productVariants.length > 1) {
              variantProducts.push(...productVariants.slice(1));
            }
          });
          
          // Сортируем варианты: сначала в наличии
          variantProducts.sort((a, b) => {
            if (a.stock > 0 && b.stock === 0) return -1;
            if (a.stock === 0 && b.stock > 0) return 1;
            return 0;
          });
          
          return [...mainProducts, ...variantProducts];
        });
      } else {
        // При первой загрузке
        const productsByProductId = new Map<string, Product[]>();
        transformedProducts.forEach((product) => {
          const key = product.product_id;
          if (!productsByProductId.has(key)) {
            productsByProductId.set(key, []);
          }
          productsByProductId.get(key)!.push(product);
        });

        // Сначала основные товары (по одному варианту), потом варианты
        const mainProducts: Product[] = [];
        const variantProducts: Product[] = [];
        
        productsByProductId.forEach((productVariants) => {
          // Сортируем: сначала в наличии, потом отсутствующие
          productVariants.sort((a, b) => {
            if (a.stock > 0 && b.stock === 0) return -1;
            if (a.stock === 0 && b.stock > 0) return 1;
            return 0;
          });
          
          // Первый вариант - основной товар
          if (productVariants.length > 0) {
            mainProducts.push(productVariants[0]);
          }
          
          // Остальные варианты
          if (productVariants.length > 1) {
            variantProducts.push(...productVariants.slice(1));
          }
        });
        
        // Сортируем варианты: сначала в наличии
        variantProducts.sort((a, b) => {
          if (a.stock > 0 && b.stock === 0) return -1;
          if (a.stock === 0 && b.stock > 0) return 1;
          return 0;
        });
        
        setProducts([...mainProducts, ...variantProducts]);
      }

      setHasMore(data.length === limit);
      setOffset(currentOffset + data.length);
    } catch (err: any) {
      console.error("Error fetching products:", err);
      setError(err?.response?.data?.message || err?.message || t("common.errors.productsLoad"));
      if (!append) {
        setProducts([]);
      }
    } finally {
      if (append) {
        setLoadingMore(false);
      } else {
        setLoading(false);
      }
    }
  }, [t, limit]);

  useEffect(() => {
    let cancelled = false;
    const loadInitial = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await shopAPI.getProducts({ offset: 0, limit });
        if (cancelled) return;
        
        const data = response.data || [];
        const filteredProducts = data.filter(
          (product: any) => product.price && product.price > 0
        );

        const transformedProducts = filteredProducts.map((item: any): Product => ({
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

        const productsByProductId = new Map<string, Product[]>();
        transformedProducts.forEach((product) => {
          const key = product.product_id;
          if (!productsByProductId.has(key)) {
            productsByProductId.set(key, []);
          }
          productsByProductId.get(key)!.push(product);
        });

        // Сначала основные товары (по одному варианту), потом варианты
        const mainProducts: Product[] = [];
        const variantProducts: Product[] = [];
        
        productsByProductId.forEach((productVariants) => {
          // Сортируем: сначала в наличии, потом отсутствующие
          productVariants.sort((a, b) => {
            if (a.stock > 0 && b.stock === 0) return -1;
            if (a.stock === 0 && b.stock > 0) return 1;
            return 0;
          });
          
          // Первый вариант - основной товар
          if (productVariants.length > 0) {
            mainProducts.push(productVariants[0]);
          }
          
          // Остальные варианты
          if (productVariants.length > 1) {
            variantProducts.push(...productVariants.slice(1));
          }
        });
        
        // Сортируем варианты: сначала в наличии
        variantProducts.sort((a, b) => {
          if (a.stock > 0 && b.stock === 0) return -1;
          if (a.stock === 0 && b.stock > 0) return 1;
          return 0;
        });
        
        setProducts([...mainProducts, ...variantProducts]);
        setHasMore(data.length === limit);
        setOffset(data.length);
      } catch (err: any) {
        if (cancelled) return;
        console.error("Error fetching products:", err);
        setError(err?.response?.data?.message || err?.message || t("common.errors.productsLoad"));
        setProducts([]);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };
    
    loadInitial();
    return () => { cancelled = true; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const loadMore = useCallback(() => {
    if (!loadingMore && hasMore) {
      fetchProducts(offset, true);
    }
  }, [loadingMore, hasMore, offset, fetchProducts]);

  const refetch = useCallback(() => {
    setOffset(0);
    setHasMore(true);
    setProducts([]);
    fetchProducts(0, false);
  }, [fetchProducts]);
  
  const productCards = useMemo(() => {
    if (!products || products.length === 0) return null;
    
    return products.map((product, index) => {
      const uniqueKey = product?.variant_id 
        ? `${product.product_id}_${product.variant_id}` 
        : product?.product_id || `product-${index}`;
      return (
        <ProductCard
          key={uniqueKey}
          product={product}
          onToggleLike={handleToggleLike}
        />
      );
    });
  }, [products, handleToggleLike]);

  if (loading) {
    return <SkeletonGrid count={8} columns={4} />;
  }
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center p-10 text-center">
        <p className="mb-5 text-red-600">{t("common.errors.productsLoad")}: {error}</p>
        <button 
          className="bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600 transition-colors"
          onClick={refetch}
        >
          {t("common.actions.retry") || "Попробовать снова"}
        </button>
      </div>
    );
  }
  if (!products || products.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-10 text-center">
        <p className="mb-5 text-gray-500">{t("common.errors.noProducts") || "Продукты не найдены"}</p>
        <button 
          className="bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600 transition-colors"
          onClick={refetch}
        >
          {t("common.actions.refresh") || "Обновить"}
        </button>
      </div>
    );
  }
  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4 lg:gap-5 items-stretch">
        {productCards}
      </div>
      {hasMore && (
        <div className="flex justify-center mt-8">
          <button
            onClick={loadMore}
            disabled={loadingMore}
            className="px-6 py-3 rounded-2xl bg-white border border-gray-200 text-slate-700 font-semibold hover:bg-gray-50 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loadingMore ? t("common.loading") : t("search.loadMore") || "Загрузить еще"}
          </button>
        </div>
      )}
      {loadingMore && (
        <div className="mt-4">
          <SkeletonGrid count={4} columns={4} />
        </div>
      )}
    </>
  );
};

export const ProductsList = memo(ProductsListComponent);
ProductsList.displayName = 'ProductsList';

export default ProductsList;
