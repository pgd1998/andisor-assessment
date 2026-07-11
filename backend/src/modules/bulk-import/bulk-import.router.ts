import { Router } from 'express';
import multer from 'multer';

import { env } from '../../config/env';
import { asyncHandler } from '../../middleware/async-handler';
import { createBulkImport, getBulkImportStatus } from './bulk-import.controller';

/**
 * Bulk-import routes.
 *
 *   POST /api/products/bulk-import            enqueue a batch (202, returns batchId)
 *   GET  /api/products/bulk-import/:batchId   poll batch progress
 *
 * Mounted before the generic `/:id` product routes so `bulk-import` is not
 * captured as a product id.
 */
export const bulkImportRouter = Router();

// In-memory upload: batches are small JSON files, so we avoid touching disk.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: env.BULK_IMPORT_MAX_FILE_BYTES },
});

bulkImportRouter.post('/bulk-import', upload.single('file'), asyncHandler(createBulkImport));

bulkImportRouter.get('/bulk-import/:batchId', asyncHandler(getBulkImportStatus));
