import React, { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import cn from "./style.module.scss";
import { useAuth } from "../hooks/useAuth";
import PhoneInput from "../components/forms/PhoneInput";
import useSEO from "../hooks/useSEO";
export function Login() {
  useSEO({
    title: "Kirish — OZOR",
    robots: "noindex,nofollow",
    canonical: typeof window !== 'undefined' ? window.location.origin + '/login' : undefined,
  });
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { signin, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as any)?.from || "/profile";
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
      console.log('Отправляем данные:', { phone: normalizedPhone, password });
      await signin(normalizedPhone, password);
      navigate(from, { replace: true });
    } catch (err) {
      console.error('Ошибка входа:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };
  const handleTelegramLogin = () => {
    console.log("Вход через Telegram");
  };
  return (
    <div className="container">
      <div className={cn.regist_content}>
        <h2 className={cn.title}>Вход в аккаунт</h2>
        <p className={cn.subtitle}>Введите номер телефона и пароль для входа</p>
        {error && (
          <div className={cn.error_message}>
            {error}
          </div>
        )}
        <form onSubmit={handleSubmit} className={cn.form}>
          <PhoneInput
            placeholder="+998 (99) 123 45 67"
            value={phone}
            onChange={setPhone}
            className={cn.input}
            required
          />
          <input
            type="password"
            placeholder="Пароль"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={cn.input}
            required
          />
          <button 
            type="submit" 
            className={cn.btn_primary}
            disabled={loading}
          >
            {loading ? 'Вход...' : 'Войти'}
          </button>
        </form>
        <div className={cn.divider}><span>или</span></div>
        <div className={cn.socials}>
          <button 
            className={`${cn.social_btn} ${cn.telegram}`}
            onClick={handleTelegramLogin}
            disabled={loading}
          >
            <img src="/icons/telegram.png" alt="Telegram" />
            Войти через Telegram
          </button>
        </div>
        <div className={cn.auth_links}>
          <p>Нет аккаунта? <Link to="/registration">Зарегистрироваться</Link></p>
        </div>
      </div>
    </div>
  );
}
export default Login;
