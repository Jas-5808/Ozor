import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import cn from "./style.module.scss";
import { userAPI } from "../services/api";
import useSEO from "../hooks/useSEO";

const REGION_OPTIONS: Array<{ value: string; labelKey: string }> = [
  { value: "tashkent", labelKey: "profileUpdate.regions.tashkent" },
  { value: "tashkent_region", labelKey: "profileUpdate.regions.tashkentRegion" },
  { value: "samarkand", labelKey: "profileUpdate.regions.samarkand" },
  { value: "bukhara", labelKey: "profileUpdate.regions.bukhara" },
  { value: "andijan", labelKey: "profileUpdate.regions.andijan" },
  { value: "fergana", labelKey: "profileUpdate.regions.fergana" },
  { value: "namangan", labelKey: "profileUpdate.regions.namangan" },
  { value: "navoiy", labelKey: "profileUpdate.regions.navoiy" },
  { value: "kashkadarya", labelKey: "profileUpdate.regions.kashkadarya" },
  { value: "surkhandarya", labelKey: "profileUpdate.regions.surkhandarya" },
  { value: "sirdarya", labelKey: "profileUpdate.regions.sirdarya" },
  { value: "jizzakh", labelKey: "profileUpdate.regions.jizzakh" },
  { value: "khorezm", labelKey: "profileUpdate.regions.khorezm" },
  { value: "karakalpakstan", labelKey: "profileUpdate.regions.karakalpakstan" },
];

export function UpdateProfile() {
  const { t } = useTranslation();
  useSEO({
    title: t("profileUpdate.seoTitle"),
    robots: "noindex,nofollow",
    canonical:
      typeof window !== "undefined" ? window.location.origin + "/update-profile" : undefined,
  });
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

  const regionOptions = useMemo(
    () =>
      REGION_OPTIONS.map((opt) => ({
        value: opt.value,
        label: t(opt.labelKey),
      })),
    [t]
  );

  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (!token) {
      navigate("/login");
    }
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
      const updateData = {
        first_name: formData.first_name.trim() || "",
        last_name: formData.last_name.trim() || "",
        location: (region || formData.location).trim() || "",
        email: formData.email.trim() || "",
        bio: formData.bio.trim() || "",
      };

      await userAPI.updateProfile(updateData);
      setSuccess(true);

      setTimeout(() => {
        navigate("/");
      }, 2000);
    } catch (err: any) {
      // Ошибка будет обработана ниже через detail/message и показана в UI

      if (err.response?.data?.detail) {
        const details = err.response.data.detail;
        if (Array.isArray(details)) {
          const errorMessages = details
            .map((detail: any) => detail.msg)
            .join(", ");
          setError(t("profileUpdate.errors.validation", { message: errorMessages }));
        } else {
          setError(t("profileUpdate.errors.detail", { message: details }));
        }
      } else {
        setError(err.response?.data?.message || t("profileUpdate.errors.generic"));
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
              {t("profileUpdate.success.title")}
            </h2>
            <p>{t("profileUpdate.success.redirect")}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <div className={cn.regist_content}>
        <div
          style={{
            background: "linear-gradient(135deg, #eef2ff, #faf5ff)",
            border: "1px solid #e9d5ff",
            borderRadius: 16,
            padding: 20,
            width: "100%",
          }}
        >
          <h2 className={cn.title}>{t("profileUpdate.title")}</h2>
          <p className={cn.subtitle}>{t("profileUpdate.subtitle")}</p>

          {error && <div className={cn.error_message}>{error}</div>}

          <form onSubmit={handleSubmit} className={cn.form}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input
                type="text"
                name="first_name"
                placeholder={t("profileUpdate.placeholders.firstName")}
                value={formData.first_name}
                onChange={handleInputChange}
                className={cn.input}
              />
              <input
                type="text"
                name="last_name"
                placeholder={t("profileUpdate.placeholders.lastName")}
                value={formData.last_name}
                onChange={handleInputChange}
                className={cn.input}
              />
            </div>

            <input
              type="email"
              name="email"
              placeholder={t("profileUpdate.placeholders.email")}
              value={formData.email}
              onChange={handleInputChange}
              className={cn.input}
            />

            <select className={cn.input} value={region} onChange={(e) => setRegion(e.target.value)}>
              <option value="">{t("profileUpdate.placeholders.regionPlaceholder")}</option>
              {regionOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>

            <textarea
              name="bio"
              placeholder={t("profileUpdate.placeholders.bio")}
              value={formData.bio}
              onChange={handleInputChange}
              className={cn.textarea}
              rows={3}
            />

            <div className={cn.button_row}>
              <button type="submit" className={cn.btn_primary} disabled={loading}>
                {loading ? t("profileUpdate.buttons.saving") : t("profileUpdate.buttons.save")}
              </button>
              <button
                type="button"
                onClick={handleSkip}
                className={cn.btn_secondary}
                disabled={loading}
              >
                {t("profileUpdate.buttons.skip")}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
