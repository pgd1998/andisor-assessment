import { type Prisma, type Product, ProductLevel } from '@prisma/client';

import { prisma } from '../../lib/prisma';
import { productTreeInclude, type ProductWithChildren } from './product.mapper';

/**
 * Data-access layer for products. Keeps all Prisma queries in one place so the
 * service layer stays persistence-agnostic and easy to test.
 */
export const productRepository = {
  /** Creates a full product tree in a single nested write. */
  create(data: Prisma.ProductCreateInput): Promise<ProductWithChildren> {
    return prisma.product.create({ data, include: productTreeInclude });
  },

  /** Fetches a single node (any level) by id, without children. */
  findById(id: string): Promise<Product | null> {
    return prisma.product.findUnique({ where: { id } });
  },

  /** Fetches a top-level product with its full variant subtree. */
  findTreeById(id: string): Promise<ProductWithChildren | null> {
    return prisma.product.findFirst({
      where: { id, level: ProductLevel.PRODUCT },
      include: productTreeInclude,
    });
  },

  /**
   * Returns one page of top-level products (with subtrees) plus the total count,
   * in a single transaction so the count is consistent with the page.
   */
  async findManyProducts(params: {
    skip: number;
    take: number;
    search?: string | undefined;
  }): Promise<{ items: ProductWithChildren[]; total: number }> {
    const where: Prisma.ProductWhereInput = {
      level: ProductLevel.PRODUCT,
      ...(params.search ? { name: { contains: params.search, mode: 'insensitive' } } : {}),
    };

    const [items, total] = await prisma.$transaction([
      prisma.product.findMany({
        where,
        include: productTreeInclude,
        orderBy: { createdAt: 'asc' },
        skip: params.skip,
        take: params.take,
      }),
      prisma.product.count({ where }),
    ]);

    return { items, total };
  },

  /** Updates a single node's attributes and returns the fresh row. */
  update(id: string, data: Prisma.ProductUpdateInput): Promise<Product> {
    return prisma.product.update({ where: { id }, data });
  },

  /** Deletes a node; cascades to its variant subtree via the schema relation. */
  delete(id: string): Promise<Product> {
    return prisma.product.delete({ where: { id } });
  },
};
