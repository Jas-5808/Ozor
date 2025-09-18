import React, { useState, useEffect } from "react";

interface PhoneInputProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  placeholder?: string;
  required?: boolean;
}

export function PhoneInput({ value, onChange, className, placeholder, required }: PhoneInputProps) {
  const [displayValue, setDisplayValue] = useState("+998 ");

  useEffect(() => {
    // Инициализируем с +998 если значение пустое
    if (!value) {
      setDisplayValue("+998 ");
    } else {
      setDisplayValue(value);
    }
  }, [value]);

  const formatPhoneNumber = (input: string) => {
    // Удаляем все кроме цифр
    const numbers = input.replace(/\D/g, '');
    
    // Если начинается с 998, убираем его
    let cleanNumbers = numbers;
    if (numbers.startsWith('998')) {
      cleanNumbers = numbers.substring(3);
    }
    
    // Ограничиваем до 9 цифр (99 123 45 67)
    const limitedNumbers = cleanNumbers.substring(0, 9);
    
    // Форматируем: 99 123 45 67
    let formatted = "+998 ";
    if (limitedNumbers.length > 0) {
      formatted += limitedNumbers.substring(0, 2);
    }
    if (limitedNumbers.length > 2) {
      formatted += " " + limitedNumbers.substring(2, 5);
    }
    if (limitedNumbers.length > 5) {
      formatted += " " + limitedNumbers.substring(5, 7);
    }
    if (limitedNumbers.length > 7) {
      formatted += " " + limitedNumbers.substring(7, 9);
    }
    
    return formatted;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target.value;
    
    // Если пытаются удалить +998, не позволяем
    if (input.length < 6) { // +998 = 5 символов
      setDisplayValue("+998 ");
      onChange("+998 ");
      return;
    }
    
    // Если пытаются изменить +998, восстанавливаем
    if (!input.startsWith("+998 ")) {
      setDisplayValue("+998 ");
      onChange("+998 ");
      return;
    }
    
    const formatted = formatPhoneNumber(input);
    setDisplayValue(formatted);
    onChange(formatted);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Запрещаем удаление +998
    if (e.key === 'Backspace' && displayValue.length <= 6) {
      e.preventDefault();
    }
    
    // Запрещаем вставку в начало
    if (e.key === 'v' && e.ctrlKey) {
      e.preventDefault();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedText = e.clipboardData.getData('text');
    const formatted = formatPhoneNumber(pastedText);
    setDisplayValue(formatted);
    onChange(formatted);
  };

  return (
    <input
      type="tel"
      value={displayValue}
      onChange={handleChange}
      onKeyDown={handleKeyDown}
      onPaste={handlePaste}
      className={className}
      placeholder={placeholder}
      required={required}
      maxLength={18} // +998 99 123 45 67 = 18 символов
    />
  );
}

export default PhoneInput;
