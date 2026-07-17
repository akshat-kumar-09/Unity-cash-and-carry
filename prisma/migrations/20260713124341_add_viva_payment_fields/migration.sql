-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "paidAt" TIMESTAMP(3),
ADD COLUMN     "paymentMethod" TEXT,
ADD COLUMN     "paymentStatus" TEXT NOT NULL DEFAULT 'unpaid',
ADD COLUMN     "vivaOrderCode" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Order_vivaOrderCode_key" ON "Order"("vivaOrderCode");
