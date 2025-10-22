import React, { useState, useEffect, useRef } from "react";

interface PhoneInputProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  placeholder?: string;
  required?: boolean;
}

export function PhoneInput({ value, onChange, className, placeholder, required }: PhoneInputProps) {
  const PREFIX = "+998 ";
  const [displayValue, setDisplayValue] = useState(PREFIX);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Инициализируем с +998  если значение пустое
    if (!value) {
      setDisplayValue(PREFIX);
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
    
    // Форматируем: +998 (99) 123 45 67
    let formatted = PREFIX; // +998 
    if (limitedNumbers.length > 0) {
      formatted += "(" + limitedNumbers.substring(0, 2);
    }
    if (limitedNumbers.length >= 2) {
      formatted += ") ";
    }
    if (limitedNumbers.length > 2) {
      formatted += limitedNumbers.substring(2, 5);
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
    
    // Если пытаются удалить "+998 ", не позволяем
    if (input.length < PREFIX.length) {
      setDisplayValue(PREFIX);
      onChange(PREFIX);
      return;
    }
    
    // Если пытаются изменить префикс, восстанавливаем
    if (!input.startsWith(PREFIX)) {
      setDisplayValue(PREFIX);
      onChange(PREFIX);
      return;
    }
    
    const formatted = formatPhoneNumber(input);
    setDisplayValue(formatted);
    onChange(formatted);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Запрещаем удаление "+998 "
    if (e.key === 'Backspace' && displayValue.length <= PREFIX.length) {
      e.preventDefault();
      return;
    }

    // Если курсор в конце и строка заканчивается на ") ", позволяем удалить цифру кода оператора
    if (e.key === 'Backspace' && inputRef.current) {
      const { selectionStart, selectionEnd } = inputRef.current;
      const caretAtEnd = selectionStart === selectionEnd && selectionStart === displayValue.length;
      if (caretAtEnd && displayValue.endsWith(") ")) {
        e.preventDefault();
        const numbers = displayValue.replace(/\D/g, '');
        const cleanNumbers = numbers.startsWith('998') ? numbers.substring(3) : numbers;
        if (cleanNumbers.length >= 1) {
          const nextInput = PREFIX + cleanNumbers.slice(0, cleanNumbers.length - 1);
          const formatted = formatPhoneNumber(nextInput);
          setDisplayValue(formatted);
          onChange(formatted);
        } else {
          setDisplayValue(PREFIX);
          onChange(PREFIX);
        }
      }
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
      ref={inputRef}
      value={displayValue}
      onChange={handleChange}
      onKeyDown={handleKeyDown}
      onPaste={handlePaste}
      className={className}
      placeholder={placeholder}
      required={required}
      maxLength={19} // +998 (99) 123 45 67 = 19 символов
    />
  );
}

export default PhoneInput;
