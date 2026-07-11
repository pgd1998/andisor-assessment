import { Router } from 'express';

import { asyncHandler } from '../../middleware/async-handler';
import { validate } from '../../middleware/validate';
import {
  createProduct,
  deleteProduct,
  getProductById,
  listProducts,
  updateProduct,
} from './product.controller';
import {
  createProductSchema,
  listProductsQuerySchema,
  productIdParamSchema,
  updateProductSchema,
} from './product.schema';

/**
 * Product CRUD routes.
 *
 *   POST   /api/products        create a product (with nested variants)
 *   GET    /api/products        paginated list of top-level products
 *   GET    /api/products/:id    a single product with its variant subtree
 *   PATCH  /api/products/:id    update any attribute of any node
 *   DELETE /api/products/:id    delete a node (and its subtree)
 */
export const productRouter = Router();

productRouter.post('/', validate({ body: createProductSchema }), asyncHandler(createProduct));

productRouter.get('/', validate({ query: listProductsQuerySchema }), asyncHandler(listProducts));

productRouter.get('/:id', validate({ params: productIdParamSchema }), asyncHandler(getProductById));

productRouter.patch(
  '/:id',
  validate({ params: productIdParamSchema, body: updateProductSchema }),
  asyncHandler(updateProduct),
);

productRouter.delete(
  '/:id',
  validate({ params: productIdParamSchema }),
  asyncHandler(deleteProduct),
);
