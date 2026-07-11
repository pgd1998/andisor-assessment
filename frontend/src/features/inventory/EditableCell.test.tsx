import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { EditableCell } from './EditableCell';

describe('EditableCell', () => {
  it('enters edit mode on click and commits a new value on Enter', async () => {
    const user = userEvent.setup();
    const onCommit = vi.fn();

    render(
      <EditableCell value="Blue" display="Blue" ariaLabel="name of product" onCommit={onCommit} />,
    );

    await user.click(screen.getByRole('button', { name: /edit name of product/i }));
    const input = screen.getByRole('textbox', { name: /name of product/i });
    await user.clear(input);
    await user.type(input, 'Red{Enter}');

    expect(onCommit).toHaveBeenCalledWith('Red');
  });

  it('cancels the edit on Escape without committing', async () => {
    const user = userEvent.setup();
    const onCommit = vi.fn();

    render(<EditableCell value="Blue" display="Blue" ariaLabel="name" onCommit={onCommit} />);

    await user.click(screen.getByRole('button', { name: /edit name/i }));
    const input = screen.getByRole('textbox');
    await user.clear(input);
    await user.type(input, 'Red{Escape}');

    expect(onCommit).not.toHaveBeenCalled();
    // The display value is unchanged.
    expect(screen.getByRole('button', { name: /edit name/i })).toHaveTextContent('Blue');
  });

  it('rejects invalid numeric input', async () => {
    const user = userEvent.setup();
    const onCommit = vi.fn();

    render(
      <EditableCell
        value={10}
        type="number"
        display="10"
        ariaLabel="inventory"
        onCommit={onCommit}
      />,
    );

    await user.click(screen.getByRole('button', { name: /edit inventory/i }));
    const input = screen.getByRole('spinbutton');
    await user.clear(input);
    await user.type(input, '-5{Enter}');

    expect(onCommit).not.toHaveBeenCalled();
  });

  it('marks the cell when it has an unsaved edit', () => {
    const { rerender } = render(
      <EditableCell
        value="Blue"
        display="Blue"
        ariaLabel="name"
        onCommit={vi.fn()}
        edited={false}
      />,
    );
    const button = screen.getByRole('button', { name: /edit name/i });
    expect(button.className).not.toContain('border-amber-400');

    rerender(
      <EditableCell value="Blue" display="Blue" ariaLabel="name" onCommit={vi.fn()} edited />,
    );
    expect(screen.getByRole('button', { name: /edit name/i }).className).toContain(
      'border-amber-400',
    );
  });
});
