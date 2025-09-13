import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import cn from "./style.module.css";
import { useAuth } from "../hooks/useAuth";
import TelegramModal from "../components/TelegramModal";
import PasswordModal from "../components/PasswordModal";
import { authAPI } from "../services/api";

export function Registration() {
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
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
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleTelegramRegistration = async () => {
    if (!phone) {
      setError("Введите номер телефона");
      return;
    }

    setTelegramLoading(true);
    setError("");

    try {
      // Отправляем код на сервер
      await authAPI.sendCode(phone);

      // Открываем модальное окно для ввода кода
      setIsTelegramModalOpen(true);

      // Перенаправляем на Telegram бота
      window.open("https://t.me/send_verifix_code_bot", "_blank");
    } catch (err) {
      setError("Ошибка при отправке кода. Попробуйте еще раз.");
      console.error("Ошибка отправки кода:", err);
    } finally {
      setTelegramLoading(false);
    }
  };

  const handleTelegramCodeSubmit = async (phone: string, code: string) => {
    setTelegramLoading(true);
    setError("");

    try {
      // Отправляем код на сервер для проверки
      await authAPI.verifyCode(phone, code);

      // Закрываем модальное окно с кодом
      setIsTelegramModalOpen(false);

      // Открываем модальное окно для ввода пароля
      setIsPasswordModalOpen(true);
    } catch (err) {
      setError("Неверный код. Попробуйте еще раз.");
      console.error("Ошибка проверки кода:", err);
    } finally {
      setTelegramLoading(false);
    }
  };

  const handlePasswordSubmit = async (phone: string, password: string) => {
    setTelegramLoading(true);
    setError("");

    try {
      // Регистрируем пользователя
      await authAPI.signup(phone, password);

      // Ждем 1 секунду
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Авторизуемся для получения токенов
      const response = await authAPI.signin(phone, password);

      // Сохраняем токены в localStorage
      // if (response.data.access_token) {
      //   localStorage.etItem("access_token", response.data.access_token);
      // }
      // if (response.data.refresh_token) {
      //   localStorage.etItem("refresh_token", response.data.refresh_token);
      // }

      // Закрываем модальное окно
      setIsPasswordModalOpen(false);

      // Перенаправляем на профиль
      navigate("/profile");
    } catch (err) {
      setError("Ошибка при создании аккаунта. Попробуйте еще раз.");
      console.error("Ошибка создания аккаунта:", err);
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
          <input
            type="tel"
            placeholder="+998 (__) ___-__-__"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
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
        phone={phone}
      />

      <PasswordModal
        isOpen={isPasswordModalOpen}
        onClose={handleClosePasswordModal}
        onSubmit={handlePasswordSubmit}
        loading={telegramLoading}
        phone={phone}
      />
    </div>
  );
}

export default Registration;
