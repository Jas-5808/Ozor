import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useThrottle } from '../useThrottle';

describe('useThrottle', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should return initial value immediately', () => {
    const { result } = renderHook(() => useThrottle('test', 100));
    expect(result.current).toBe('test');
  });

  it('should throttle value changes', async () => {
    const { result, rerender } = renderHook(
      ({ value, limit }) => useThrottle(value, limit),
      {
        initialProps: { value: 'initial', limit: 100 },
      }
    );

    expect(result.current).toBe('initial');

    rerender({ value: 'updated', limit: 100 });
    expect(result.current).toBe('initial'); // Still initial

    vi.advanceTimersByTime(100);
    await waitFor(() => {
      expect(result.current).toBe('updated');
    });
  });

  it('should respect throttle limit', async () => {
    const { result, rerender } = renderHook(
      ({ value, limit }) => useThrottle(value, limit),
      {
        initialProps: { value: 'first', limit: 200 },
      }
    );

    rerender({ value: 'second', limit: 200 });
    vi.advanceTimersByTime(100);
    rerender({ value: 'third', limit: 200 });
    vi.advanceTimersByTime(100);

    expect(result.current).toBe('first'); // Still first

    vi.advanceTimersByTime(200);
    await waitFor(() => {
      expect(result.current).toBe('third');
    });
  });
});

