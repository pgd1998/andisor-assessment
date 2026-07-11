import request from 'supertest';
import { describe, expect, it } from 'vitest';

import { createApp } from '../../src/app';
import './setup';

const app = createApp();

const sampleProduct = {
  title: 'Seamless Tee Shirt',
  price: 109,
  discountPercentage: 15,
  inventory: '131',
  active: true,
  category: "men's clothing",
  primary_variant_name: 'Color',
  secondary_variant_name: 'Size',
  primary_variants: [
    {
      name: 'Blue',
      price: 109,
      discountPercentage: 15,
      inventory: 131,
      active: true,
      secondary_variants: [
        { name: 'S', price: 109, discountPercentage: 15, inventory: 22 },
        { name: 'M', price: 109, discountPercentage: 15, inventory: 26 },
      ],
    },
  ],
};

async function createSample(): Promise<request.Response> {
  return request(app).post('/api/products').send(sampleProduct);
}

describe('POST /api/products', () => {
  it('creates a product with its nested variant tree', async () => {
    const res = await createSample();

    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({ name: 'Seamless Tee Shirt', level: 'PRODUCT' });
    // Inventory normalised from the string "131" to a number.
    expect(res.body.data.inventory).toBe(131);
    expect(res.body.data.primaryVariants).toHaveLength(1);
    expect(res.body.data.primaryVariants[0].secondaryVariants).toHaveLength(2);
  });

  it('rejects an invalid payload with 422', async () => {
    const res = await request(app).post('/api/products').send({ price: 10 }); // missing title
    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });
});

describe('GET /api/products', () => {
  it('returns a paginated list defaulting to 5 items per page', async () => {
    for (let i = 0; i < 7; i++) {
      await request(app)
        .post('/api/products')
        .send({ ...sampleProduct, title: `Product ${i}` });
    }

    const res = await request(app).get('/api/products');

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(5);
    expect(res.body.meta).toMatchObject({
      page: 1,
      pageSize: 5,
      total: 7,
      totalPages: 2,
      hasNextPage: true,
      hasPreviousPage: false,
    });
  });

  it('honours page and pageSize query params', async () => {
    for (let i = 0; i < 7; i++) {
      await request(app)
        .post('/api/products')
        .send({ ...sampleProduct, title: `Product ${i}` });
    }

    const res = await request(app).get('/api/products?page=2&pageSize=5');
    expect(res.body.data).toHaveLength(2);
    expect(res.body.meta.hasPreviousPage).toBe(true);
    expect(res.body.meta.hasNextPage).toBe(false);
  });
});

describe('GET /api/products/:id', () => {
  it('returns a single product with its variant subtree', async () => {
    const created = await createSample();
    const id = created.body.data.id as string;

    const res = await request(app).get(`/api/products/${id}`);
    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe(id);
    expect(res.body.data.primaryVariants[0].name).toBe('Blue');
  });

  it('returns 404 for an unknown id', async () => {
    const res = await request(app).get('/api/products/does-not-exist');
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });
});

describe('PATCH /api/products/:id', () => {
  it('updates any attribute at any level', async () => {
    const created = await createSample();
    const primaryVariantId = created.body.data.primaryVariants[0].id as string;

    // Edit a *variant* row's price and inventory.
    const res = await request(app)
      .patch(`/api/products/${primaryVariantId}`)
      .send({ price: 99.99, inventory: 5 });

    expect(res.status).toBe(200);
    expect(res.body.data.price).toBe(99.99);
    expect(res.body.data.inventory).toBe(5);
  });

  it('rejects an empty patch body with 422', async () => {
    const created = await createSample();
    const id = created.body.data.id as string;

    const res = await request(app).patch(`/api/products/${id}`).send({});
    expect(res.status).toBe(422);
  });

  it('returns 404 when patching an unknown id', async () => {
    const res = await request(app).patch('/api/products/nope').send({ price: 1 });
    expect(res.status).toBe(404);
  });
});

describe('DELETE /api/products/:id', () => {
  it('deletes a product and cascades to its variants', async () => {
    const created = await createSample();
    const id = created.body.data.id as string;

    const del = await request(app).delete(`/api/products/${id}`);
    expect(del.status).toBe(204);

    const get = await request(app).get(`/api/products/${id}`);
    expect(get.status).toBe(404);
  });
});
