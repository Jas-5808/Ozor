import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import cn from "./style.module.scss";
import { useAuth } from "../hooks/useAuth";

export function Registration() {
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const { signup, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  React.useEffect(() => {
    if (isAuthenticated) {
      navigate('/');
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
      navigate('/profile');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleTelegramRegistration = () => {
    console.log("Регистрация через Telegram");
  };

  return (
    <div className="container">
      <div className={cn.regist_content}>
        <h2 className={cn.title}>Регистрация</h2>
        <p className={cn.subtitle}>Введите номер телефона и пароль для создания аккаунта</p>

        {error && (
          <div className={cn.error_message}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className={cn.form}>
          <input
            type="tel"
            placeholder="+998 (__) ___-__-__"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className={cn.input}
            required
          />
          <input
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
          />
          <button 
            type="submit" 
            className={cn.btn_primary}
            disabled={loading}
          >
            {loading ? 'Регистрация...' : 'Зарегистрироваться'}
          </button>
        </form>

        <div className={cn.divider}><span>или</span></div>

        <div className={cn.socials}>
          <button 
            className={`${cn.social_btn} ${cn.telegram}`}
            onClick={handleTelegramRegistration}
            disabled={loading}
          >
            <img src="/icons/telegram.png" alt="Telegram" />
            Зарегистрироваться через Telegram
          </button>
        </div>

        <div className={cn.auth_links}>
          <p>Уже есть аккаунт? <Link to="/login">Войти</Link></p>
        </div>
      </div>
    </div>
  );
}

export default Registration;