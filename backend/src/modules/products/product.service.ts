import type { Product } from '@prisma/client';

import { NotFoundError } from '../../lib/errors';
import { toCreateInput, toUpdateInput, type ProductWithChildren } from './product.mapper';
import { productRepository } from './product.repository';
import type { CreateProductDto, ListProductsQuery, UpdateProductDto } from './product.schema';

export interface PaginatedResult<T> {
  data: T[];
  meta: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}

/**
 * Product business logic. Orchestrates the repository and enforces invariants
 * (e.g. existence checks) independent of the transport and persistence layers.
 */
export const productService = {
  /** Creates a product and its full variant tree. */
  create(dto: CreateProductDto): Promise<ProductWithChildren> {
    return productRepository.create(toCreateInput(dto));
  },

  /** Returns a single top-level product with its variant subtree. */
  async getById(id: string): Promise<ProductWithChildren> {
    const product = await productRepository.findTreeById(id);
    if (!product) {
      throw new NotFoundError(`Product with id "${id}" not found`);
    }
    return product;
  },

  /** Returns a paginated page of top-level products with their subtrees. */
  async list(query: ListProductsQuery): Promise<PaginatedResult<ProductWithChildren>> {
    const { page, pageSize, search } = query;
    const { items, total } = await productRepository.findManyProducts({
      skip: (page - 1) * pageSize,
      take: pageSize,
      search,
    });

    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    return {
      data: items,
      meta: {
        page,
        pageSize,
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
    };
  },

  /**
   * Updates any attribute of any node (product or variant). The DB field names
   * map 1:1 to the DTO, with `price` re-wrapped as a Decimal.
   */
  async update(id: string, dto: UpdateProductDto): Promise<Product> {
    await this.ensureExists(id);
    return productRepository.update(id, toUpdateInput(dto));
  },

  /** Deletes a node (and its subtree). */
  async remove(id: string): Promise<void> {
    await this.ensureExists(id);
    await productRepository.delete(id);
  },

  /** Throws NotFoundError if no node with the id exists. */
  async ensureExists(id: string): Promise<void> {
    const existing = await productRepository.findById(id);
    if (!existing) {
      throw new NotFoundError(`Product with id "${id}" not found`);
    }
  },
};
