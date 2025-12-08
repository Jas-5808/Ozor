import { Product } from "../types";

/**
 * Приводит ответ API к унифицированному типу Product
 */
export const transformProductFromApi = (item: any): Product => ({
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

/**
 * Делит товары на основные (по одному на product_id) и варианты
 * Основной вариант — первый из отсортированных по наличию и цене
 */
export const splitProductsIntoPrimaryAndVariants = (rawProducts: any[]) => {
  const productsByProductId = new Map<string, Product[]>();

  for (let i = 0; i < rawProducts.length; i++) {
    const item = rawProducts[i];
    if (!item || !item.price || item.price <= 0) continue;

    const product = transformProductFromApi(item);
    const key = product.product_id;

    if (!productsByProductId.has(key)) {
      productsByProductId.set(key, []);
    }
    productsByProductId.get(key)!.push(product);
  }

  const primaryProducts: Product[] = [];
  const variantProducts: Product[] = [];

  productsByProductId.forEach((variants) => {
    variants.sort((a, b) => {
      if (a.stock > 0 && b.stock === 0) return -1;
      if (a.stock === 0 && b.stock > 0) return 1;
      return (a.price || 0) - (b.price || 0);
    });

    if (variants.length > 0) {
      primaryProducts.push(variants[0]);

      // Остальные варианты показываем позже, когда закончатся основные
      if (variants.length > 1) {
        for (let i = 1; i < variants.length; i++) {
          variantProducts.push(variants[i]);
        }
      }
    }
  });

  return { primaryProducts, variantProducts };
};

/**
 * Строит итоговый список для отображения:
 * сначала основные товары, затем варианты, когда основные закончились
 */
export const buildDisplayProducts = (
  primaryProducts: Product[],
  variantProducts: Product[],
  takeCount: number
): Product[] => {
  if (takeCount <= primaryProducts.length) {
    return primaryProducts.slice(0, takeCount);
  }

  const remaining = takeCount - primaryProducts.length;
  const safePrimary = primaryProducts.slice();
  const safeVariants = variantProducts.slice(0, remaining);

  return [...safePrimary, ...safeVariants];
};

