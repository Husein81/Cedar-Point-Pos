-- Add item typing for purchase order items and remove offers feature tables.

DO $$
BEGIN
  CREATE TYPE "PurchaseOrderItemType" AS ENUM ('PRODUCT', 'CUSTOM');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DROP TABLE IF EXISTS "OfferGroupItem";
DROP TABLE IF EXISTS "OfferGroup";
DROP TABLE IF EXISTS "Offer";

ALTER TABLE "PurchaseOrderItem"
  ADD COLUMN IF NOT EXISTS "itemType" "PurchaseOrderItemType" NOT NULL DEFAULT 'PRODUCT',
  ADD COLUMN IF NOT EXISTS "itemName" TEXT;

ALTER TABLE "PurchaseOrderItem"
  ALTER COLUMN "productId" DROP NOT NULL;

UPDATE "PurchaseOrderItem" AS poi
SET "itemName" = p."name"
FROM "Product" AS p
WHERE poi."productId" = p."id"
  AND poi."itemName" IS NULL;

UPDATE "PurchaseOrderItem"
SET "itemName" = COALESCE("itemName", 'Custom Item')
WHERE "itemName" IS NULL;

ALTER TABLE "PurchaseOrderItem"
  ALTER COLUMN "itemName" SET NOT NULL;

DO $$
BEGIN
  ALTER TABLE "PurchaseOrderItem" DROP CONSTRAINT "PurchaseOrderItem_productId_fkey";
EXCEPTION
  WHEN undefined_object THEN NULL;
END $$;

ALTER TABLE "PurchaseOrderItem"
  ADD CONSTRAINT "PurchaseOrderItem_productId_fkey"
  FOREIGN KEY ("productId") REFERENCES "Product"("id")
  ON DELETE SET NULL
  ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS "PurchaseOrderItem_purchaseOrderId_itemType_idx"
ON "PurchaseOrderItem"("purchaseOrderId", "itemType");
