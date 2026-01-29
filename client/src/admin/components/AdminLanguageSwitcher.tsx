import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

const LANG_OPTIONS = [
  { value: 'ru', label: 'RU' },
  { value: 'uz', label: 'UZ' },
] as const;

const iconProps = {
  width: 20,
  height: 20,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.6,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
};

function GlobeIcon() {
  return (
    <svg {...iconProps} className="shrink-0" aria-hidden>
      <circle cx="12" cy="12" r="10" />
      <path d="M2 12h20" />
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </svg>
  );
}

export default function AdminLanguageSwitcher() {
  const { i18n, t } = useTranslation();

  const current = useMemo(() => {
    return (i18n.language?.split('-')[0] || 'ru') as (typeof LANG_OPTIONS)[number]['value'];
  }, [i18n.language]);

  const switchTo = (value: string) => {
    void i18n.changeLanguage(value);
    if (typeof window !== 'undefined') {
      localStorage.setItem('app_language', value);
    }
  };

  const toggle = () => switchTo(current === 'ru' ? 'uz' : 'ru');

  return (
    <button
      type="button"
      onClick={toggle}
      className="inline-flex items-center gap-2 h-10 rounded-xl border border-slate-400 bg-slate-200 pl-3 pr-3 hover:bg-slate-100 transition active:scale-[0.98]"
      style={{ color: '#0f172a' }}
      aria-label={t('admin.toolbar.language')}
      title={current === 'ru' ? 'UZ' : 'RU'}
    >
      <span className="shrink-0" style={{ color: '#1e293b' }}>
        <GlobeIcon />
      </span>
      <span className="text-sm font-bold tabular-nums">{current.toUpperCase()}</span>
    </button>
  );
}

