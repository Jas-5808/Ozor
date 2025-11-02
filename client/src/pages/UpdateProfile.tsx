import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import cn from "./style.module.scss";
import { userAPI } from "../services/api";

export function UpdateProfile() {
  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    email: "",
    bio: "",
    location: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [region, setRegion] = useState<string>("");

  // ORDER_CITY (regions/city) with Uzbek labels
  const REGIONS_UZ: Array<{ value: string; label: string }> = [
    { value: "tashkent", label: "Toshkent" },
    { value: "tashkent_region", label: "Toshkent viloyati" },
    { value: "samarkand", label: "Samarqand" },
    { value: "bukhara", label: "Buxoro" },
    { value: "andijan", label: "Andijon" },
    { value: "fergana", label: "Farg'ona" },
    { value: "namangan", label: "Namangan" },
    { value: "navoiy", label: "Navoiy" },
    { value: "kashkadarya", label: "Qashqadaryo" },
    { value: "surkhandarya", label: "Surxondaryo" },
    { value: "sirdarya", label: "Sirdaryo" },
    { value: "jizzakh", label: "Jizzax" },
    { value: "khorezm", label: "Xorazm" },
    { value: "karakalpakstan", label: "Qoraqalpog'iston" },
  ];

  const navigate = useNavigate();

  useEffect(() => {
    // Проверяем, есть ли JWT токен
    const token = localStorage.getItem("access_token");
    if (!token) {
      navigate("/login");
    }
    // Инициализация региона из ранее сохранённой локации
    try {
      const saved = (formData.location || "").trim();
      if (saved) setRegion(saved);
    } catch {}
  }, [navigate]);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
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
        location: (region || formData.location).trim() || "",
        email: formData.email.trim() || "",
        bio: formData.bio.trim() || "",
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
          const errorMessages = details
            .map((detail: any) => detail.msg)
            .join(", ");
          setError(`Ошибка валидации: ${errorMessages}`);
        } else {
          setError(`Ошибка: ${details}`);
        }
      } else {
        setError(
          err.response?.data?.message || "Ошибка при обновлении профиля"
        );
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
          <div style={{ textAlign: "center", padding: "40px 0" }}>
            <h2 style={{ color: "green", marginBottom: "20px" }}>
              Профиль успешно обновлен!
            </h2>
            <p>Перенаправление на главную страницу...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <div className={cn.regist_content}>
        <div style={{
          background: 'linear-gradient(135deg, #eef2ff, #faf5ff)',
          border: '1px solid #e9d5ff',
          borderRadius: 16,
          padding: 20,
          width: '100%'
        }}>
          <h2 className={cn.title}>Profil ma'lumotlari</h2>
          <p className={cn.subtitle}>Qo'shimcha ma'lumotlarni kiriting (ixtiyoriy)</p>

          {error && <div className={cn.error_message}>{error}</div>}

          <form onSubmit={handleSubmit} className={cn.form}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input
                type="text"
                name="first_name"
                placeholder="Ism"
                value={formData.first_name}
                onChange={handleInputChange}
                className={cn.input}
              />
              <input
                type="text"
                name="last_name"
                placeholder="Familiya"
                value={formData.last_name}
                onChange={handleInputChange}
                className={cn.input}
              />
            </div>

            <input
              type="email"
              name="email"
              placeholder="Email (ixtiyoriy)"
              value={formData.email}
              onChange={handleInputChange}
              className={cn.input}
            />

            {/* Region only selector */}
            <select
              className={cn.input}
              value={region}
              onChange={(e)=> setRegion(e.target.value)}
            >
              <option value="">— Hududni tanlang —</option>
              {REGIONS_UZ.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>

            <textarea
              name="bio"
              placeholder="Qo'shimcha ma'lumot (ixtiyoriy)"
              value={formData.bio}
              onChange={handleInputChange}
              className={cn.textarea}
              rows={3}
            />

            <div className={cn.button_row}>
              <button type="submit" className={cn.btn_primary} disabled={loading}>
                {loading ? "Saqlanmoqda..." : "Saqlash"}
              </button>
              <button
                type="button"
                onClick={handleSkip}
                className={cn.btn_secondary}
                disabled={loading}
              >
                O'tkazib yuborish
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
