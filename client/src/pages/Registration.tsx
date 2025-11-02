import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import cn from "./style.module.scss";
import { useAuth } from "../hooks/useAuth";
import TelegramModal from "../components/TelegramModal";
import PasswordModal from "../components/PasswordModal";
import PhoneInput from "../components/forms/PhoneInput";
import { authAPI } from "../services/api";
import useSEO from "../hooks/useSEO";

export function Registration() {
  useSEO({
    title: "Ro'yxatdan o'tish — OZAR",
    robots: "noindex,nofollow",
    canonical: typeof window !== 'undefined' ? window.location.origin + '/registration' : undefined,
  });
  const [phone, setPhone] = useState("");
  const [cleanPhone, setCleanPhone] = useState("");
  const [isPhoneValid, setIsPhoneValid] = useState(false);
  const [password] = useState("");
  const [confirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [isTelegramModalOpen, setIsTelegramModalOpen] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [telegramLoading, setTelegramLoading] = useState(false);

  const { signup, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  React.useEffect(() => {
    if (isAuthenticated) {
      navigate("/");
    }
  }, [isAuthenticated, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("Пароли не совпадают");
      return;
    }

    if (password.length < 4) {
      setError("Пароль должен содержать минимум 4 символа");
      return;
    }

    setLoading(true);

    try {
      await signup(phone, password);
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
      setError("Введите корректный номер телефона");
      return;
    }

    setTelegramLoading(true);
    setError("");

    try {
      await authAPI.sendCode(cleanPhone);
      setIsTelegramModalOpen(true);
      window.open("https://t.me/send_verifix_code_bot", "_blank");
    } catch (err) {
      setError("Ошибка при отправке кода. Попробуйте еще раз.");
      console.error("Ошибка отправки кода:", err);
    } finally {
      setTelegramLoading(false);
    }
  };

  const handleTelegramCodeSubmit = async (_phone: string, code: string) => {
    setTelegramLoading(true);
    setError("");

    try {
      await authAPI.verifyCode(cleanPhone, code);
      setIsTelegramModalOpen(false);
      setIsPasswordModalOpen(true);
    } catch (err) {
      setError("Неверный код. Попробуйте еще раз.");
      console.error("Ошибка проверки кода:", err);
    } finally {
      setTelegramLoading(false);
    }
  };

  const handlePasswordSubmit = async (_phone: string, password: string) => {
    setTelegramLoading(true);
    setError("");

    try {
      await authAPI.signup(cleanPhone, password);
      await new Promise((resolve) => setTimeout(resolve, 1000));
      const response = await authAPI.signin(cleanPhone, password);

      if (response.data.access_token) {
        localStorage.setItem("access_token", response.data.access_token);
      }
      if (response.data.refresh_token) {
        localStorage.setItem("refresh_token", response.data.refresh_token);
      }

      setIsPasswordModalOpen(false);
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
          const response = await authAPI.signin(cleanPhone, password);

          if (response.data.access_token) {
            localStorage.setItem("access_token", response.data.access_token);
          }
          if (response.data.refresh_token) {
            localStorage.setItem("refresh_token", response.data.refresh_token);
          }

          setIsPasswordModalOpen(false);
          navigate("/update-profile");
        } catch (signinErr) {
          setError("Ошибка при входе в аккаунт. Попробуйте еще раз.");
          console.error("Ошибка входа:", signinErr);
        }
      } else {
        setError("Ошибка при создании аккаунта. Попробуйте еще раз.");
        console.error("Ошибка создания аккаунта:", err);
      }
    } finally {
      setTelegramLoading(false);
    }
  };

  const handleCloseTelegramModal = () => {
    setIsTelegramModalOpen(false);
    setError("");
  };

  const handleClosePasswordModal = () => {
    setIsPasswordModalOpen(false);
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
              <h1 className={cn.image_title}>Добро пожаловать в OZAR</h1>
              <p className={cn.image_subtitle}>
                Присоединяйтесь к тысячам довольных покупателей и получайте лучшие предложения каждый день
              </p>
              <div className={cn.image_features}>
                <div className={cn.feature_item}>
                  <svg className={cn.feature_icon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>Быстрая доставка</span>
                </div>
                <div className={cn.feature_item}>
                  <svg className={cn.feature_icon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>Безопасные платежи</span>
                </div>
                <div className={cn.feature_item}>
                  <svg className={cn.feature_icon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>Эксклюзивные скидки</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Правая часть с формой */}
        <div className={cn.registration_form_side}>
          <div className={cn.regist_content}>
            <div className={cn.form_header}>
              <h2 className={cn.title}>Создать аккаунт</h2>
              <p className={cn.subtitle}>
                Зарегистрируйтесь, чтобы начать делать покупки
              </p>
            </div>

            {error && <div className={cn.error_message}>{error}</div>}

            <form onSubmit={handleSubmit} className={cn.form}>
              <div className={cn.input_wrapper}>
                <PhoneInput
                  placeholder="+998 (99) 123 45 67"
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
                <img src="/icons/telegram.png" alt="Telegram" />
                {telegramLoading
                  ? "Отправка кода..."
                  : "Зарегистрироваться через Telegram"}
              </button>
            </div>

            <div className={cn.auth_links}>
              <p>
                Уже есть аккаунт? <Link to="/login" className={cn.auth_link}>Войти</Link>
              </p>
            </div>
          </div>
        </div>
      </div>

      <TelegramModal
        isOpen={isTelegramModalOpen}
        onClose={handleCloseTelegramModal}
        onSubmit={handleTelegramCodeSubmit}
        loading={telegramLoading}
        phone={cleanPhone}
      />

      <PasswordModal
        isOpen={isPasswordModalOpen}
        onClose={handleClosePasswordModal}
        onSubmit={handlePasswordSubmit}
        loading={telegramLoading}
        phone={cleanPhone}
      />
    </div>
  );
}

export default Registration;
