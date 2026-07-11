import type { Request, Response } from 'express';

import { BadRequestError } from '../../lib/errors';
import { bulkImportService } from './bulk-import.service';

/**
 * Resolves the raw product input from the request, supporting two transports:
 *   1. `multipart/form-data` with a JSON `file` (the assessment's primary path).
 *   2. `application/json` body (a bare array or `{ products: [...] }`).
 */
function extractRawInput(req: Request): unknown {
  if (req.file) {
    try {
      return JSON.parse(req.file.buffer.toString('utf-8'));
    } catch {
      throw new BadRequestError('Uploaded file is not valid JSON');
    }
  }
  return req.body;
}

export async function createBulkImport(req: Request, res: Response): Promise<void> {
  const rawInput = extractRawInput(req);
  const result = await bulkImportService.enqueue(rawInput);
  // 202 Accepted: the work has been queued but not yet completed.
  res.status(202).json({ data: result });
}

export async function getBulkImportStatus(req: Request, res: Response): Promise<void> {
  const status = await bulkImportService.getStatus(req.params.batchId as string);
  res.status(200).json({ data: status });
}
