import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import cn from "./style.module.scss";
import { useAuth } from "../hooks/useAuth";
import TelegramModal from "../components/TelegramModal";
import PasswordModal from "../components/PasswordModal";
import PhoneInput from "../components/forms/PhoneInput";
import { authAPI } from "../services/api";

export function Registration() {
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
    <div className="container">
      <div className={cn.regist_content}>
        <h2 className={cn.title}>Регистрация</h2>
        <p className={cn.subtitle}>
          Введите номер телефона и пароль для создания аккаунта
        </p>

        {error && <div className={cn.error_message}>{error}</div>}

        <form onSubmit={handleSubmit} className={cn.form}>
          <PhoneInput
            placeholder="+998 (99) 123 45 67"
            value={phone}
            onChange={setPhone}
            onValidChange={handlePhoneChange}
            className={cn.input}
            required
          />
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
            Уже есть аккаунт? <Link to="/login">Войти</Link>
          </p>
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
