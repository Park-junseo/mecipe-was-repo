/*
  Warnings:

  - You are about to drop the column `porxyUserId` on the `CafeCoupon` table. All the data in the column will be lost.
  - Added the required column `proxyUserId` to the `CafeCoupon` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "CafeCoupon" DROP CONSTRAINT "CafeCoupon_porxyUserId_fkey";

-- AlterTable
ALTER TABLE "CafeCoupon" DROP COLUMN "porxyUserId",
ADD COLUMN     "proxyUserId" INTEGER NOT NULL;

-- AddForeignKey
ALTER TABLE "CafeCoupon" ADD CONSTRAINT "CafeCoupon_proxyUserId_fkey" FOREIGN KEY ("proxyUserId") REFERENCES "ProxyUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
