-- AlterTable
ALTER TABLE "Order" ADD COLUMN "paymentReference" TEXT;

-- Delivery orders still awaiting payment were waiting on a card payment that can no
-- longer be taken. Give each one a bank transfer reference so it can be paid and matched.
-- (Click & collect orders are paid at the counter instead.)
UPDATE "Order"
SET "paymentReference" = 'UCC' || upper(substr(md5("id"), 1, 10))
WHERE "paymentStatus" <> 'paid' AND "status" <> 'cancelled' AND "total" > 0
  AND "fulfillmentMethod" = 'delivery';

-- CreateIndex
CREATE UNIQUE INDEX "Order_paymentReference_key" ON "Order"("paymentReference");
