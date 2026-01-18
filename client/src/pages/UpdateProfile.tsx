import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
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
      <div className="min-h-screen bg-linear-to-br from-blue-50 via-white to-emerald-50 px-4 py-12">
        <div className="mx-auto max-w-lg rounded-[32px] border border-emerald-200 bg-white p-8 text-center shadow-[0_25px_60px_rgba(15,23,42,0.12)]">
          <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-2xl bg-emerald-100 text-emerald-700">
            ✓
          </div>
          <h2 className="text-2xl font-black text-emerald-800">{t("profileUpdate.success.title")}</h2>
          <p className="mt-2 text-sm text-slate-600">{t("profileUpdate.success.redirect")}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-blue-50 via-white to-emerald-50 py-10">
      <div className="container mx-auto px-4">
        <div className="mx-auto max-w-5xl">
          <div className="grid gap-6 lg:grid-cols-[1.1fr_1.4fr]">
            <aside className="rounded-[32px] bg-linear-to-br from-[#003d32] via-[#015a41] to-[#04734b] p-6 text-white shadow-[0_30px_70px_rgba(0,61,50,0.35)]">
              <p className="text-xs uppercase tracking-[0.4em] text-white/70">{t("profileUpdate.title")}</p>
              <h1 className="mt-3 text-3xl font-black">{t("profileUpdate.title")}</h1>
              <p className="mt-3 text-sm text-white/80">{t("profileUpdate.subtitle")}</p>
              <div className="mt-6 grid gap-2 text-sm text-white/80">
                <div className="flex items-center gap-2">
                  <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-white/15">•</span>
                  <span>{t("profileUpdate.placeholders.firstName")}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-white/15">•</span>
                  <span>{t("profileUpdate.placeholders.lastName")}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-white/15">•</span>
                  <span>{t("profileUpdate.placeholders.email")}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-white/15">•</span>
                  <span>{t("profileUpdate.placeholders.regionPlaceholder")}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-white/15">•</span>
                  <span>{t("profileUpdate.placeholders.bio")}</span>
                </div>
              </div>
            </aside>

            <div className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-[0_25px_70px_rgba(15,23,42,0.08)]">
              {error && (
                <div className="mb-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      {t("profileUpdate.placeholders.firstName")}
                    </label>
                    <input
                      type="text"
                      name="first_name"
                      placeholder={t("profileUpdate.placeholders.firstName")}
                      value={formData.first_name}
                      onChange={handleInputChange}
                      className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 placeholder:text-slate-400 focus:border-[#04734b] focus:outline-none focus:ring-2 focus:ring-[#04734b]/20"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      {t("profileUpdate.placeholders.lastName")}
                    </label>
                    <input
                      type="text"
                      name="last_name"
                      placeholder={t("profileUpdate.placeholders.lastName")}
                      value={formData.last_name}
                      onChange={handleInputChange}
                      className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 placeholder:text-slate-400 focus:border-[#04734b] focus:outline-none focus:ring-2 focus:ring-[#04734b]/20"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    {t("profileUpdate.placeholders.email")}
                  </label>
                  <input
                    type="email"
                    name="email"
                    placeholder={t("profileUpdate.placeholders.email")}
                    value={formData.email}
                    onChange={handleInputChange}
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 placeholder:text-slate-400 focus:border-[#04734b] focus:outline-none focus:ring-2 focus:ring-[#04734b]/20"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    {t("profileUpdate.placeholders.regionPlaceholder")}
                  </label>
                  <select
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 focus:border-[#04734b] focus:outline-none focus:ring-2 focus:ring-[#04734b]/20"
                    value={region}
                    onChange={(e) => setRegion(e.target.value)}
                  >
                    <option value="">{t("profileUpdate.placeholders.regionPlaceholder")}</option>
                    {regionOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    {t("profileUpdate.placeholders.bio")}
                  </label>
                  <textarea
                    name="bio"
                    placeholder={t("profileUpdate.placeholders.bio")}
                    value={formData.bio}
                    onChange={handleInputChange}
                    className="min-h-[110px] w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 placeholder:text-slate-400 focus:border-[#04734b] focus:outline-none focus:ring-2 focus:ring-[#04734b]/20"
                    rows={4}
                  />
                </div>

                <div className="flex flex-col gap-3 sm:flex-row">
                  <button
                    type="submit"
                    className="flex-1 rounded-2xl py-3 text-sm font-semibold uppercase tracking-wide text-white shadow-[0_18px_38px_rgba(6,78,59,0.35)] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
                    style={{ background: "linear-gradient(92.41deg, #003d32, #04734b)" }}
                    disabled={loading}
                  >
                    {loading ? t("profileUpdate.buttons.saving") : t("profileUpdate.buttons.save")}
                  </button>
                  <button
                    type="button"
                    onClick={handleSkip}
                    className="flex-1 rounded-2xl border border-slate-200 py-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                    disabled={loading}
                  >
                    {t("profileUpdate.buttons.skip")}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
