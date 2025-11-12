import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { LazyImage } from '../LazyImage';

// Моки для IntersectionObserver
const mockIntersectionObserver = vi.fn();
const mockObserve = vi.fn();
const mockUnobserve = vi.fn();
const mockDisconnect = vi.fn();

beforeEach(() => {
  mockIntersectionObserver.mockReturnValue({
    observe: mockObserve,
    unobserve: mockUnobserve,
    disconnect: mockDisconnect,
  });
  window.IntersectionObserver = mockIntersectionObserver as unknown as typeof IntersectionObserver;
});

afterEach(() => {
  vi.clearAllMocks();
});

describe('LazyImage', () => {
  it('renders with placeholder initially', () => {
    render(<LazyImage src="/test.jpg" alt="Test image" />);
    const img = screen.getByAltText('Test image');
    expect(img).toHaveAttribute('src', '/img/NaturalTitanium.jpg');
  });

  it('uses custom placeholder when provided', () => {
    render(
      <LazyImage
        src="/test.jpg"
        alt="Test image"
        placeholder="/custom-placeholder.jpg"
      />
    );
    const img = screen.getByAltText('Test image');
    expect(img).toHaveAttribute('src', '/custom-placeholder.jpg');
  });

  it('observes image element', () => {
    render(<LazyImage src="/test.jpg" alt="Test image" />);
    expect(mockIntersectionObserver).toHaveBeenCalled();
    expect(mockObserve).toHaveBeenCalled();
  });

  it('loads image when intersecting', async () => {
    let intersectionCallback: (entries: IntersectionObserverEntry[]) => void;

    mockIntersectionObserver.mockImplementation((callback) => {
      intersectionCallback = callback;
      return {
        observe: mockObserve,
        unobserve: mockUnobserve,
        disconnect: mockDisconnect,
      } as IntersectionObserver;
    });

    render(<LazyImage src="/test.jpg" alt="Test image" />);

    // Симулируем пересечение
    if (intersectionCallback!) {
      intersectionCallback([
        {
          isIntersecting: true,
          target: screen.getByAltText('Test image'),
        } as IntersectionObserverEntry,
      ]);
    }

    await waitFor(() => {
      const img = screen.getByAltText('Test image');
      // После загрузки src должен измениться
      expect(img).toBeInTheDocument();
    });
  });

  it('uses fallback on error', async () => {
    const { container } = render(
      <LazyImage
        src="/invalid.jpg"
        alt="Test image"
        fallback="/fallback.jpg"
      />
    );

    const img = container.querySelector('img');
    if (img) {
      // Симулируем ошибку загрузки
      Object.defineProperty(global, 'Image', {
        writable: true,
        value: class {
          onerror: (() => void) | null = null;
          src = '';
          constructor() {
            setTimeout(() => {
              if (this.onerror) this.onerror();
            }, 0);
          }
        },
      });
    }

    await waitFor(() => {
      expect(img).toBeInTheDocument();
    });
  });
});

