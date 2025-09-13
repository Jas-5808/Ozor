import React, { useState } from "react";
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

  const handleSubmit = (e: React.FormEvent) => {
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
          <h3>Создайте пароль</h3>
          <button className="telegram-modal-close" onClick={handleClose}>
            ×
          </button>
        </div>

        <div className="telegram-modal-body">
          <p className="telegram-modal-description">
            Создайте пароль для номера {phone}
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
            <input
              type="password"
              placeholder="Пароль (минимум 4 символа)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="telegram-modal-input"
              required
              disabled={loading}
            />

            <input
              type="password"
              placeholder="Подтвердите пароль"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="telegram-modal-input"
              required
              disabled={loading}
            />

            <button
              type="submit"
              className="telegram-modal-submit"
              disabled={loading || !password.trim() || !confirmPassword.trim()}
            >
              {loading ? "Создание аккаунта..." : "Создать аккаунт"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default PasswordModal;
