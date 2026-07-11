import { Prisma, type Product, ProductLevel } from '@prisma/client';

import type { SourceProduct, UpdateProductDto } from './product.schema';

/**
 * A Product row with its variant subtree eagerly loaded two levels deep.
 */
export type ProductWithChildren = Product & {
  children: (Product & { children: Product[] })[];
};

/** Prisma `include` that fetches a product plus both variant levels. */
export const productTreeInclude = {
  children: {
    orderBy: { position: 'asc' },
    include: {
      children: { orderBy: { position: 'asc' } },
    },
  },
} satisfies Prisma.ProductInclude;

/**
 * Serialises a Product row for API responses.
 *
 * Prisma returns `Decimal` for money columns; we expose a plain `number` so the
 * JSON contract stays simple for the frontend. `null` product-only fields are
 * omitted on variant rows by the caller's choice of which fields to read.
 */
function serialiseNode(node: Product): Record<string, unknown> {
  return {
    id: node.id,
    level: node.level,
    parentId: node.parentId,
    name: node.name,
    price: node.price.toNumber(),
    discountPercentage: node.discountPercentage,
    inventory: node.inventory,
    active: node.active,
    description: node.description,
    category: node.category,
    image: node.image,
    leadTime: node.leadTime,
    primaryVariantName: node.primaryVariantName,
    secondaryVariantName: node.secondaryVariantName,
    position: node.position,
    createdAt: node.createdAt,
    updatedAt: node.updatedAt,
  };
}

/** Serialises a full product tree (product → primary → secondary). */
export function toProductTreeDto(product: ProductWithChildren): Record<string, unknown> {
  return {
    ...serialiseNode(product),
    primaryVariants: product.children.map((primary) => ({
      ...serialiseNode(primary),
      secondaryVariants: primary.children.map(serialiseNode),
    })),
  };
}

/** Serialises a single node without its children (used after a PATCH). */
export function toProductDto(product: Product): Record<string, unknown> {
  return serialiseNode(product);
}

/**
 * Builds a Prisma update payload from a partial DTO, assigning only the keys the
 * caller actually sent. This avoids writing `undefined` over existing columns and
 * satisfies `exactOptionalPropertyTypes`. Money is re-wrapped as a Decimal.
 */
export function toUpdateInput(dto: UpdateProductDto): Prisma.ProductUpdateInput {
  const data: Prisma.ProductUpdateInput = {};

  if (dto.name !== undefined) data.name = dto.name;
  if (dto.price !== undefined) data.price = new Prisma.Decimal(dto.price);
  if (dto.discountPercentage !== undefined) data.discountPercentage = dto.discountPercentage;
  if (dto.inventory !== undefined) data.inventory = dto.inventory;
  if (dto.active !== undefined) data.active = dto.active;
  if (dto.description !== undefined) data.description = dto.description;
  if (dto.category !== undefined) data.category = dto.category;
  if (dto.image !== undefined) data.image = dto.image;
  if (dto.leadTime !== undefined) data.leadTime = dto.leadTime;
  if (dto.primaryVariantName !== undefined) data.primaryVariantName = dto.primaryVariantName;
  if (dto.secondaryVariantName !== undefined) data.secondaryVariantName = dto.secondaryVariantName;

  return data;
}

/**
 * Expands a nested source product into the flat `Product.create` input tree that
 * Prisma's nested-write API consumes. Ordering is preserved via `position`, and
 * the loose source `inventory`/`price` values are already normalised by the
 * schema before this runs.
 */
export function toCreateInput(source: SourceProduct): Prisma.ProductCreateInput {
  return {
    level: ProductLevel.PRODUCT,
    name: source.title,
    price: new Prisma.Decimal(source.price),
    discountPercentage: source.discountPercentage,
    inventory: source.inventory,
    active: source.active,
    description: source.description ?? null,
    category: source.category ?? null,
    image: source.image ?? null,
    leadTime: source.leadTime ?? null,
    primaryVariantName: source.primary_variant_name ?? null,
    secondaryVariantName: source.secondary_variant_name ?? null,
    position: 0,
    children: {
      create: source.primary_variants.map((primary, primaryIndex) => ({
        level: ProductLevel.PRIMARY_VARIANT,
        name: primary.name,
        price: new Prisma.Decimal(primary.price),
        discountPercentage: primary.discountPercentage,
        inventory: primary.inventory,
        active: primary.active,
        position: primaryIndex,
        children: {
          create: primary.secondary_variants.map((secondary, secondaryIndex) => ({
            level: ProductLevel.SECONDARY_VARIANT,
            name: secondary.name,
            price: new Prisma.Decimal(secondary.price),
            discountPercentage: secondary.discountPercentage,
            inventory: secondary.inventory,
            active: true,
            position: secondaryIndex,
          })),
        },
      })),
    },
  };
}
