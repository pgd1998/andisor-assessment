import { Prisma, ProductLevel } from '@prisma/client';
import { describe, expect, it } from 'vitest';

import { toCreateInput, toUpdateInput } from '../../src/modules/products/product.mapper';
import { sourceProductSchema } from '../../src/modules/products/product.schema';

describe('toCreateInput', () => {
  it('expands a nested source product into a Prisma create tree with preserved ordering', () => {
    const source = sourceProductSchema.parse({
      title: 'Test Tee',
      price: 20,
      discountPercentage: 10,
      inventory: '50', // string on the source — should normalise to a number
      active: true,
      primary_variant_name: 'Color',
      secondary_variant_name: 'Size',
      primary_variants: [
        {
          name: 'Red',
          price: 19.5,
          discountPercentage: 5,
          inventory: 30,
          active: true,
          secondary_variants: [
            { name: 'S', price: 19.5, discountPercentage: 5, inventory: 10 },
            { name: 'M', price: 19.5, discountPercentage: 5, inventory: 20 },
          ],
        },
      ],
    });

    const input = toCreateInput(source);

    expect(input.level).toBe(ProductLevel.PRODUCT);
    expect(input.name).toBe('Test Tee');
    expect(input.inventory).toBe(50);
    expect(input.primaryVariantName).toBe('Color');

    const primary = input.children?.create;
    const primaryVariant = Array.isArray(primary) ? primary[0] : primary;
    expect(primaryVariant?.level).toBe(ProductLevel.PRIMARY_VARIANT);
    expect(primaryVariant?.position).toBe(0);

    const secondary = primaryVariant?.children?.create;
    const secondaryList = Array.isArray(secondary) ? secondary : [secondary];
    expect(secondaryList).toHaveLength(2);
    expect(secondaryList[0]?.name).toBe('S');
    expect(secondaryList[0]?.position).toBe(0);
    expect(secondaryList[1]?.position).toBe(1);
  });
});

describe('toUpdateInput', () => {
  it('assigns only provided keys and wraps price as a Decimal', () => {
    const input = toUpdateInput({ price: 12.5, inventory: 3 });

    expect(input.price).toBeInstanceOf(Prisma.Decimal);
    expect((input.price as Prisma.Decimal).toNumber()).toBe(12.5);
    expect(input.inventory).toBe(3);
    expect('name' in input).toBe(false);
    expect('active' in input).toBe(false);
  });

  it('supports nulling out product-only fields', () => {
    const input = toUpdateInput({ description: null });
    expect(input.description).toBeNull();
  });
});
