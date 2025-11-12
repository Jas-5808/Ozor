import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { useRef } from 'react';
import { useClickOutside } from '../useClickOutside';

const TestComponent = ({ onOutsideClick }: { onOutsideClick: () => void }) => {
  const ref = useRef<HTMLDivElement>(null);
  useClickOutside(ref, onOutsideClick);

  return (
    <div>
      <div ref={ref} data-testid="inside">
        Inside
      </div>
      <div data-testid="outside">Outside</div>
    </div>
  );
};

describe('useClickOutside', () => {
  it('should call handler when clicking outside', () => {
    const handleClick = vi.fn();
    render(<TestComponent onOutsideClick={handleClick} />);

    const outside = screen.getByTestId('outside');
    outside.click();

    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('should not call handler when clicking inside', () => {
    const handleClick = vi.fn();
    render(<TestComponent onOutsideClick={handleClick} />);

    const inside = screen.getByTestId('inside');
    inside.click();

    expect(handleClick).not.toHaveBeenCalled();
  });

  it('should handle touch events', () => {
    const handleClick = vi.fn();
    render(<TestComponent onOutsideClick={handleClick} />);

    const outside = screen.getByTestId('outside');
    const touchEvent = new TouchEvent('touchstart', { bubbles: true });
    outside.dispatchEvent(touchEvent);

    expect(handleClick).toHaveBeenCalledTimes(1);
  });
});

