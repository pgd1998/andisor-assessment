import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { Product } from '../../api/types';
import { useEditStore } from '../../store/editStore';
import { ProductRow } from './ProductRow';

function makeProduct(): Product {
  const base = {
    parentId: null,
    discountPercentage: 0,
    active: true,
    description: null,
    category: null,
    image: null,
    leadTime: null,
    primaryVariantName: null,
    secondaryVariantName: null,
    position: 0,
    createdAt: '',
    updatedAt: '',
  };
  return {
    ...base,
    id: 'p1',
    level: 'PRODUCT',
    name: 'Test Product',
    price: 100,
    inventory: 50,
    primaryVariantName: 'Color',
    secondaryVariantName: 'Size',
    primaryVariants: [
      {
        ...base,
        id: 'pv1',
        level: 'PRIMARY_VARIANT',
        parentId: 'p1',
        name: 'Red',
        price: 100,
        inventory: 30,
        secondaryVariants: [
          {
            ...base,
            id: 'sv1',
            level: 'SECONDARY_VARIANT',
            parentId: 'pv1',
            name: 'Small',
            price: 100,
            inventory: 10,
          },
        ],
      },
    ],
  };
}

describe('ProductRow', () => {
  beforeEach(() => {
    useEditStore.getState().clearAll();
  });

  it('reveals primary variants on expand, and secondary variants on nested expand', async () => {
    const user = userEvent.setup();
    render(<ProductRow node={makeProduct()} depth={0} callbacks={{ onEdit: vi.fn() }} />);

    // Collapsed: only the product is visible.
    expect(screen.getByText('Test Product')).toBeInTheDocument();
    expect(screen.queryByText('Red')).not.toBeInTheDocument();

    // Expand the product → the "Color" group + the "Red" variant appear.
    await user.click(screen.getByRole('button', { name: /expand/i }));
    expect(screen.getByText('Color')).toBeInTheDocument();
    expect(screen.getByText('Red')).toBeInTheDocument();
    expect(screen.queryByText('Small')).not.toBeInTheDocument();

    // Expand the primary variant → the "Size" group + "Small" appear.
    const expandButtons = screen.getAllByRole('button', { name: /expand/i });
    await user.click(expandButtons[expandButtons.length - 1] as HTMLElement);
    expect(screen.getByText('Size')).toBeInTheDocument();
    expect(screen.getByText('Small')).toBeInTheDocument();
  });

  it('routes an inline edit to the callback and records it in the store', async () => {
    const user = userEvent.setup();
    const onEdit = vi.fn();
    render(<ProductRow node={makeProduct()} depth={0} callbacks={{ onEdit }} />);

    await user.click(screen.getByRole('button', { name: /edit name of Test Product/i }));
    const input = screen.getByRole('textbox', { name: /name of Test Product/i });
    await user.clear(input);
    await user.type(input, 'Renamed{Enter}');

    expect(onEdit).toHaveBeenCalledWith('p1', 'name', 'Renamed');
  });
});
