-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "shopifyDraftOrderId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Order_shopifyDraftOrderId_key" ON "Order"("shopifyDraftOrderId");
