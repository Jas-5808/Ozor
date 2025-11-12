import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ErrorBoundary } from '../ErrorBoundary';

// Компонент, который выбрасывает ошибку
const ThrowError = ({ shouldThrow }: { shouldThrow: boolean }) => {
  if (shouldThrow) {
    throw new Error('Test error');
  }
  return <div>No error</div>;
};

describe('ErrorBoundary', () => {
  // Подавляем вывод ошибок в консоль во время тестов
  const originalError = console.error;
  beforeAll(() => {
    console.error = vi.fn();
  });

  afterAll(() => {
    console.error = originalError;
  });

  it('renders children when there is no error', () => {
    render(
      <ErrorBoundary>
        <div>Test content</div>
      </ErrorBoundary>
    );
    expect(screen.getByText('Test content')).toBeInTheDocument();
  });

  it('renders error UI when error occurs', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );
    expect(screen.getByText(/что-то пошло не так/i)).toBeInTheDocument();
    expect(screen.getByText(/попробуйте обновить страницу/i)).toBeInTheDocument();
  });

  it('shows error details in development mode', () => {
    const originalEnv = import.meta.env.DEV;
    // @ts-ignore
    import.meta.env.DEV = true;

    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    const detailsButton = screen.getByText(/детали ошибки/i);
    expect(detailsButton).toBeInTheDocument();

    // @ts-ignore
    import.meta.env.DEV = originalEnv;
  });

  it('renders custom fallback when provided', () => {
    const customFallback = <div>Custom error message</div>;
    render(
      <ErrorBoundary fallback={customFallback}>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );
    expect(screen.getByText('Custom error message')).toBeInTheDocument();
  });
});

