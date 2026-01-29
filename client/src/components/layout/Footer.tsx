import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

type FooterLink = { label: string; to: string; external?: boolean };

const FooterLinksColumn = ({
  title,
  links,
}: {
  title: string;
  links: FooterLink[];
}) => {
  return (
    <div className="space-y-3">
      <div className="text-sm font-extrabold tracking-wide text-slate-900">{title}</div>
      <ul className="space-y-2 text-sm text-slate-600">
        {links.map((l) => (
          <li key={`${l.to}-${l.label}`}>
            {l.external ? (
              <a
                href={l.to}
                target="_blank"
                rel="noreferrer"
                className="inline-flex hover:text-emerald-700 transition"
              >
                {l.label}
              </a>
            ) : (
              <Link to={l.to} className="inline-flex hover:text-emerald-700 transition">
                {l.label}
              </Link>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
};

export function Footer() {
  const { t } = useTranslation();
  const year = new Date().getFullYear();

  const catalogLinks: FooterLink[] = [
    { label: "Каталог", to: "/catalog" },
    { label: "Поиск", to: "/search" },
  ];

  const buyerLinks: FooterLink[] = [
    { label: "Корзина", to: "/cart" },
    { label: "Избранное", to: "/favorites" },
    { label: "Профиль", to: "/profile" },
  ];

  const authLinks: FooterLink[] = [
    { label: "Войти", to: "/login" },
    { label: "Регистрация", to: "/registration" },
  ];

  const helpLinks: FooterLink[] = [
    { label: "Telegram бот (поддержка)", to: "https://t.me/send_verifix_code_bot", external: true },
  ];

  return (
    <footer className="border-t border-slate-200 bg-white/70 backdrop-blur">
      <div className="container mx-auto px-4 py-10">
        <div className="grid gap-8 md:grid-cols-4">
          <div className="md:col-span-1">
            <Link to="/" className="inline-flex items-center gap-3">
              <img
                src="/img/logo.png"
                alt={t("common.appName") || "OZAR"}
                className="h-11 w-11 rounded-2xl object-cover ring-1 ring-slate-200"
                loading="lazy"
              />
              <div className="leading-tight">
                <div className="text-lg font-black text-slate-900">{t("common.appName") || "OZAR"}</div>
                <div className="text-xs font-semibold text-slate-500">Интернет‑магазин</div>
              </div>
            </Link>

            <p className="mt-4 text-sm text-slate-600">
              Покупайте товары онлайн, сохраняйте избранное и оформляйте заказы быстро.
            </p>

            <div className="mt-4 flex items-center gap-3">
              <a
                href="https://t.me/send_verifix_code_bot"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:border-emerald-300 hover:text-emerald-700 transition"
              >
                <img src="/icons/telegram.png" alt="Telegram" className="h-5 w-5" loading="lazy" />
                Telegram
              </a>
            </div>
          </div>

          <FooterLinksColumn title="Каталог" links={catalogLinks} />
          <FooterLinksColumn title="Покупателям" links={buyerLinks} />
          <FooterLinksColumn title="Аккаунт / Помощь" links={[...authLinks, ...helpLinks]} />
        </div>

        <div className="mt-10 flex flex-col gap-3 border-t border-slate-200 pt-6 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {year} {t("footer.rights") || "Все права защищены"}.
          </p>
          <div className="flex flex-wrap gap-x-4 gap-y-2">
            <Link to="/" className="hover:text-emerald-700 transition">
              Главная
            </Link>
            <Link to="/catalog" className="hover:text-emerald-700 transition">
              Каталог
            </Link>
            <Link to="/search" className="hover:text-emerald-700 transition">
              Поиск
            </Link>
            <a
              href="/user-agreement.pdf"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-emerald-700 transition"
            >
              {t("common.cart.agreementLink")}
            </a>
            <a
              href="/terms-and-definitions.pdf"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-emerald-700 transition"
            >
              {t("footer.termsAndDefinitions")}
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default Footer;