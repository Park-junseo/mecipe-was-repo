/*
  Warnings:

  - You are about to drop the `product_urls` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "product_urls" DROP CONSTRAINT "product_urls_productId_fkey";

-- AlterTable
ALTER TABLE "products" ADD COLUMN     "productRedirectUrl" TEXT;

-- DropTable
DROP TABLE "product_urls";
