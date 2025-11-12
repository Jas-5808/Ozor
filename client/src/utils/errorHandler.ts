/**
 * Утилиты для обработки и логирования ошибок
 */

export interface ErrorInfo {
  message: string;
  code?: string;
  status?: number;
  timestamp: string;
  context?: Record<string, unknown>;
}

/**
 * Класс для обработки ошибок приложения
 */
export class AppError extends Error {
  code?: string;
  status?: number;
  context?: Record<string, unknown>;

  constructor(
    message: string,
    code?: string,
    status?: number,
    context?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.status = status;
    this.context = context;
    
    // Сохраняем правильный stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, AppError);
    }
  }

  toJSON(): ErrorInfo {
    return {
      message: this.message,
      code: this.code,
      status: this.status,
      timestamp: new Date().toISOString(),
      context: this.context,
    };
  }
}

/**
 * Обработка ошибок API
 */
export function handleApiError(error: unknown): AppError {
  if (error instanceof AppError) {
    return error;
  }

  if (error && typeof error === 'object' && 'response' in error) {
    const apiError = error as { response?: { status?: number; data?: { message?: string } } };
    const status = apiError.response?.status;
    const message = apiError.response?.data?.message || 'Ошибка при выполнении запроса';
    
    return new AppError(message, 'API_ERROR', status, { originalError: error });
  }

  if (error instanceof Error) {
    return new AppError(error.message, 'UNKNOWN_ERROR', undefined, { originalError: error });
  }

  return new AppError('Произошла неизвестная ошибка', 'UNKNOWN_ERROR');
}

/**
 * Логирование ошибок (можно расширить для отправки в систему мониторинга)
 */
export function logError(error: Error | AppError, context?: Record<string, unknown>): void {
  const errorInfo: ErrorInfo = {
    message: error.message,
    timestamp: new Date().toISOString(),
    context: {
      ...(error instanceof AppError ? error.context : {}),
      ...context,
      stack: error.stack,
    },
  };

  if (error instanceof AppError) {
    errorInfo.code = error.code;
    errorInfo.status = error.status;
  }

  // В режиме разработки выводим в консоль
  if (import.meta.env.DEV) {
    console.error('Error logged:', errorInfo);
  }

  // В продакшене можно отправить в систему мониторинга (Sentry, etc.)
  if (import.meta.env.PROD) {
    // reportErrorToMonitoring(errorInfo);
  }
}

/**
 * Создание пользовательского сообщения об ошибке
 */
export function getUserFriendlyMessage(error: Error | AppError): string {
  if (error instanceof AppError) {
    // Можно добавить маппинг кодов ошибок на пользовательские сообщения
    const errorMessages: Record<string, string> = {
      API_ERROR: 'Ошибка при загрузке данных. Пожалуйста, попробуйте позже.',
      NETWORK_ERROR: 'Проблемы с подключением к интернету. Проверьте соединение.',
      AUTH_ERROR: 'Ошибка авторизации. Пожалуйста, войдите снова.',
      VALIDATION_ERROR: 'Проверьте правильность введенных данных.',
      UNKNOWN_ERROR: 'Произошла ошибка. Пожалуйста, попробуйте позже.',
    };

    return errorMessages[error.code || ''] || error.message || 'Произошла ошибка';
  }

  return error.message || 'Произошла неизвестная ошибка';
}

/**
 * Валидация и обработка ошибок валидации
 */
export class ValidationError extends AppError {
  fields?: Record<string, string[]>;

  constructor(
    message: string,
    fields?: Record<string, string[]>
  ) {
    super(message, 'VALIDATION_ERROR', 400);
    this.name = 'ValidationError';
    this.fields = fields;
  }
}

/**
 * Обработка сетевых ошибок
 */
export function isNetworkError(error: unknown): boolean {
  if (error && typeof error === 'object' && 'message' in error) {
    const message = String((error as { message: string }).message).toLowerCase();
    return message.includes('network') || 
           message.includes('fetch') || 
           message.includes('connection');
  }
  return false;
}

/**
 * Retry механизм для обработки временных ошибок
 */
export async function retryOperation<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  delay: number = 1000
): Promise<T> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      
      // Не повторяем для определенных типов ошибок
      if (error instanceof AppError && error.status && error.status >= 400 && error.status < 500) {
        throw error;
      }

      if (attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, delay * attempt));
      }
    }
  }

  throw handleApiError(lastError);
}

