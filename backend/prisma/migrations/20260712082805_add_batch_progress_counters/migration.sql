-- AlterTable
ALTER TABLE "import_batches" ADD COLUMN     "failedCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "processedCount" INTEGER NOT NULL DEFAULT 0;
