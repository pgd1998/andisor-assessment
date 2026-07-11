-- CreateEnum
CREATE TYPE "ProductLevel" AS ENUM ('PRODUCT', 'PRIMARY_VARIANT', 'SECONDARY_VARIANT');

-- CreateTable
CREATE TABLE "products" (
    "id" TEXT NOT NULL,
    "level" "ProductLevel" NOT NULL,
    "parentId" TEXT,
    "name" TEXT NOT NULL,
    "price" DECIMAL(10,2) NOT NULL,
    "discountPercentage" INTEGER NOT NULL DEFAULT 0,
    "inventory" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "description" TEXT,
    "category" TEXT,
    "image" TEXT,
    "leadTime" TEXT,
    "primaryVariantName" TEXT,
    "secondaryVariantName" TEXT,
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "import_batches" (
    "id" TEXT NOT NULL,
    "totalProducts" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'QUEUED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "import_batches_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "products_parentId_idx" ON "products"("parentId");

-- CreateIndex
CREATE INDEX "products_level_idx" ON "products"("level");

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;
