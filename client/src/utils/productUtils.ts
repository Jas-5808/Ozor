import { Product } from "../types";
import i18n from "../i18n";

const getLocaleCode = () => (i18n.language?.split("-")[0] || "ru").toLowerCase();

const stripHtml = (value: string): string => {
  if (!value) return "";
  const withBreaks = value
    .replace(/<\s*br\s*\/?>/gi, "\n")
    .replace(/<\/p\s*>/gi, "\n\n")
    .replace(/<p[^>]*>/gi, "");
  const noTags = withBreaks.replace(/<[^>]+>/g, "");
  if (typeof document === "undefined") {
    return noTags.replace(/\n{3,}/g, "\n\n").trim();
  }
  const textarea = document.createElement("textarea");
  textarea.innerHTML = noTags;
  return textarea.value.replace(/\n{3,}/g, "\n\n").trim();
};

export const resolveProductName = (item: any): string => {
  const locale = getLocaleCode();
  const nameUz = String(item?.name_uz || item?.name || item?.product_name || item?.product_name_uz || "");
  const nameRu = String(item?.name_ru || item?.product_name_ru || "");
  if (locale === "uz") {
    return nameUz || nameRu || "";
  }
  return nameRu || nameUz || "";
};

export const resolveProductDescription = (item: any): string => {
  const locale = getLocaleCode();
  const descUz = item?.description_uz || item?.product_description_uz || item?.description || item?.product_description || "";
  const descRu = item?.description_ru || item?.product_description_ru || item?.description || item?.product_description || "";
  const raw = locale === "uz" ? descUz || descRu : descRu || descUz;
  return stripHtml(String(raw || ""));
};

/**
 * Приводит ответ API к унифицированному типу Product
 */
export const transformProductFromApi = (item: any): Product => ({
  product_id: item.product_id || item.id,
  product_name: resolveProductName(item),
  product_description: resolveProductDescription(item),
  name_uz: item?.name_uz || item?.name || item?.product_name || item?.product_name_uz,
  name_ru: item?.name_ru || item?.product_name_ru,
  description_uz: item?.description_uz || item?.product_description_uz || item?.description || item?.product_description,
  description_ru: item?.description_ru || item?.product_description_ru || item?.description || item?.product_description,
  category: item.category,
  refferal_price: item.refferal_price || 0,
  base_price: typeof item?.base_price === "number" ? item.base_price : null,
  main_image: item.main_image || "",
  variant_id: item.variant_id || "",
  variant_sku: item.variant_sku || item.sku || "",
  price: typeof item?.price === "number" ? item.price : (typeof item?.base_price === "number" ? item.base_price : 0),
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
    if (!item) continue;
    // Проверяем, что хотя бы одна из цен валидна (price или base_price)
    const price = typeof item?.price === "number" ? item.price : null;
    const basePrice = typeof item?.base_price === "number" ? item.base_price : null;
    const effectivePrice = price ?? basePrice;
    if (effectivePrice === null || Number(effectivePrice) <= 0) continue;

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
 * основной поток — основные товары, но варианты "подмешиваются" по ходу,
 * чтобы не было ситуации, когда в конце ленты идут подряд одни варианты.
 *
 * Правило по умолчанию: 4 основных → 1 вариант (если варианты есть).
 * Также стараемся не ставить два элемента с одинаковым product_id подряд.
 */
export const buildDisplayProducts = (
  primaryProducts: Product[],
  variantProducts: Product[],
  takeCount: number
): Product[] => {
  const target = Math.max(0, takeCount | 0);
  if (target === 0) return [];

  const primary = Array.isArray(primaryProducts) ? primaryProducts : [];
  const variants = Array.isArray(variantProducts) ? variantProducts : [];

  let ip = 0;
  let iv = 0;
  const result: Product[] = [];

  const PRIMARY_BATCH = 6;
  let primaryBatchUsed = 0;

  const lastProductId = () => (result.length ? String(result[result.length - 1]?.product_id || "") : "");

  while (result.length < target && (ip < primary.length || iv < variants.length)) {
    const canPickPrimary = ip < primary.length;
    const canPickVariant = iv < variants.length;

    // Решаем, что пробуем взять: по умолчанию берем primary, но раз в batch — variant.
    const shouldTryVariant = canPickVariant && primaryBatchUsed >= PRIMARY_BATCH;

    const pick = (type: "primary" | "variant"): Product | null => {
      if (type === "primary") {
        if (!canPickPrimary) return null;
        const next = primary[ip++];
        primaryBatchUsed += 1;
        return next;
      }
      // variant
      if (!canPickVariant) return null;

      // Стараемся не брать вариант с тем же product_id, что был последним
      const prevId = lastProductId();
      let localIdx = iv;
      while (localIdx < variants.length) {
        const candidate = variants[localIdx];
        const candidateId = String(candidate?.product_id || "");
        if (!prevId || candidateId !== prevId) {
          iv = localIdx + 1;
          primaryBatchUsed = 0; // после вставки варианта сбрасываем batch
          return candidate;
        }
        localIdx += 1;
      }

      // Если не нашли "другой" — берем следующий по порядку
      const fallback = variants[iv++];
      primaryBatchUsed = 0;
      return fallback;
    };

    let next: Product | null = null;
    if (shouldTryVariant) {
      next = pick("variant") ?? pick("primary");
    } else {
      next = pick("primary") ?? pick("variant");
    }
    if (!next) break;
    result.push(next);
  }

  return result;
};

/**
 * Для бесконечной ленты: список в том же порядке, что и ответ API (raw).
 * Не переупорядочивает товары — новые подгруженные всегда в конце, без "вставки" между старыми.
 */
export const buildDisplayProductsFromRawOrder = (rawProducts: any[]): Product[] => {
  if (!Array.isArray(rawProducts) || rawProducts.length === 0) return [];
  const result: Product[] = [];
  for (const item of rawProducts) {
    if (!item) continue;
    const price = typeof item?.price === "number" ? item.price : null;
    const basePrice = typeof item?.base_price === "number" ? item.base_price : null;
    const effectivePrice = price ?? basePrice;
    if (effectivePrice === null || Number(effectivePrice) <= 0) continue;
    result.push(transformProductFromApi(item));
  }
  // Расставляем варианты одного товара вразброс, чтобы они не шли подряд
  return spreadProductVariants(result);
};/**
 * Размешивает варианты одного товара (одинаковый product_id), чтобы они не шли подряд.
 * Round-robin по группам product_id: сначала по одному из каждой группы, затем вторые и т.д.
 * Так на маркетплейсе в сетке не будет трёх браслетов подряд (серебро, золото, чёрный).
 */
export const spreadProductVariants = (products: Product[]): Product[] => {
  if (!Array.isArray(products) || products.length <= 1) return products;
  const byProductId = new Map<string, Product[]>();
  for (const p of products) {
    const id = String(p?.product_id ?? "");
    if (!byProductId.has(id)) byProductId.set(id, []);
    byProductId.get(id)!.push(p);
  }
  const groups = Array.from(byProductId.values());
  if (groups.length <= 1) return products;
  const result: Product[] = [];
  let index = 0;
  let hasMore = true;
  while (hasMore) {
    hasMore = false;
    for (const group of groups) {
      if (index < group.length) {
        result.push(group[index]);
        hasMore = true;
      }
    }
    index += 1;
  }
  return result;
};