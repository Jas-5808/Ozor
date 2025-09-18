import React, { useState } from "react";
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
          <h3>Введите код из Telegram</h3>
          <button className="telegram-modal-close" onClick={handleClose}>
            ×
          </button>
        </div>

        <div className="telegram-modal-body">
          <p className="telegram-modal-description">
            Введите код, который вы получили от Telegram бота для номера {phone}
          </p>

          <form onSubmit={handleSubmit} className="telegram-modal-form">
            <input
              type="text"
              placeholder="Введите код"
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
              {loading ? "Проверка..." : "Подтвердить"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default TelegramModal;
