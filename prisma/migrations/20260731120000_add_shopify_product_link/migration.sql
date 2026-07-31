-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "shopifyProductId" TEXT,
ADD COLUMN     "shopifyVariantId" TEXT,
ADD COLUMN     "shopifyInventoryItemId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Product_shopifyProductId_key" ON "Product"("shopifyProductId");

-- CreateIndex
CREATE UNIQUE INDEX "Product_shopifyVariantId_key" ON "Product"("shopifyVariantId");

-- CreateIndex
CREATE UNIQUE INDEX "Product_shopifyInventoryItemId_key" ON "Product"("shopifyInventoryItemId");
