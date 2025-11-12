/**
 * Утилиты для санитизации пользовательского ввода
 * Защита от XSS атак
 */

/**
 * Экранирует HTML теги в строке
 */
export function escapeHtml(unsafe: string): string {
  if (typeof unsafe !== 'string') {
    return String(unsafe);
  }
  
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Удаляет все HTML теги из строки
 */
export function stripHtml(html: string): string {
  if (typeof html !== 'string') {
    return String(html);
  }
  
  const tmp = document.createElement('DIV');
  tmp.textContent = html;
  return tmp.textContent || tmp.innerText || '';
}

/**
 * Валидирует и санитизирует телефонный номер
 */
export function sanitizePhone(phone: string): string {
  if (typeof phone !== 'string') {
    return '';
  }
  
  // Удаляем все кроме цифр и знака +
  return phone.replace(/[^\d+]/g, '');
}

/**
 * Валидирует и санитизирует email
 */
export function sanitizeEmail(email: string): string {
  if (typeof email !== 'string') {
    return '';
  }
  
  // Базовая валидация email
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const trimmed = email.trim().toLowerCase();
  
  if (emailRegex.test(trimmed)) {
    return trimmed;
  }
  
  return '';
}

/**
 * Валидирует и санитизирует URL
 */
export function sanitizeUrl(url: string): string {
  if (typeof url !== 'string') {
    return '';
  }
  
  try {
    const parsed = new URL(url);
    // Разрешаем только http и https
    if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
      return parsed.toString();
    }
  } catch {
    // Невалидный URL
  }
  
  return '';
}

/**
 * Санитизирует объект, рекурсивно обрабатывая все строковые значения
 */
export function sanitizeObject<T extends Record<string, unknown>>(obj: T): T {
  const sanitized = { ...obj };
  
  for (const key in sanitized) {
    if (typeof sanitized[key] === 'string') {
      sanitized[key] = escapeHtml(sanitized[key] as string) as T[Extract<keyof T, string>];
    } else if (typeof sanitized[key] === 'object' && sanitized[key] !== null && !Array.isArray(sanitized[key])) {
      sanitized[key] = sanitizeObject(sanitized[key] as Record<string, unknown>) as T[Extract<keyof T, string>];
    } else if (Array.isArray(sanitized[key])) {
      sanitized[key] = (sanitized[key] as unknown[]).map(item => 
        typeof item === 'string' 
          ? escapeHtml(item) 
          : typeof item === 'object' && item !== null
          ? sanitizeObject(item as Record<string, unknown>)
          : item
      ) as T[Extract<keyof T, string>];
    }
  }
  
  return sanitized;
}

/**
 * Валидирует длину строки
 */
export function validateLength(str: string, min: number, max: number): boolean {
  if (typeof str !== 'string') {
    return false;
  }
  
  const length = str.trim().length;
  return length >= min && length <= max;
}

/**
 * Валидирует и санитизирует поисковый запрос
 */
export function sanitizeSearchQuery(query: string): string {
  if (typeof query !== 'string') {
    return '';
  }
  
  // Удаляем опасные символы, но оставляем пробелы и основные символы
  return query
    .trim()
    .replace(/[<>]/g, '')
    .slice(0, 200); // Ограничиваем длину
}

