import React, { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import cn from "./style.module.scss";
import { useAuth } from "../hooks/useAuth";
import PhoneInput from "../components/forms/PhoneInput";
import useSEO from "../hooks/useSEO";
import { logger } from "../utils/logger";
import { ROUTES, ERROR_MESSAGES } from "../constants";
import { handleApiError, getUserFriendlyMessage } from "../utils/errorHandler";
export function Login() {
  const { t } = useTranslation();
  useSEO({
    title: t("auth.login.seoTitle"),
    robots: "noindex,nofollow",
    canonical: typeof window !== 'undefined' ? window.location.origin + '/login' : undefined,
  });
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { signin, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from || ROUTES.PROFILE;
  React.useEffect(() => {
    if (isAuthenticated) {
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, navigate, from]);
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const normalizedPhone = '+' + phone.replace(/\D/g, '');
      logger.debug('Login attempt', { phone: normalizedPhone.substring(0, 4) + '***' });
      await signin(normalizedPhone, password);
      logger.info('Login successful');
      navigate(from, { replace: true });
    } catch (error) {
      const appError = handleApiError(error);
      const errorMessage = getUserFriendlyMessage(appError) || ERROR_MESSAGES.UNAUTHORIZED;
      setError(errorMessage);
      logger.errorWithContext(appError, { context: 'Login' });
    } finally {
      setLoading(false);
    }
  };
  return (
    <div className={cn.registration_wrapper}>
      <div className={cn.registration_container}>
        {/* Левая часть с картинкой */}
        <div className={cn.registration_image_side}>
          <div className={cn.image_content}>
            <div className={cn.image_overlay}></div>
            <div className={cn.image_text}>
              <h1 className={cn.image_title}>{t("auth.login.heroTitle")}</h1>
              <p className={cn.image_subtitle}>
                {t("auth.login.heroSubtitle")}
              </p>
              <div className={cn.image_features}>
                {["fastDelivery", "securePayments", "exclusiveDeals"].map((feature) => (
                  <div key={feature} className={cn.feature_item}>
                    <svg className={cn.feature_icon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span>{t(`auth.login.features.${feature}`)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Правая часть с формой */}
        <div className={cn.registration_form_side}>
          <div className={cn.regist_content}>
            <div className={cn.form_header}>
              <h2 className={cn.title}>{t("auth.login.formTitle")}</h2>
              <p className={cn.subtitle}>{t("auth.login.formSubtitle")}</p>
            </div>

            {error && <div className={cn.error_message}>{error}</div>}

            <form onSubmit={handleSubmit} className={cn.form}>
              <div className={cn.input_wrapper}>
                <PhoneInput
                  placeholder={t("auth.common.phonePlaceholder")}
                  value={phone}
                  onChange={setPhone}
                  className={cn.input}
                  required
                />
              </div>
              <div className={cn.input_wrapper}>
                <div className={cn.password_input_container}>
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder={t("auth.common.passwordPlaceholder")}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className={cn.input}
                    required
                  />
                  <button
                    type="button"
                    className={cn.password_toggle}
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? t("auth.common.hidePassword") : t("auth.common.showPassword")}
                  >
                    {showPassword ? (
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                        <line x1="1" y1="1" x2="23" y2="23"></line>
                      </svg>
                    ) : (
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                        <circle cx="12" cy="12" r="3"></circle>
                      </svg>
                    )}
                  </button>
                </div>
              </div>
              <button 
                type="submit" 
                className={cn.btn_primary}
                disabled={loading}
              >
                {loading ? t("auth.login.submitting") : t("auth.login.submit")}
              </button>
            </form>

            <div className={cn.auth_links}>
              <p>
                {t("auth.login.noAccount")}{" "}
                <Link to="/registration" className={cn.auth_link}>
                  {t("auth.login.registerLink")}
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
export default Login;
