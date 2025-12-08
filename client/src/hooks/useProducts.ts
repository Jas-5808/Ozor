import { useState, useEffect, useMemo, useCallback } from "react";
import i18n from "../i18n";
import { shopAPI } from "../api";
import { Product } from "../types";
import { logger } from "../utils/logger";
import { handleApiError, getUserFriendlyMessage } from "../utils/errorHandler";

const ITEMS_PER_PAGE = 20; // Количество товаров на страницу
const API_LIMIT = 100; // Максимальный лимит для API запроса
const CACHE_TTL = 5 * 60 * 1000; // 5 минут кэш

// Простой кэш для продуктов
let productsCache: {
  data: Product[];
  timestamp: number;
} | null = null;

// Функция для трансформации продукта из API
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

// Функция для обработки и группировки продуктов
const processProducts = (rawProducts: any[]): Product[] => {
  // Фильтруем товары: показываем только те, у которых есть цена (price > 0)
  const filteredProducts = rawProducts.filter(
    (product) => product.price && product.price > 0
  );
  
  // Группируем по product_id и выбираем лучший вариант
  const productsByProductId = new Map<string, Product[]>();
  
  // Используем обычный for цикл для лучшей производительности (быстрее forEach/map)
  for (let i = 0; i < filteredProducts.length; i++) {
    const item = filteredProducts[i];
    const product = transformProduct(item);
    const key = product.product_id;
    
    // Оптимизация: проверяем и создаем массив за один проход
    let variants = productsByProductId.get(key);
    if (!variants) {
      variants = [];
      productsByProductId.set(key, variants);
    }
    variants.push(product);
  }

  // Для каждого продукта выбираем лучший вариант
  const finalProducts: Product[] = [];
  
  productsByProductId.forEach((productVariants) => {
    // Сортируем: сначала в наличии, потом отсутствующие, затем по цене
    productVariants.sort((a, b) => {
      if (a.stock > 0 && b.stock === 0) return -1;
      if (a.stock === 0 && b.stock > 0) return 1;
      return (a.price || 0) - (b.price || 0);
    });
    
    // Берем первый вариант (лучший)
    if (productVariants.length > 0) {
      finalProducts.push(productVariants[0]);
    }
  });
  
  return finalProducts;
};

export const useProducts = () => {
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [displayedCount, setDisplayedCount] = useState<number>(ITEMS_PER_PAGE);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  
  const fetchProducts = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Проверяем кэш
      const now = Date.now();
      if (productsCache && (now - productsCache.timestamp) < CACHE_TTL) {
        setAllProducts(productsCache.data);
        setDisplayedCount(ITEMS_PER_PAGE);
        setLoading(false);
        return;
      }
      
      // Загружаем все продукты с пагинацией
      const allFetchedProducts: any[] = [];
      let offset = 0;
      let hasMore = true;
      
      while (hasMore) {
        const response = await shopAPI.getProducts({ limit: API_LIMIT, offset });
        const data = response.data || [];
        
        if (data.length === 0) {
          hasMore = false;
        } else {
          // Используем прямой push элементов для лучшей производительности
          for (let i = 0; i < data.length; i++) {
            allFetchedProducts.push(data[i]);
          }
          offset += data.length;
          
          // Если получили меньше лимита, значит это последняя страница
          if (data.length < API_LIMIT) {
            hasMore = false;
          }
        }
      }
      
      // Обрабатываем продукты
      const finalProducts = processProducts(allFetchedProducts);
      
      // Сохраняем в кэш
      productsCache = {
        data: finalProducts,
        timestamp: Date.now(),
      };
      
      setAllProducts(finalProducts);
      setDisplayedCount(ITEMS_PER_PAGE); // Сбрасываем счетчик при новой загрузке
    } catch (error) {
      const appError = handleApiError(error);
      const errorMessage = getUserFriendlyMessage(appError) || i18n.t("common.errors.productsLoad");
      setError(errorMessage);
      logger.errorWithContext(appError, { context: 'fetchProducts' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetchProducts().finally(()=>{ if (cancelled) return; });
    return ()=>{ cancelled = true; };
  }, [fetchProducts]);

  // Отображаемые продукты (пагинация на клиенте) - мемоизировано
  const products = useMemo(() => {
    return allProducts.slice(0, displayedCount);
  }, [allProducts, displayedCount]);

  // Есть ли еще продукты для загрузки - мемоизировано
  const hasMore = useMemo(() => {
    return displayedCount < allProducts.length;
  }, [displayedCount, allProducts.length]);

  // Загрузить следующую порцию - мемоизировано
  const loadMore = useCallback(() => {
    if (hasMore && !loading) {
      setDisplayedCount(prev => Math.min(prev + ITEMS_PER_PAGE, allProducts.length));
    }
  }, [hasMore, loading, allProducts.length]);

  const refetch = useCallback(() => {
    // Очищаем кэш при принудительном обновлении
    productsCache = null;
    fetchProducts();
  }, [fetchProducts]);

  return {
    products,
    loading,
    error,
    refetch,
    hasMore,
    loadMore,
  };
};
export const useProductById = (productId: string | undefined) => {
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const fetchProduct = async () => {
    if (!productId) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      setError(null);
      const response = await shopAPI.getProductById(productId);
      setProduct(response.data);
    } catch (error) {
      const appError = handleApiError(error);
      const errorMessage = getUserFriendlyMessage(appError) || i18n.t("common.errors.productLoad");
      setError(errorMessage);
      logger.errorWithContext(appError, { context: 'fetchProduct' });
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    let cancelled = false;
    fetchProduct().finally(()=>{ if (cancelled) return; });
    return ()=>{ cancelled = true; };
  }, [productId]);
  return {
    product,
    loading,
    error,
    refetch: fetchProduct,
  };
};
export const useProductsByCategory = (categoryId: string | undefined) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const fetchProductsByCategory = async () => {
    if (!categoryId) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      setError(null);
      const response = await shopAPI.getProductsByCategory(categoryId);
      // Фильтруем товары: показываем только те, у которых есть цена (price > 0)
      const filteredProducts = response.data.filter(
        (product) => product.price && product.price > 0
      );
      setProducts(filteredProducts);
    } catch (error) {
      const appError = handleApiError(error);
      const errorMessage = getUserFriendlyMessage(appError) || i18n.t("common.errors.productCategoryLoad");
      setError(errorMessage);
      logger.errorWithContext(appError, { context: 'fetchProductsByCategory' });
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    let cancelled = false;
    fetchProductsByCategory().finally(()=>{ if (cancelled) return; });
    return ()=>{ cancelled = true; };
  }, [categoryId]);
  return {
    products,
    loading,
    error,
    refetch: fetchProductsByCategory,
  };
};
