import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import cn from "./style.module.css";
import { useAuth } from "../hooks/useAuth";
import TelegramModal from "../components/TelegramModal";
import { authAPI } from "../services/api";

export function Registration() {
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [isTelegramModalOpen, setIsTelegramModalOpen] = useState(false);
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

      // После успешной проверки кода
      navigate("/profile");
    } catch (err) {
      setError("Неверный код. Попробуйте еще раз.");
      console.error("Ошибка проверки кода:", err);
    } finally {
      setTelegramLoading(false);
    }
  };

  const handleCloseTelegramModal = () => {
    setIsTelegramModalOpen(false);
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
          {/* <input
            type="password"
            placeholder="Пароль (минимум 4 символа)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={cn.input}
            required
          />
          <input
            type="password"
            placeholder="Подтвердите пароль"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className={cn.input}
            required
          /> */}
          {/* <button 
            type="submit" 
            className={cn.btn_primary}
            disabled={loading}
          >
            {loading ? 'Регистрация...' : 'Зарегистрироваться'}
          </button> */}
        </form>

        {/* <div className={cn.divider}><span>или</span></div> */}

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
    </div>
  );
}

export default Registration;
