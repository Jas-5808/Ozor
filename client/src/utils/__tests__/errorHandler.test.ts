import { describe, it, expect, vi } from 'vitest';
import {
  AppError,
  handleApiError,
  logError,
  getUserFriendlyMessage,
  ValidationError,
  isNetworkError,
  retryOperation,
} from '../errorHandler';

describe('errorHandler', () => {
  describe('AppError', () => {
    it('should create error with message', () => {
      const error = new AppError('Test error');
      expect(error.message).toBe('Test error');
      expect(error.name).toBe('AppError');
    });

    it('should create error with code and status', () => {
      const error = new AppError('Test error', 'TEST_CODE', 404);
      expect(error.code).toBe('TEST_CODE');
      expect(error.status).toBe(404);
    });

    it('should serialize to JSON', () => {
      const error = new AppError('Test error', 'TEST_CODE', 404, { key: 'value' });
      const json = error.toJSON();
      expect(json.message).toBe('Test error');
      expect(json.code).toBe('TEST_CODE');
      expect(json.status).toBe(404);
      expect(json.context).toEqual({ key: 'value' });
      expect(json.timestamp).toBeDefined();
    });
  });

  describe('handleApiError', () => {
    it('should handle AppError', () => {
      const error = new AppError('Test error');
      const handled = handleApiError(error);
      expect(handled).toBe(error);
    });

    it('should handle API error with response', () => {
      const apiError = {
        response: {
          status: 404,
          data: { message: 'Not found' },
        },
      };
      const handled = handleApiError(apiError);
      expect(handled.message).toBe('Not found');
      expect(handled.status).toBe(404);
      expect(handled.code).toBe('API_ERROR');
    });

    it('should handle Error instance', () => {
      const error = new Error('Test error');
      const handled = handleApiError(error);
      expect(handled.message).toBe('Test error');
      expect(handled.code).toBe('UNKNOWN_ERROR');
    });

    it('should handle unknown error', () => {
      const handled = handleApiError('string error');
      expect(handled.message).toBe('Произошла неизвестная ошибка');
      expect(handled.code).toBe('UNKNOWN_ERROR');
    });
  });

  describe('getUserFriendlyMessage', () => {
    it('should return user-friendly message for known codes', () => {
      const error = new AppError('API error', 'API_ERROR');
      const message = getUserFriendlyMessage(error);
      expect(message).toBe('Ошибка при загрузке данных. Пожалуйста, попробуйте позже.');
    });

    it('should return error message for unknown codes', () => {
      const error = new AppError('Custom error', 'CUSTOM_CODE');
      const message = getUserFriendlyMessage(error);
      expect(message).toBe('Custom error');
    });

    it('should handle regular Error', () => {
      const error = new Error('Regular error');
      const message = getUserFriendlyMessage(error);
      expect(message).toBe('Regular error');
    });
  });

  describe('ValidationError', () => {
    it('should create validation error', () => {
      const error = new ValidationError('Validation failed', {
        email: ['Invalid email'],
      });
      expect(error.message).toBe('Validation failed');
      expect(error.code).toBe('VALIDATION_ERROR');
      expect(error.status).toBe(400);
      expect(error.fields).toEqual({ email: ['Invalid email'] });
    });
  });

  describe('isNetworkError', () => {
    it('should detect network error', () => {
      const error = { message: 'Network request failed' };
      expect(isNetworkError(error)).toBe(true);
    });

    it('should detect fetch error', () => {
      const error = { message: 'Failed to fetch' };
      expect(isNetworkError(error)).toBe(true);
    });

    it('should return false for non-network errors', () => {
      const error = { message: 'Validation error' };
      expect(isNetworkError(error)).toBe(false);
    });
  });

  describe('retryOperation', () => {
    it('should retry on failure', async () => {
      let attempts = 0;
      const operation = vi.fn(async () => {
        attempts++;
        if (attempts < 2) {
          throw new Error('Temporary error');
        }
        return 'success';
      });

      const result = await retryOperation(operation, 3, 10);
      expect(result).toBe('success');
      expect(attempts).toBe(2);
    });

    it('should throw after max retries', async () => {
      const operation = vi.fn(async () => {
        throw new Error('Persistent error');
      });

      await expect(retryOperation(operation, 2, 10)).rejects.toThrow();
      expect(operation).toHaveBeenCalledTimes(2);
    });

    it('should not retry on 4xx errors', async () => {
      const operation = vi.fn(async () => {
        throw new AppError('Not found', 'API_ERROR', 404);
      });

      await expect(retryOperation(operation, 3, 10)).rejects.toThrow();
      expect(operation).toHaveBeenCalledTimes(1);
    });
  });
});

