/*
  Warnings:

  - You are about to drop the column `ProxyUserType` on the `ProxyUser` table. All the data in the column will be lost.
  - Added the required column `proxyUserType` to the `ProxyUser` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "ProxyUser" DROP COLUMN "ProxyUserType",
ADD COLUMN     "proxyUserType" "ProxyUserType" NOT NULL;
