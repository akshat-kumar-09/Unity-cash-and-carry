-- AlterTable: click & collect handover
ALTER TABLE "Order" ADD COLUMN "collectionCode" TEXT;
ALTER TABLE "Order" ADD COLUMN "readyAt" TIMESTAMP(3);
ALTER TABLE "Order" ADD COLUMN "readyNotice" TEXT;
ALTER TABLE "Order" ADD COLUMN "collectedAt" TIMESTAMP(3);

-- Click & collect orders not yet collected get a code so they can use the collection pass.
UPDATE "Order"
SET "collectionCode" = upper(substr(md5('collect' || "id"), 1, 6))
WHERE "fulfillmentMethod" = 'click_and_collect' AND "status" NOT IN ('delivered', 'cancelled');

-- CreateIndex
CREATE UNIQUE INDEX "Order_collectionCode_key" ON "Order"("collectionCode");

-- AlterTable: checkout details remembered for next time
ALTER TABLE "User" ADD COLUMN "savedPhone" TEXT;
ALTER TABLE "User" ADD COLUMN "savedAddress" TEXT;
ALTER TABLE "User" ADD COLUMN "savedFulfillment" TEXT;
ALTER TABLE "User" ADD COLUMN "savedPaymentMethod" TEXT;
