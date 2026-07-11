import type { Request, Response } from 'express';

import { toProductDto, toProductTreeDto } from './product.mapper';
import { productService } from './product.service';
import type { CreateProductDto, ListProductsQuery, UpdateProductDto } from './product.schema';

/**
 * Thin HTTP adapters. Validation has already run in middleware, so each handler
 * simply delegates to the service and serialises the result. No try/catch — the
 * asyncHandler wrapper forwards rejections to the error middleware.
 *
 * Exported as standalone functions (not object methods) so they can be passed to
 * middleware without `this`-binding concerns.
 */

export async function createProduct(req: Request, res: Response): Promise<void> {
  const product = await productService.create(req.body as CreateProductDto);
  res.status(201).json({ data: toProductTreeDto(product) });
}

export async function listProducts(req: Request, res: Response): Promise<void> {
  const result = await productService.list(req.query as unknown as ListProductsQuery);
  res.status(200).json({ data: result.data.map(toProductTreeDto), meta: result.meta });
}

export async function getProductById(req: Request, res: Response): Promise<void> {
  const product = await productService.getById(req.params.id as string);
  res.status(200).json({ data: toProductTreeDto(product) });
}

export async function updateProduct(req: Request, res: Response): Promise<void> {
  const product = await productService.update(
    req.params.id as string,
    req.body as UpdateProductDto,
  );
  res.status(200).json({ data: toProductDto(product) });
}

export async function deleteProduct(req: Request, res: Response): Promise<void> {
  await productService.remove(req.params.id as string);
  res.status(204).send();
}
