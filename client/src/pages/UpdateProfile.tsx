import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
// CSS module removed - using Tailwind utilities
import { userAPI } from "../services/api";

export function UpdateProfile() {
  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    email: "",
    bio: "",
    location: ""
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const navigate = useNavigate();

  useEffect(() => {
    // Проверяем, есть ли JWT токен
    const token = localStorage.getItem("access_token");
    if (!token) {
      navigate("/login");
    }
  }, [navigate]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      // Подготавливаем данные для отправки
      // Отправляем все поля, обязательные с пустыми строками если не заполнены
      const updateData = {
        first_name: formData.first_name.trim() || "",
        last_name: formData.last_name.trim() || "",
        location: formData.location.trim() || "",
        email: formData.email.trim() || "",
        bio: formData.bio.trim() || ""
      };

      console.log("Отправляем данные:", updateData);

      await userAPI.updateProfile(updateData);
      setSuccess(true);
      
      // Через 2 секунды перенаправляем на главную страницу
      setTimeout(() => {
        navigate("/");
      }, 2000);

    } catch (err: any) {
      console.error("Ошибка обновления профиля:", err);
      
      // Более детальная обработка ошибок
      if (err.response?.data?.detail) {
        const details = err.response.data.detail;
        if (Array.isArray(details)) {
          const errorMessages = details.map((detail: any) => detail.msg).join(", ");
          setError(`Ошибка валидации: ${errorMessages}`);
        } else {
          setError(`Ошибка: ${details}`);
        }
      } else {
        setError(err.response?.data?.message || "Ошибка при обновлении профиля");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = () => {
    navigate("/");
  };

  if (success) {
    return (
      <div className="container">
        <div className={cn.regist_content}>
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <h2 style={{ color: 'green', marginBottom: '20px' }}>Профиль успешно обновлен!</h2>
            <p>Перенаправление на главную страницу...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <div className={cn.regist_content}>
        <h2 className={cn.title}>Дополнительная информация</h2>
        <p className={cn.subtitle}>
          Заполните дополнительную информацию о себе (все поля необязательны)
        </p>

        {error && <div className={cn.error_message}>{error}</div>}

        <form onSubmit={handleSubmit} className={cn.form}>
          <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
            <input
              type="text"
              name="first_name"
              placeholder="Имя"
              value={formData.first_name}
              onChange={handleInputChange}
              className={cn.input}
            />
            <input
              type="text"
              name="last_name"
              placeholder="Фамилия"
              value={formData.last_name}
              onChange={handleInputChange}
              className={cn.input}
            />
          </div>

          <input
            type="email"
            name="email"
            placeholder="Email (необязательно)"
            value={formData.email}
            onChange={handleInputChange}
            className={cn.input}
            style={{ marginBottom: '15px' }}
          />

          <input
            type="text"
            name="location"
            placeholder="Местоположение"
            value={formData.location}
            onChange={handleInputChange}
            className={cn.input}
            style={{ marginBottom: '15px' }}
          />

          <textarea
            name="bio"
            placeholder="О себе (необязательно)"
            value={formData.bio}
            onChange={handleInputChange}
            className={cn.input}
            rows={3}
            style={{ marginBottom: '20px', resize: 'vertical' }}
          />

          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              type="submit"
              className={`${cn.social_btn} ${cn.telegram}`}
              disabled={loading}
              style={{ flex: 1 }}
            >
              {loading ? "Сохранение..." : "Сохранить"}
            </button>
            <button
              type="button"
              onClick={handleSkip}
              className={cn.social_btn}
              disabled={loading}
              style={{ flex: 1, backgroundColor: '#6c757d' }}
            >
              Пропустить
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}