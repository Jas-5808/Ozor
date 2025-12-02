import { Link, useRouteError } from "react-router-dom";
import { useTranslation } from "react-i18next";
import cn from "./style.module.scss";

export function ErrorPage() {
  const { t } = useTranslation();
  const error = useRouteError() as any;
  const status = (error && (error.status || error.statusCode)) || 404;
  const message =
    status === 404
      ? t("error.description")
      : error?.statusText || error?.message || t("error.generic");

  return (
    <div className={cn.not_found_screen}>
      <div className={cn.not_found_container}>
        <div className={cn.not_found_icon} aria-hidden="true">
          🧭
        </div>
        <h2 className={cn.not_found_title}>{t("error.title")}</h2>
        <p className={cn.not_found_message}>{message}</p>
        <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
          <button className={cn.back_button} onClick={() => window.history.back()}>
            {t("error.back")}
          </button>
          <Link to="/" className={cn.back_button}>
            {t("error.backHome")}
          </Link>
        </div>
      </div>
    </div>
  );
}