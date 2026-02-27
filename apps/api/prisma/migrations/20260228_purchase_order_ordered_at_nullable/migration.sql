-- AlterTable: make orderedAt nullable and remove default
ALTER TABLE "PurchaseOrder"
ALTER COLUMN "orderedAt" DROP NOT NULL;
ALTER TABLE "PurchaseOrder"
ALTER COLUMN "orderedAt" DROP DEFAULT;
-- Backfill: clear orderedAt for PENDING POs (it was incorrectly auto-set)
UPDATE "PurchaseOrder"
SET "orderedAt" = NULL
WHERE "status" = 'PENDING';