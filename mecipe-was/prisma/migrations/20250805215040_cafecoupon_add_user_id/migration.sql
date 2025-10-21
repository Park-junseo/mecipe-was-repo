/*
  Warnings:

  - Added the required column `tempUserId` to the `CafeCoupon` table without a default value. This is not possible if the table is not empty.
  - Added the required column `tempUserName` to the `CafeCoupon` table without a default value. This is not possible if the table is not empty.
  - Added the required column `tempUserType` to the `CafeCoupon` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "CafeCouponUserType" AS ENUM ('GENERAL', 'ZEPETO');

-- AlterTable
ALTER TABLE "CafeCoupon" ADD COLUMN     "tempUserId" TEXT NOT NULL,
ADD COLUMN     "tempUserName" TEXT NOT NULL,
ADD COLUMN     "tempUserType" "CafeCouponUserType" NOT NULL;
