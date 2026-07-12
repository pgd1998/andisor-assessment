/**
 * Column layout shared by every row level so cells line up vertically across
 * products and their nested variants. Widths are expressed as grid template
 * columns; the first (name) column flexes, the rest are fixed.
 */
export const GRID_TEMPLATE = 'minmax(220px, 2fr) 110px 90px 90px 110px 130px 100px 110px';

export const COLUMN_HEADERS = [
  'Product / Variant',
  'Price',
  'Discount',
  'Inventory',
  'Published',
  'Category',
  'Type',
  'Lead Time',
] as const;

/** Indentation (px) applied to the name cell per hierarchy depth. */
export const INDENT_PER_LEVEL = 24;
