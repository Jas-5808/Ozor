import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import { resources } from './resources';

void i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    ns: ['translation'],
    defaultNS: 'translation',
    fallbackLng: 'ru',
    supportedLngs: Object.keys(resources),
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

export default i18n;

