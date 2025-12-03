import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

type Option = {
  img: string;
  label: string;
  value: string;
  descriptionKey: string;
};

const LANGUAGE_OPTIONS: Option[] = [
  { value: "uz", label: "UZ", img: "/icons/uzb.png", descriptionKey: "common.languages.uz" },
  { value: "ru", label: "RU", img: "/icons/ru.png", descriptionKey: "common.languages.ru" },
];

type LanguageSwitcherProps = {
  variant?: 'desktop' | 'mobile';
};

export default function LanguageSwitcher({ variant = 'desktop' }: LanguageSwitcherProps) {
  const { i18n, t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);

  const selected = useMemo(() => {
    const current = i18n.language?.split("-")[0] || "ru";
    return (
      LANGUAGE_OPTIONS.find((option) => option.value === current) ?? LANGUAGE_OPTIONS[0]
    );
  }, [i18n.language]);

  const handleSelect = (option: Option) => {
    void i18n.changeLanguage(option.value);
    localStorage.setItem("app_language", option.value);
    setIsOpen(false);
  };

  const isMobile = variant === 'mobile';

  return (
    <div className="relative">
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        className={`flex items-center gap-1.5 h-8 px-2.5 md:px-3 rounded-lg cursor-pointer active:scale-[0.99] transition ${
          isMobile
            ? 'bg-gray-100 border border-gray-200 hover:bg-gray-200 text-gray-700'
            : 'bg-white/10 border border-white/10 backdrop-blur-md hover:bg-white/15 text-white'
        }`}
        onClick={() => setIsOpen((prev) => !prev)}
      >
        <img src={selected.img} alt={selected.value} className="h-3.5 w-5 object-contain" />
        <span className="text-xs font-medium">{selected.label}</span>
      </button>
      {isOpen && (
        <ul
          role="listbox"
          className={`absolute mt-2 w-48 rounded-xl overflow-hidden right-0 shadow-lg z-50 ${
            isMobile
              ? 'bg-white border border-gray-200'
              : 'bg-[#434344]/90 backdrop-blur-xl border border-white/10'
          }`}
        >
          <p className={`px-3 pt-2 pb-1 text-xs uppercase tracking-wide ${
            isMobile ? 'text-gray-500' : 'text-white/70'
          }`}>
            {t("common.actions.language")}
          </p>
          {LANGUAGE_OPTIONS.map((option) => (
            <li
              key={option.value}
              role="option"
              aria-selected={selected.value === option.value}
              className={`px-3 py-2 cursor-pointer flex items-center justify-between ${
                isMobile
                  ? 'hover:bg-gray-50 text-gray-900'
                  : 'hover:bg-white/10 text-white'
              }`}
              onClick={() => handleSelect(option)}
            >
              <span>{option.label}</span>
              <span className={isMobile ? 'text-gray-500' : 'text-white/70'}>
                {t(option.descriptionKey)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
