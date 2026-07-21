-- AlterTable
ALTER TABLE "User" ADD COLUMN     "postcode" TEXT,
ADD COLUMN     "approvedAt" TIMESTAMP(3),
ADD COLUMN     "welcomeGameCompletedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "isCatalogueVisible" BOOLEAN NOT NULL DEFAULT true;
