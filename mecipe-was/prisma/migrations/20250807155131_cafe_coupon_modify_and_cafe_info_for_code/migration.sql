/*
  Warnings:

  - You are about to drop the column `cafeInfoId` on the `CafeCoupon` table. All the data in the column will be lost.
  - You are about to drop the column `tempUserId` on the `CafeCoupon` table. All the data in the column will be lost.
  - You are about to drop the column `tempUserName` on the `CafeCoupon` table. All the data in the column will be lost.
  - You are about to drop the column `tempUserType` on the `CafeCoupon` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[serialNumber]` on the table `CafeCoupon` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[code]` on the table `CafeInfo` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `cafeCouponGroupId` to the `CafeCoupon` table without a default value. This is not possible if the table is not empty.
  - Added the required column `porxyUserId` to the `CafeCoupon` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "ProxyUserType" AS ENUM ('ETC', 'WEB', 'ZEPETO', 'WEV_VIEWER');

-- CreateEnum
CREATE TYPE "CafeCouponEventType" AS ENUM ('CREATED', 'USED', 'REVOKED', 'EXPIRED', 'UPDATE');

-- CreateEnum
CREATE TYPE "CafeCouponStatus" AS ENUM ('ACTIVE', 'USED', 'REVOKED', 'EXPIRED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "LoginType" ADD VALUE 'KAKAO';
ALTER TYPE "LoginType" ADD VALUE 'NAVER';
ALTER TYPE "LoginType" ADD VALUE 'GOOGLE';
ALTER TYPE "LoginType" ADD VALUE 'APPLE';
ALTER TYPE "LoginType" ADD VALUE 'ZEPETO';

-- DropForeignKey
ALTER TABLE "CafeCoupon" DROP CONSTRAINT "CafeCoupon_cafeInfoId_fkey";

-- AlterTable
ALTER TABLE "CafeCoupon" DROP COLUMN "cafeInfoId",
DROP COLUMN "tempUserId",
DROP COLUMN "tempUserName",
DROP COLUMN "tempUserType",
ADD COLUMN     "cafeCouponGroupId" INTEGER NOT NULL,
ADD COLUMN     "porxyUserId" INTEGER NOT NULL,
ALTER COLUMN "endDay" DROP NOT NULL,
ALTER COLUMN "endDay" DROP DEFAULT;

-- AlterTable
ALTER TABLE "CafeInfo" ADD COLUMN     "code" TEXT;

-- DropEnum
DROP TYPE "CafeCouponUserType";

-- CreateTable
CREATE TABLE "CafeCouponGroup" (
    "id" SERIAL NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "tag" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "isDisable" BOOLEAN NOT NULL DEFAULT false,
    "startDay" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endDay" TIMESTAMP(3) NOT NULL,
    "issuanceStartDay" TIMESTAMP(3) NOT NULL,
    "issuanceEndDay" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CafeCouponGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CafeCouponGoupPartner" (
    "cafeCouponGroupId" INTEGER NOT NULL,
    "cafeInfoId" INTEGER NOT NULL
);

-- CreateTable
CREATE TABLE "ProxyUser" (
    "id" SERIAL NOT NULL,
    "memberId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ProxyUserType" "ProxyUserType" NOT NULL,
    "name" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,

    CONSTRAINT "ProxyUser_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CafeCouponHistory" (
    "id" SERIAL NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "cafeCouponId" INTEGER NOT NULL,
    "eventType" "CafeCouponEventType" NOT NULL,
    "description" TEXT NOT NULL,
    "actorId" INTEGER NOT NULL,
    "statusBefore" "CafeCouponStatus",
    "statusAfter" "CafeCouponStatus",

    CONSTRAINT "CafeCouponHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CafeCouponGroup_code_key" ON "CafeCouponGroup"("code");

-- CreateIndex
CREATE UNIQUE INDEX "CafeCouponGoupPartner_cafeCouponGroupId_cafeInfoId_key" ON "CafeCouponGoupPartner"("cafeCouponGroupId", "cafeInfoId");

-- CreateIndex
CREATE UNIQUE INDEX "CafeCoupon_serialNumber_key" ON "CafeCoupon"("serialNumber");

-- CreateIndex
CREATE UNIQUE INDEX "CafeInfo_code_key" ON "CafeInfo"("code");

-- AddForeignKey
ALTER TABLE "CafeCouponGoupPartner" ADD CONSTRAINT "CafeCouponGoupPartner_cafeCouponGroupId_fkey" FOREIGN KEY ("cafeCouponGroupId") REFERENCES "CafeCouponGroup"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CafeCouponGoupPartner" ADD CONSTRAINT "CafeCouponGoupPartner_cafeInfoId_fkey" FOREIGN KEY ("cafeInfoId") REFERENCES "CafeInfo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProxyUser" ADD CONSTRAINT "ProxyUser_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CafeCoupon" ADD CONSTRAINT "CafeCoupon_porxyUserId_fkey" FOREIGN KEY ("porxyUserId") REFERENCES "ProxyUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CafeCoupon" ADD CONSTRAINT "CafeCoupon_cafeCouponGroupId_fkey" FOREIGN KEY ("cafeCouponGroupId") REFERENCES "CafeCouponGroup"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CafeCouponHistory" ADD CONSTRAINT "CafeCouponHistory_cafeCouponId_fkey" FOREIGN KEY ("cafeCouponId") REFERENCES "CafeCoupon"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CafeCouponHistory" ADD CONSTRAINT "CafeCouponHistory_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
