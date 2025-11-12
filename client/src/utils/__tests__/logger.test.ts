import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { logger, LogLevel } from '../logger';

describe('logger', () => {
  const originalEnv = import.meta.env;
  const consoleSpy = {
    debug: vi.spyOn(console, 'debug').mockImplementation(() => {}),
    info: vi.spyOn(console, 'info').mockImplementation(() => {}),
    warn: vi.spyOn(console, 'warn').mockImplementation(() => {}),
    error: vi.spyOn(console, 'error').mockImplementation(() => {}),
    log: vi.spyOn(console, 'log').mockImplementation(() => {}),
    group: vi.spyOn(console, 'group').mockImplementation(() => {}),
    groupCollapsed: vi.spyOn(console, 'groupCollapsed').mockImplementation(() => {}),
    groupEnd: vi.spyOn(console, 'groupEnd').mockImplementation(() => {}),
    table: vi.spyOn(console, 'table').mockImplementation(() => {}),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // @ts-ignore
    import.meta.env = { ...originalEnv, DEV: true };
  });

  afterEach(() => {
    vi.restoreAllMocks();
    // @ts-ignore
    import.meta.env = originalEnv;
  });

  it('should log debug messages in dev mode', () => {
    logger.debug('Test message');
    expect(consoleSpy.debug).toHaveBeenCalled();
  });

  it('should log info messages', () => {
    logger.info('Info message');
    expect(consoleSpy.info).toHaveBeenCalled();
  });

  it('should log warnings', () => {
    logger.warn('Warning message');
    expect(consoleSpy.warn).toHaveBeenCalled();
  });

  it('should log errors', () => {
    logger.error('Error message');
    expect(consoleSpy.error).toHaveBeenCalled();
  });

  it('should log API requests', () => {
    logger.api('GET', '/api/users', { userId: '123' });
    expect(consoleSpy.log).toHaveBeenCalled();
  });

  it('should log API responses', () => {
    logger.apiResponse(200, '/api/users', { data: [] });
    expect(consoleSpy.log).toHaveBeenCalled();
  });

  it('should log errors with context', () => {
    const error = new Error('Test error');
    logger.errorWithContext(error, { userId: '123' });
    expect(consoleSpy.error).toHaveBeenCalled();
  });

  it('should create groups', () => {
    logger.group('Test group');
    logger.groupEnd();
    expect(consoleSpy.group).toHaveBeenCalled();
    expect(consoleSpy.groupEnd).toHaveBeenCalled();
  });

  it('should create collapsed groups', () => {
    logger.group('Test group', true);
    expect(consoleSpy.groupCollapsed).toHaveBeenCalled();
  });

  it('should log tables', () => {
    logger.table({ key: 'value' });
    expect(consoleSpy.table).toHaveBeenCalled();
  });
});

