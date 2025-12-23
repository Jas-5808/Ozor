import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Минимальные переводы для первого рендера (чтобы UI не показывал ключи),
// полный словарь подгружаем динамически (resources.ts большой и не должен блокировать старт).
const minimalResources = {
  ru: {
    translation: {
      common: {
        appName: 'OZAR',
        loading: 'Загрузка…',
        actions: {
          close: 'Закрыть',
          searchPlaceholder: 'Искать товары и категории',
          retry: 'Попробовать снова',
          loadMore: 'Загрузить ещё',
        },
        navigation: {
          home: 'Главная',
          catalog: 'Каталог',
          cart: 'Корзина',
          favorites: 'Избранное',
          profile: 'Профиль',
        },
        status: {
          inStock: 'В наличии',
          outOfStock: 'Нет в наличии',
        },
        errors: {
          productsLoad: 'Не удалось загрузить товары',
        },
      },
      home: {
        seoTitle: 'OZAR',
        seoDescription: 'OZAR — интернет-магазин',
      },
      slider: {
        bannerAlt: 'Баннер',
        goTo: 'Перейти к слайду {{index}}',
      },
      search: {
        title: 'Поиск',
        error: 'Ошибка поиска',
        loading: 'Загрузка…',
        loadMore: 'Загрузить ещё',
      },
      profile: {
        seoTitle: 'Профиль',
      },
    },
  },
  uz: {
    translation: {
      common: {
        appName: 'OZAR',
        loading: 'Yuklanmoqda…',
        actions: {
          close: 'Yopish',
          searchPlaceholder: 'Mahsulot va kategoriyalarni qidirish',
          retry: 'Qayta urinib ko‘rish',
          loadMore: 'Yana yuklash',
        },
        navigation: {
          home: 'Bosh sahifa',
          catalog: 'Katalog',
          cart: 'Savat',
          favorites: 'Sevimlilar',
          profile: 'Profil',
        },
        status: {
          inStock: 'Mavjud',
          outOfStock: 'Mavjud emas',
        },
        errors: {
          productsLoad: 'Mahsulotlarni yuklab bo‘lmadi',
        },
      },
      home: {
        seoTitle: 'OZAR',
        seoDescription: 'OZAR — internet do‘kon',
      },
      slider: {
        bannerAlt: 'Banner',
        goTo: '{{index}}-slaydga o‘tish',
      },
      search: {
        title: 'Qidiruv',
        error: 'Qidiruv xatosi',
        loading: 'Yuklanmoqda…',
        loadMore: 'Yana yuklash',
      },
      profile: {
        seoTitle: 'Profil',
      },
    },
  },
} as const;

const SUPPORTED_LANGS = ['ru', 'uz'] as const;

let fullResourcesLoaded = false;
let fullResourcesPromise: Promise<void> | null = null;

async function ensureFullResourcesLoaded() {
  if (fullResourcesLoaded) return;
  if (fullResourcesPromise) return fullResourcesPromise;
  fullResourcesPromise = import('./resources')
    .then((m) => {
      const resources = (m as any)?.resources || {};
      Object.keys(resources).forEach((lng) => {
        const bundle = resources[lng]?.translation;
        if (bundle) {
          i18n.addResourceBundle(lng, 'translation', bundle, true, true);
        }
      });
      fullResourcesLoaded = true;
    })
    .catch(() => {
      // Если не загрузилось — работаем на минимальном словаре
    });
  return fullResourcesPromise;
}

void i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    ns: ['translation'],
    defaultNS: 'translation',
    fallbackLng: 'ru',
    resources: minimalResources as any,
    supportedLngs: [...SUPPORTED_LANGS],
    detection: {
      order: ['localStorage', 'querystring', 'navigator', 'htmlTag'],
      caches: ['localStorage'],
      lookupQuerystring: 'lang',
      lookupLocalStorage: 'app_language',
    },
    interpolation: {
      escapeValue: false,
    },
    returnNull: false,
  });

const applyHtmlLang = (lng?: string) => {
  if (typeof document !== 'undefined' && lng) {
    document.documentElement.lang = lng;
  }
};

applyHtmlLang(i18n.language);
i18n.on('languageChanged', applyHtmlLang);

// Догружаем полный словарь на фоне (снимает 200KB+ из стартового бандла)
void ensureFullResourcesLoaded();

export default i18n;

