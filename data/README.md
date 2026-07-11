# Seed data

`products.json` is the source dataset the database is seeded from
(`backend/prisma/seed.ts` reads it at `../data/products.json`).

It contains 10 products, each with a three-level hierarchy:

```
Product
└─ primary_variants[]   (grouped by `primary_variant_name`, e.g. "Color")
   └─ secondary_variants[] (grouped by `secondary_variant_name`, e.g. "Size")
```

To seed from a different dataset, replace this file with one of the same shape
(see `backend/src/modules/products/product.schema.ts` for the validated shape)
and re-run `npm --workspace backend run db:seed`.
