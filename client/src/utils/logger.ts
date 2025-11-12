/**
 * Утилита для логирования с поддержкой уровней и фильтрации
 * Заменяет console.log для лучшего контроля в продакшене
 */

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  NONE = 4,
}

interface LoggerConfig {
  level: LogLevel;
  enableInProduction: boolean;
  prefix?: string;
}

class Logger {
  private config: LoggerConfig;

  constructor(config: LoggerConfig = {
    level: import.meta.env.DEV ? LogLevel.DEBUG : LogLevel.ERROR,
    enableInProduction: false,
    prefix: '[OZAR]',
  }) {
    this.config = config;
  }

  private shouldLog(level: LogLevel): boolean {
    if (import.meta.env.PROD && !this.config.enableInProduction) {
      return level >= LogLevel.ERROR;
    }
    return level >= this.config.level;
  }

  private formatMessage(level: string, ...args: unknown[]): unknown[] {
    const prefix = this.config.prefix ? `${this.config.prefix} [${level}]` : `[${level}]`;
    return [prefix, ...args];
  }

  debug(...args: unknown[]): void {
    if (this.shouldLog(LogLevel.DEBUG)) {
      console.debug(...this.formatMessage('DEBUG', ...args));
    }
  }

  info(...args: unknown[]): void {
    if (this.shouldLog(LogLevel.INFO)) {
      console.info(...this.formatMessage('INFO', ...args));
    }
  }

  warn(...args: unknown[]): void {
    if (this.shouldLog(LogLevel.WARN)) {
      console.warn(...this.formatMessage('WARN', ...args));
    }
  }

  error(...args: unknown[]): void {
    if (this.shouldLog(LogLevel.ERROR)) {
      console.error(...this.formatMessage('ERROR', ...args));
    }
  }

  /**
   * Логирование API запросов
   */
  api(method: string, url: string, data?: unknown): void {
    if (this.shouldLog(LogLevel.DEBUG)) {
      console.log(
        ...this.formatMessage('API', `${method.toUpperCase()} ${url}`),
        data ? { data } : ''
      );
    }
  }

  /**
   * Логирование API ответов
   */
  apiResponse(status: number, url: string, data?: unknown): void {
    if (this.shouldLog(LogLevel.DEBUG)) {
      const level = status >= 400 ? LogLevel.ERROR : LogLevel.DEBUG;
      const method = level === LogLevel.ERROR ? 'error' : 'log';
      console[method](
        ...this.formatMessage('API', `${status} ${url}`),
        data ? { data } : ''
      );
    }
  }

  /**
   * Логирование ошибок с контекстом
   */
  errorWithContext(error: Error | unknown, context?: Record<string, unknown>): void {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;

    console.error(
      ...this.formatMessage('ERROR', errorMessage),
      {
        ...context,
        stack: errorStack,
        timestamp: new Date().toISOString(),
      }
    );

    // В продакшене можно отправить в систему мониторинга
    if (import.meta.env.PROD) {
      // reportErrorToMonitoring(error, context);
    }
  }

  /**
   * Группировка логов
   */
  group(label: string, collapsed = false): void {
    if (this.shouldLog(LogLevel.DEBUG)) {
      if (collapsed) {
        console.groupCollapsed(label);
      } else {
        console.group(label);
      }
    }
  }

  groupEnd(): void {
    if (this.shouldLog(LogLevel.DEBUG)) {
      console.groupEnd();
    }
  }

  /**
   * Таблица для структурированных данных
   */
  table(data: unknown): void {
    if (this.shouldLog(LogLevel.DEBUG)) {
      console.table(data);
    }
  }
}

// Экспортируем singleton instance
export const logger = new Logger();

// Экспортируем класс для создания кастомных логгеров
export default Logger;

