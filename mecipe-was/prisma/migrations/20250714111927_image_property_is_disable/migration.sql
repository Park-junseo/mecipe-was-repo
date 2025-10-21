-- AlterTable
ALTER TABLE "CafeRealImage" ADD COLUMN     "isDisable" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "CafeThumbnailImage" ADD COLUMN     "isDisable" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "CafeVirtualImage" ADD COLUMN     "isDisable" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "CafeVirtualLink" ADD COLUMN     "isAvaliable" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "isDisable" BOOLEAN NOT NULL DEFAULT false;
