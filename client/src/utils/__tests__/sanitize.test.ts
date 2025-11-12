import { describe, it, expect } from 'vitest';
import {
  escapeHtml,
  stripHtml,
  sanitizePhone,
  sanitizeEmail,
  sanitizeUrl,
  sanitizeObject,
  validateLength,
  sanitizeSearchQuery,
} from '../sanitize';

describe('sanitize utilities', () => {
  describe('escapeHtml', () => {
    it('should escape HTML tags', () => {
      expect(escapeHtml('<script>alert("xss")</script>')).toBe(
        '&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;'
      );
    });

    it('should handle empty string', () => {
      expect(escapeHtml('')).toBe('');
    });

    it('should handle non-string input', () => {
      expect(escapeHtml(123 as unknown as string)).toBe('123');
    });
  });

  describe('stripHtml', () => {
    it('should remove HTML tags', () => {
      expect(stripHtml('<p>Hello</p>')).toBe('Hello');
    });

    it('should handle nested tags', () => {
      expect(stripHtml('<div><p>Test</p></div>')).toBe('Test');
    });
  });

  describe('sanitizePhone', () => {
    it('should remove non-digit characters except +', () => {
      expect(sanitizePhone('+998 90 123-45-67')).toBe('+998901234567');
    });

    it('should handle empty string', () => {
      expect(sanitizePhone('')).toBe('');
    });
  });

  describe('sanitizeEmail', () => {
    it('should validate and normalize valid email', () => {
      expect(sanitizeEmail('Test@Example.COM')).toBe('test@example.com');
    });

    it('should return empty string for invalid email', () => {
      expect(sanitizeEmail('invalid-email')).toBe('');
    });

    it('should handle empty string', () => {
      expect(sanitizeEmail('')).toBe('');
    });
  });

  describe('sanitizeUrl', () => {
    it('should validate http URL', () => {
      expect(sanitizeUrl('http://example.com')).toBe('http://example.com/');
    });

    it('should validate https URL', () => {
      expect(sanitizeUrl('https://example.com')).toBe('https://example.com/');
    });

    it('should return empty string for invalid URL', () => {
      expect(sanitizeUrl('not-a-url')).toBe('');
    });

    it('should reject non-http/https protocols', () => {
      expect(sanitizeUrl('javascript:alert(1)')).toBe('');
    });
  });

  describe('sanitizeObject', () => {
    it('should sanitize string values in object', () => {
      const obj = {
        name: '<script>alert("xss")</script>',
        age: 25,
      };
      const sanitized = sanitizeObject(obj);
      expect(sanitized.name).toBe('&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;');
      expect(sanitized.age).toBe(25);
    });

    it('should handle nested objects', () => {
      const obj = {
        user: {
          name: '<p>Test</p>',
        },
      };
      const sanitized = sanitizeObject(obj);
      expect(sanitized.user.name).toBe('&lt;p&gt;Test&lt;/p&gt;');
    });
  });

  describe('validateLength', () => {
    it('should return true for valid length', () => {
      expect(validateLength('test', 2, 10)).toBe(true);
    });

    it('should return false for too short string', () => {
      expect(validateLength('a', 2, 10)).toBe(false);
    });

    it('should return false for too long string', () => {
      expect(validateLength('a'.repeat(20), 2, 10)).toBe(false);
    });
  });

  describe('sanitizeSearchQuery', () => {
    it('should remove dangerous characters', () => {
      expect(sanitizeSearchQuery('<script>alert(1)</script>')).toBe('scriptalert(1)script');
    });

    it('should limit length to 200 characters', () => {
      const longQuery = 'a'.repeat(300);
      expect(sanitizeSearchQuery(longQuery).length).toBe(200);
    });

    it('should trim whitespace', () => {
      expect(sanitizeSearchQuery('  test  ')).toBe('test');
    });
  });
});

