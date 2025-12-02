import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
// @ts-ignore
import s from '../AdminLayout.module.scss';

const LANG_OPTIONS = [
  { value: 'ru', label: 'RU' },
  { value: 'uz', label: 'UZ' },
] as const;

export default function AdminLanguageSwitcher() {
  const { i18n, t } = useTranslation();

  const current = useMemo(() => {
    return (i18n.language?.split('-')[0] || 'ru') as (typeof LANG_OPTIONS)[number]['value'];
  }, [i18n.language]);

  const handleChange = (value: string) => {
    void i18n.changeLanguage(value);
    if (typeof window !== 'undefined') {
      localStorage.setItem('app_language', value);
    }
  };

  return (
    <label className={s.langSwitch}>
      <select
        className={s.langSelect}
        value={current}
        onChange={(e) => handleChange(e.target.value)}
        aria-label={t('admin.toolbar.language')}
      >
        {LANG_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

