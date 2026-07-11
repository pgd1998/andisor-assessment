/**
 * API contract types, mirroring the backend's serialised product shape.
 * Kept hand-written (rather than generated) to keep the frontend build simple;
 * they intentionally match `product.mapper.ts` on the server.
 */

export type ProductLevel = 'PRODUCT' | 'PRIMARY_VARIANT' | 'SECONDARY_VARIANT';

/** Fields common to every node in the hierarchy. */
export interface ProductNode {
  id: string;
  level: ProductLevel;
  parentId: string | null;
  name: string;
  price: number;
  discountPercentage: number;
  inventory: number;
  active: boolean;
  description: string | null;
  category: string | null;
  image: string | null;
  leadTime: string | null;
  primaryVariantName: string | null;
  secondaryVariantName: string | null;
  position: number;
  createdAt: string;
  updatedAt: string;
}

export interface SecondaryVariant extends ProductNode {
  level: 'SECONDARY_VARIANT';
}

export interface PrimaryVariant extends ProductNode {
  level: 'PRIMARY_VARIANT';
  secondaryVariants: SecondaryVariant[];
}

export interface Product extends ProductNode {
  level: 'PRODUCT';
  primaryVariants: PrimaryVariant[];
}

export interface PaginationMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: PaginationMeta;
}

export interface SingleResponse<T> {
  data: T;
}

/** Fields editable inline. The API accepts any subset via PATCH. */
export type EditableField = 'name' | 'price' | 'discountPercentage' | 'inventory' | 'active';

export type ProductUpdate = Partial<Pick<ProductNode, EditableField>>;

export interface ApiError {
  error: { code: string; message: string; details?: unknown };
}
