import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import "./TelegramModal.css";

interface TelegramModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (phone: string, code: string) => void;
  loading?: boolean;
  phone: string;
}

export function TelegramModal({
  isOpen,
  onClose,
  onSubmit,
  loading = false,
  phone,
}: TelegramModalProps) {
  const [code, setCode] = useState("");
  const { t } = useTranslation();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (code.trim()) {
      onSubmit(phone, code.trim());
    }
  };

  const handleClose = () => {
    setCode("");
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="telegram-modal-overlay">
      <div className="telegram-modal" onClick={(e) => e.stopPropagation()}>
        <div className="telegram-modal-header">
          <h3>{t("auth.telegramModal.title")}</h3>
          <button className="telegram-modal-close" onClick={handleClose} aria-label={t("common.actions.close")}>
            ×
          </button>
        </div>

        <div className="telegram-modal-body">
          <p className="telegram-modal-description">
            {t("auth.telegramModal.description", { phone })}
          </p>

          <form onSubmit={handleSubmit} className="telegram-modal-form">
            <input
              type="text"
              placeholder={t("auth.telegramModal.codePlaceholder")}
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="telegram-modal-input"
              required
              disabled={loading}
            />

            <button
              type="submit"
              className="telegram-modal-submit"
              disabled={loading || !code.trim()}
            >
              {loading ? t("auth.telegramModal.submitting") : t("auth.telegramModal.submit")}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default TelegramModal;
