import { Worker } from 'bullmq';
import request from 'supertest';
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createApp } from '../../src/app';
import { prisma } from '../../src/lib/prisma';
import { redisConnection } from '../../src/lib/redis';
import {
  closeBulkImportQueue,
  getBulkImportQueue,
} from '../../src/modules/bulk-import/bulk-import.queue';
import { processBulkImportJob } from '../../src/modules/bulk-import/bulk-import.processor';
import { BULK_IMPORT_QUEUE } from '../../src/modules/bulk-import/bulk-import.types';
import './setup';

const app = createApp();

const product = (title: string): Record<string, unknown> => ({
  title,
  price: 20,
  discountPercentage: 5,
  inventory: '10',
  active: true,
  primary_variants: [
    {
      name: 'Red',
      price: 20,
      discountPercentage: 5,
      inventory: 10,
      active: true,
      secondary_variants: [{ name: 'S', price: 20, discountPercentage: 5, inventory: 4 }],
    },
  ],
});

const workers: Worker[] = [];

// Start each test from an empty queue so job counts and processing are isolated.
beforeEach(async () => {
  await getBulkImportQueue().obliterate({ force: true });
});

afterEach(async () => {
  await Promise.all(workers.map((w) => w.close()));
  workers.length = 0;
});

// Close the shared queue connection once, after all tests in this file.
afterAll(async () => {
  await closeBulkImportQueue();
});

/**
 * Runs a worker until `expected` jobs have completed. Counting `completed`
 * events (rather than relying on `drained`, which fires when no *waiting* jobs
 * remain but active jobs may still be finishing) makes the assertion reliable.
 */
async function runWorkerUntilProcessed(expected: number): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    let completed = 0;
    const worker = new Worker(BULK_IMPORT_QUEUE, processBulkImportJob, {
      connection: redisConnection,
      concurrency: 5,
    });
    workers.push(worker);
    worker.on('completed', () => {
      completed += 1;
      if (completed >= expected) resolve();
    });
    worker.on('failed', (_job, err) => reject(err));
  });
}

describe('POST /api/products/bulk-import', () => {
  it('accepts a JSON body and returns 202 immediately without creating products', async () => {
    const res = await request(app)
      .post('/api/products/bulk-import')
      .send({ products: [product('Bulk A'), product('Bulk B')] });

    expect(res.status).toBe(202);
    expect(res.body.data).toMatchObject({ totalProducts: 2 });
    expect(res.body.data.batchId).toBeTruthy();
    expect(res.body.data.statusUrl).toContain('/bulk-import/');

    // The response does NOT wait for creation — nothing exists yet.
    const countImmediately = await prisma.product.count({ where: { level: 'PRODUCT' } });
    expect(countImmediately).toBe(0);
  });

  it('accepts an uploaded JSON file', async () => {
    const buffer = Buffer.from(JSON.stringify([product('From File')]), 'utf-8');
    const res = await request(app)
      .post('/api/products/bulk-import')
      .attach('file', buffer, 'products.json');

    expect(res.status).toBe(202);
    expect(res.body.data.totalProducts).toBe(1);
  });

  it('rejects an empty batch with 400', async () => {
    const res = await request(app).post('/api/products/bulk-import').send({ products: [] });
    expect(res.status).toBe(400);
  });

  it('processes queued products asynchronously via the worker', async () => {
    await request(app)
      .post('/api/products/bulk-import')
      .send({ products: [product('Async 1'), product('Async 2'), product('Async 3')] });

    await runWorkerUntilProcessed(3);

    const count = await prisma.product.count({ where: { level: 'PRODUCT' } });
    expect(count).toBe(3);
    // Variant subtree was created too.
    const secondary = await prisma.product.count({ where: { level: 'SECONDARY_VARIANT' } });
    expect(secondary).toBe(3);
  });
});

describe('GET /api/products/bulk-import/:batchId', () => {
  it('returns the batch status', async () => {
    const created = await request(app)
      .post('/api/products/bulk-import')
      .send({ products: [product('Status Check')] });
    const batchId = created.body.data.batchId as string;

    const res = await request(app).get(`/api/products/bulk-import/${batchId}`);
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ batchId, totalProducts: 1 });
    expect(res.body.data.counts).toBeDefined();
  });

  it('returns 404 for an unknown batch', async () => {
    const res = await request(app).get('/api/products/bulk-import/unknown');
    expect(res.status).toBe(404);
  });
});

// Guard against a hung Redis making the suite hang indefinitely.
vi.setConfig({ testTimeout: 15_000 });
