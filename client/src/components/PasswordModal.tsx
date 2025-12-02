import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import "./TelegramModal.css";

interface PasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (phone: string, password: string) => void;
  loading?: boolean;
  phone: string;
}

export function PasswordModal({
  isOpen,
  onClose,
  onSubmit,
  loading = false,
  phone,
}: PasswordModalProps) {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const { t } = useTranslation();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError(t("auth.register.errors.passwordMismatch"));
      return;
    }

    if (password.length < 4) {
      setError(t("auth.register.errors.passwordShort"));
      return;
    }

    onSubmit(phone, password);
  };

  const handleClose = () => {
    setPassword("");
    setConfirmPassword("");
    setError("");
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="telegram-modal-overlay">
      <div className="telegram-modal" onClick={(e) => e.stopPropagation()}>
        <div className="telegram-modal-header">
          <h3>{t("auth.passwordModal.title")}</h3>
          <button className="telegram-modal-close" onClick={handleClose} aria-label={t("common.actions.close")}>
            ×
          </button>
        </div>

        <div className="telegram-modal-body">
          <p className="telegram-modal-description">
            {t("auth.passwordModal.description", { phone })}
          </p>

          {error && (
            <div
              className="error-message"
              style={{ color: "red", marginBottom: "10px" }}
            >
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="telegram-modal-form">
            <div style={{ position: 'relative' }}>
              <input
                type={showPassword ? "text" : "password"}
                placeholder={t("auth.passwordModal.passwordPlaceholder")}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="telegram-modal-input"
                required
                disabled={loading}
                style={{ paddingRight: '45px' }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#718096',
                }}
                aria-label={showPassword ? t("auth.passwordModal.hidePassword") : t("auth.passwordModal.showPassword")}
              >
                {showPassword ? (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                    <line x1="1" y1="1" x2="23" y2="23"></line>
                  </svg>
                ) : (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                    <circle cx="12" cy="12" r="3"></circle>
                  </svg>
                )}
              </button>
            </div>

            <div style={{ position: 'relative' }}>
              <input
                type={showConfirmPassword ? "text" : "password"}
                placeholder={t("auth.passwordModal.confirmPlaceholder")}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="telegram-modal-input"
                required
                disabled={loading}
                style={{ paddingRight: '45px' }}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                style={{
                  position: 'absolute',
                  right: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#718096',
                }}
                aria-label={showConfirmPassword ? t("auth.passwordModal.hidePassword") : t("auth.passwordModal.showPassword")}
              >
                {showConfirmPassword ? (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                    <line x1="1" y1="1" x2="23" y2="23"></line>
                  </svg>
                ) : (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                    <circle cx="12" cy="12" r="3"></circle>
                  </svg>
                )}
              </button>
            </div>

            <button
              type="submit"
              className="telegram-modal-submit"
              disabled={loading || !password.trim() || !confirmPassword.trim()}
            >
              {loading ? t("auth.passwordModal.submitting") : t("auth.passwordModal.submit")}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default PasswordModal;
