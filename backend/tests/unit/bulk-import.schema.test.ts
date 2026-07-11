import { describe, expect, it } from 'vitest';

import { normaliseBulkImportInput } from '../../src/modules/bulk-import/bulk-import.schema';

const validProduct = {
  title: 'Tee',
  price: 10,
  discountPercentage: 0,
  inventory: '5',
  active: true,
  primary_variants: [],
};

describe('normaliseBulkImportInput', () => {
  it('accepts a bare array of products', () => {
    const result = normaliseBulkImportInput([validProduct]);
    expect(result.products).toHaveLength(1);
    expect(result.products[0]?.title).toBe('Tee');
    // inventory string "5" is normalised to a number.
    expect(result.products[0]?.inventory).toBe(5);
  });

  it('accepts an object wrapper { products: [...] }', () => {
    const result = normaliseBulkImportInput({ products: [validProduct, validProduct] });
    expect(result.products).toHaveLength(2);
  });

  it('rejects an empty batch', () => {
    expect(() => normaliseBulkImportInput([])).toThrow();
    expect(() => normaliseBulkImportInput({ products: [] })).toThrow();
  });

  it('rejects malformed products', () => {
    expect(() => normaliseBulkImportInput([{ price: 1 }])).toThrow();
  });
});
