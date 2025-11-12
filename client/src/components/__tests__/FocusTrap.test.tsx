import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FocusTrap } from '../FocusTrap';

describe('FocusTrap', () => {
  it('should trap focus within container', async () => {
    const user = userEvent.setup();
    render(
      <FocusTrap active={true}>
        <div>
          <button>First</button>
          <button>Second</button>
          <button>Third</button>
        </div>
      </FocusTrap>
    );

    const buttons = screen.getAllByRole('button');
    expect(buttons[0]).toHaveFocus();
  });

  it('should call onEscape when Escape is pressed', async () => {
    const user = userEvent.setup();
    const onEscape = vi.fn();
    
    render(
      <FocusTrap active={true} onEscape={onEscape}>
        <div>
          <button>Test</button>
        </div>
      </FocusTrap>
    );

    await user.keyboard('{Escape}');
    expect(onEscape).toHaveBeenCalledTimes(1);
  });

  it('should not trap focus when inactive', () => {
    render(
      <FocusTrap active={false}>
        <div>
          <button>Test</button>
        </div>
      </FocusTrap>
    );

    const button = screen.getByRole('button');
    expect(button).not.toHaveFocus();
  });
});

