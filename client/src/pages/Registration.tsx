import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import cn from "./style.module.scss";
import { useAuth } from "../hooks/useAuth";
import PhoneInput from "../components/forms/PhoneInput";
import { authAPI } from "../services/api";
import useSEO from "../hooks/useSEO";

export function Registration() {
  const { t } = useTranslation();
  useSEO({
    title: t("auth.register.seoTitle"),
    robots: "noindex,nofollow",
    canonical: typeof window !== 'undefined' ? window.location.origin + '/registration' : undefined,
  });
  const [phone, setPhone] = useState("");
  const [cleanPhone, setCleanPhone] = useState("");
  const [isPhoneValid, setIsPhoneValid] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [telegramStep, setTelegramStep] = useState<"idle" | "code" | "password">("idle");
  const [telegramCode, setTelegramCode] = useState("");
  const [passwordInput, setPasswordInput] = useState("");
  const [confirmPasswordInput, setConfirmPasswordInput] = useState("");
  const [telegramLoading, setTelegramLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  const { signup, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  React.useEffect(() => {
    if (isAuthenticated) {
      navigate("/");
    }
  }, [isAuthenticated, navigate]);

  useEffect(() => {
    if (telegramStep !== "code") return;
    setResendCooldown(60);
  }, [telegramStep]);

  useEffect(() => {
    if (telegramStep !== "code") return;
    if (resendCooldown <= 0) return;
    const timer = window.setTimeout(() => {
      setResendCooldown((prev) => Math.max(prev - 1, 0));
    }, 1000);
    return () => window.clearTimeout(timer);
  }, [telegramStep, resendCooldown]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (passwordInput !== confirmPasswordInput) {
      setError(t("auth.register.errors.passwordMismatch"));
      return;
    }

    if (passwordInput.length < 4) {
      setError(t("auth.register.errors.passwordShort"));
      return;
    }

    setLoading(true);

    try {
      await signup(phone, passwordInput);
      navigate("/profile");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePhoneChange = (isValid: boolean, cleanValue: string) => {
    setIsPhoneValid(isValid);
    setCleanPhone(cleanValue);
  };

  const handleTelegramRegistration = async () => {
    if (!isPhoneValid || !cleanPhone) {
      setError(t("auth.register.errors.invalidPhone"));
      return;
    }

    setTelegramLoading(true);
    setError("");

    try {
      await authAPI.sendCode(cleanPhone);
      setTelegramCode("");
      setTelegramStep("code");
    } catch (err) {
      const detail = err?.response?.data?.detail;
      if (typeof detail === "string" && detail.toLowerCase().includes("code was already sent")) {
        setTelegramCode("");
        setTelegramStep("code");
        setError("");
      } else if (typeof detail === "string" && detail.toLowerCase().includes("user already exists")) {
        setError(t("auth.register.errors.userExists"));
      } else {
        setError(t("auth.register.errors.codeSend"));
      }
      console.error("Failed to send verification code:", err);
    } finally {
      setTelegramLoading(false);
    }
  };

  const handleTelegramCodeSubmit = async () => {
    if (!telegramCode.trim()) return;
    setTelegramLoading(true);
    setError("");

    try {
      await authAPI.verifyCode(cleanPhone, telegramCode.trim());
      setTelegramStep("password");
    } catch (err) {
      setError(t("auth.register.errors.codeInvalid"));
      console.error("Code verification error:", err);
    } finally {
      setTelegramLoading(false);
    }
  };

  const handleResendCode = async () => {
    if (resendCooldown > 0) return;
    if (!isPhoneValid || !cleanPhone) {
      setError(t("auth.register.errors.invalidPhone"));
      return;
    }
    setTelegramLoading(true);
    setError("");
    try {
      await authAPI.sendCode(cleanPhone);
      setResendCooldown(60);
    } catch (err) {
      const detail = err?.response?.data?.detail;
      if (typeof detail === "string" && detail.toLowerCase().includes("code was already sent")) {
        setTelegramCode("");
        setTelegramStep("code");
        setError("");
      } else if (typeof detail === "string" && detail.toLowerCase().includes("user already exists")) {
        setError(t("auth.register.errors.userExists"));
      } else {
        setError(t("auth.register.errors.codeSend"));
      }
      console.error("Failed to resend verification code:", err);
    } finally {
      setTelegramLoading(false);
    }
  };

  const handlePasswordSubmit = async () => {
    if (!passwordInput.trim() || !confirmPasswordInput.trim()) return;
    if (passwordInput !== confirmPasswordInput) {
      setError(t("auth.register.errors.passwordMismatch"));
      return;
    }
    if (passwordInput.length < 4) {
      setError(t("auth.register.errors.passwordShort"));
      return;
    }
    setTelegramLoading(true);
    setError("");

    try {
      await authAPI.signup(cleanPhone, passwordInput);
      await new Promise((resolve) => setTimeout(resolve, 1000));
      const response = await authAPI.signin(cleanPhone, passwordInput);

      if (response.data.access_token) {
        localStorage.setItem("access_token", response.data.access_token);
      }
      if (response.data.refresh_token) {
        localStorage.setItem("refresh_token", response.data.refresh_token);
      }

      setTelegramStep("idle");
      navigate("/profile");
    } catch (err: any) {
      // Проверяем, если это 409 ошибка с сообщением "record already exists"
      if (
        err.response &&
        err.response.status === 409 &&
        err.response.data?.detail?.includes("record already exists")
      ) {
        // Обрабатываем как успех и переходим на страницу обновления профиля
        try {
          const response = await authAPI.signin(cleanPhone, passwordInput);

          if (response.data.access_token) {
            localStorage.setItem("access_token", response.data.access_token);
          }
          if (response.data.refresh_token) {
            localStorage.setItem("refresh_token", response.data.refresh_token);
          }

          setTelegramStep("idle");
          navigate("/update-profile");
        } catch (signinErr) {
          setError(t("auth.register.errors.signin"));
          console.error("Auto sign-in error:", signinErr);
        }
      } else {
        setError(t("auth.register.errors.signup"));
        console.error("Failed to create account:", err);
      }
    } finally {
      setTelegramLoading(false);
    }
  };

  const handleResetTelegramStep = () => {
    setTelegramStep("idle");
    setTelegramCode("");
    setPasswordInput("");
    setConfirmPasswordInput("");
    setError("");
  };

  return (
    <div className={cn.registration_wrapper}>
      <div className={cn.registration_container}>
        {/* Левая часть с картинкой */}
        <div className={cn.registration_image_side}>
          <div className={cn.image_content}>
            <div className={cn.image_overlay}></div>
            <div className={cn.image_text}>
              <h1 className={cn.image_title}>{t("auth.register.heroTitle")}</h1>
              <p className={cn.image_subtitle}>
                {t("auth.register.heroSubtitle")}
              </p>
              <div className={cn.image_features}>
                {["fastDelivery", "securePayments", "exclusiveDeals"].map((feature) => (
                  <div key={feature} className={cn.feature_item}>
                    <svg className={cn.feature_icon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span>{t(`auth.register.features.${feature}`)}</span>
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
              <h2 className={cn.title}>
                {telegramStep === "code"
                  ? t("auth.telegramModal.title")
                  : telegramStep === "password"
                  ? t("auth.passwordModal.title")
                  : t("auth.register.formTitle")}
              </h2>
              <p className={cn.subtitle}>
                {telegramStep === "code"
                  ? t("auth.telegramModal.description", { phone: cleanPhone || phone })
                  : telegramStep === "password"
                  ? t("auth.passwordModal.description", { phone: cleanPhone || phone })
                  : t("auth.register.formSubtitle")}
              </p>
            </div>

            {error && <div className={cn.error_message}>{error}</div>}

            {telegramStep === "idle" && (
              <>
                <form onSubmit={handleSubmit} className={cn.form}>
                  <div className={cn.input_wrapper}>
                    <PhoneInput
                      placeholder={t("auth.common.phonePlaceholder")}
                      value={phone}
                      onChange={setPhone}
                      onValidChange={handlePhoneChange}
                      className={cn.input}
                      required
                    />
                  </div>
                </form>

                <div className={cn.socials}>
                  <button
                    className={`${cn.social_btn} ${cn.telegram}`}
                    onClick={handleTelegramRegistration}
                    disabled={loading || telegramLoading}
                  >
                    <img src="/icons/telegram.png" alt={t("auth.login.telegramAlt")} />
                    {telegramLoading
                      ? t("auth.register.telegramLoading")
                      : t("auth.register.telegramButton")}
                  </button>
                </div>
              </>
            )}

            {telegramStep === "code" && (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  void handleTelegramCodeSubmit();
                }}
                className={cn.form}
              >
                <div className={cn.input_wrapper}>
                  <input
                    type="text"
                    placeholder={t("auth.telegramModal.codePlaceholder")}
                    value={telegramCode}
                    onChange={(e) => setTelegramCode(e.target.value)}
                    className={cn.input}
                    required
                    disabled={telegramLoading}
                  />
                </div>
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span>
                    {resendCooldown > 0
                      ? t("auth.telegramModal.resendIn", { seconds: resendCooldown })
                      : t("auth.telegramModal.resend")}
                  </span>
                  <button
                    type="button"
                    onClick={() => void handleResendCode()}
                    disabled={telegramLoading || resendCooldown > 0}
                    className="font-semibold text-[#04734b] disabled:cursor-not-allowed disabled:text-slate-400"
                  >
                    {t("auth.telegramModal.resendButton")}
                  </button>
                </div>
                <div className={cn.button_row}>
                  <button
                    type="submit"
                    className={cn.btn_primary}
                    disabled={telegramLoading || !telegramCode.trim()}
                  >
                    {telegramLoading ? t("auth.telegramModal.submitting") : t("auth.telegramModal.submit")}
                  </button>
                </div>
              </form>
            )}

            {telegramStep === "password" && (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  void handlePasswordSubmit();
                }}
                className={cn.form}
              >
                <div className={cn.input_wrapper}>
                  <input
                    type="password"
                    placeholder={t("auth.passwordModal.passwordPlaceholder")}
                    value={passwordInput}
                    onChange={(e) => setPasswordInput(e.target.value)}
                    className={cn.input}
                    required
                    disabled={telegramLoading}
                  />
                </div>
                <div className={cn.input_wrapper}>
                  <input
                    type="password"
                    placeholder={t("auth.passwordModal.confirmPlaceholder")}
                    value={confirmPasswordInput}
                    onChange={(e) => setConfirmPasswordInput(e.target.value)}
                    className={cn.input}
                    required
                    disabled={telegramLoading}
                  />
                </div>
                <div className={cn.button_row}>
                  <button
                    type="submit"
                    className={cn.btn_primary}
                    disabled={telegramLoading || !passwordInput.trim() || !confirmPasswordInput.trim()}
                  >
                    {telegramLoading ? t("auth.passwordModal.submitting") : t("auth.passwordModal.submit")}
                  </button>
                </div>
              </form>
            )}

            <div className={cn.auth_links}>
              <p>
                {t("auth.register.hasAccount")}{" "}
                <Link to="/login" className={cn.auth_link}>
                  {t("auth.register.loginLink")}
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}

export default Registration;
