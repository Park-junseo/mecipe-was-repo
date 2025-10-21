-- CreateEnum
CREATE TYPE "LoginType" AS ENUM ('LOCAL', 'ADMIN');

-- CreateEnum
CREATE TYPE "UserType" AS ENUM ('GENERAL', 'BUSINESS', 'ADMIN', 'MANAGER');

-- CreateEnum
CREATE TYPE "BoardType" AS ENUM ('BTALK', 'BINFORM', 'BQUESTION');

-- CreateEnum
CREATE TYPE "GovermentType" AS ENUM ('SPECIAL_CITY', 'METROPOLITAN_CITY', 'SPECIAL_SELF_GOVERNING_CITY', 'PROVINCE', 'SPECIAL_SELF_GOVERNING_PROVINCE', 'DISTRICT', 'CITY', 'COUNTY', 'TOWN', 'TOWNSHIP', 'NEIGHBORHOOD', 'PLACENAME');

-- CreateTable
CREATE TABLE "User" (
    "id" SERIAL NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "loginId" TEXT NOT NULL,
    "loginPw" TEXT,
    "username" TEXT NOT NULL,
    "loginType" "LoginType" NOT NULL,
    "userType" "UserType" NOT NULL,
    "nickname" TEXT NOT NULL,
    "email" TEXT NOT NULL DEFAULT E'',
    "isDisable" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notice" (
    "id" SERIAL NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "title" TEXT NOT NULL,
    "content" TEXT,
    "link" TEXT,
    "userId" INTEGER NOT NULL,

    CONSTRAINT "Notice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Board" (
    "id" SERIAL NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "title" TEXT NOT NULL,
    "content" TEXT,
    "link" TEXT,
    "startDay" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endDay" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isDisable" BOOLEAN NOT NULL DEFAULT false,
    "userId" INTEGER NOT NULL,
    "boardType" "BoardType" NOT NULL DEFAULT E'BTALK',

    CONSTRAINT "Board_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BoardImage" (
    "id" SERIAL NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "url" TEXT NOT NULL,
    "width" INTEGER NOT NULL,
    "height" INTEGER NOT NULL,
    "size" INTEGER NOT NULL,
    "isThumb" BOOLEAN NOT NULL DEFAULT false,
    "boardId" INTEGER NOT NULL,

    CONSTRAINT "BoardImage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BoardReply" (
    "id" SERIAL NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),
    "content" TEXT NOT NULL,
    "isDisable" BOOLEAN NOT NULL DEFAULT false,
    "userId" INTEGER NOT NULL,
    "boardId" INTEGER NOT NULL,
    "boardReplyId" INTEGER,
    "boardType" "BoardType" NOT NULL DEFAULT E'BTALK',

    CONSTRAINT "BoardReply_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RegionCategory" (
    "id" SERIAL NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "name" TEXT NOT NULL,
    "isDisable" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "RegionCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClosureRegionCategory" (
    "ancestor" INTEGER NOT NULL,
    "descendant" INTEGER NOT NULL,
    "depth" INTEGER NOT NULL DEFAULT 0
);

-- CreateTable
CREATE TABLE "CafeInfo" (
    "id" SERIAL NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isDisable" BOOLEAN NOT NULL DEFAULT false,
    "name" TEXT NOT NULL,
    "regionCategoryId" INTEGER NOT NULL,
    "address" TEXT NOT NULL,
    "directions" TEXT NOT NULL,
    "businessNumber" TEXT NOT NULL,
    "ceoName" TEXT NOT NULL,

    CONSTRAINT "CafeInfo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CafeThumbnailImage" (
    "id" SERIAL NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "url" TEXT NOT NULL,
    "width" INTEGER NOT NULL,
    "height" INTEGER NOT NULL,
    "size" INTEGER NOT NULL,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "cafeInfoId" INTEGER NOT NULL,

    CONSTRAINT "CafeThumbnailImage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CafeVirtualImage" (
    "id" SERIAL NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "url" TEXT NOT NULL,
    "width" INTEGER NOT NULL,
    "height" INTEGER NOT NULL,
    "size" INTEGER NOT NULL,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "cafeInfoId" INTEGER NOT NULL,

    CONSTRAINT "CafeVirtualImage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CafeRealImage" (
    "id" SERIAL NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "url" TEXT NOT NULL,
    "width" INTEGER NOT NULL,
    "height" INTEGER NOT NULL,
    "size" INTEGER NOT NULL,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "cafeInfoId" INTEGER NOT NULL,

    CONSTRAINT "CafeRealImage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CafeVirtualLink" (
    "id" SERIAL NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "name" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "cafeInfoId" INTEGER NOT NULL,

    CONSTRAINT "CafeVirtualLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CafeVirtualLinkThumbnailImage" (
    "id" SERIAL NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "url" TEXT NOT NULL,
    "width" INTEGER NOT NULL,
    "height" INTEGER NOT NULL,
    "size" INTEGER NOT NULL,
    "cafeVirtualLinkId" INTEGER NOT NULL,

    CONSTRAINT "CafeVirtualLinkThumbnailImage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_loginType_loginId_key" ON "User"("loginType", "loginId");

-- CreateIndex
CREATE UNIQUE INDEX "BoardImage_boardId_key" ON "BoardImage"("boardId");

-- CreateIndex
CREATE UNIQUE INDEX "ClosureRegionCategory_ancestor_descendant_depth_key" ON "ClosureRegionCategory"("ancestor", "descendant", "depth");

-- CreateIndex
CREATE UNIQUE INDEX "CafeVirtualLinkThumbnailImage_cafeVirtualLinkId_key" ON "CafeVirtualLinkThumbnailImage"("cafeVirtualLinkId");

-- AddForeignKey
ALTER TABLE "Notice" ADD CONSTRAINT "Notice_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Board" ADD CONSTRAINT "Board_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BoardImage" ADD CONSTRAINT "BoardImage_boardId_fkey" FOREIGN KEY ("boardId") REFERENCES "Board"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BoardReply" ADD CONSTRAINT "BoardReply_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BoardReply" ADD CONSTRAINT "BoardReply_boardId_fkey" FOREIGN KEY ("boardId") REFERENCES "Board"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BoardReply" ADD CONSTRAINT "BoardReply_boardReplyId_fkey" FOREIGN KEY ("boardReplyId") REFERENCES "BoardReply"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClosureRegionCategory" ADD CONSTRAINT "ClosureRegionCategory_ancestor_fkey" FOREIGN KEY ("ancestor") REFERENCES "RegionCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClosureRegionCategory" ADD CONSTRAINT "ClosureRegionCategory_descendant_fkey" FOREIGN KEY ("descendant") REFERENCES "RegionCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CafeInfo" ADD CONSTRAINT "CafeInfo_regionCategoryId_fkey" FOREIGN KEY ("regionCategoryId") REFERENCES "RegionCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CafeThumbnailImage" ADD CONSTRAINT "CafeThumbnailImage_cafeInfoId_fkey" FOREIGN KEY ("cafeInfoId") REFERENCES "CafeInfo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CafeVirtualImage" ADD CONSTRAINT "CafeVirtualImage_cafeInfoId_fkey" FOREIGN KEY ("cafeInfoId") REFERENCES "CafeInfo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CafeRealImage" ADD CONSTRAINT "CafeRealImage_cafeInfoId_fkey" FOREIGN KEY ("cafeInfoId") REFERENCES "CafeInfo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CafeVirtualLink" ADD CONSTRAINT "CafeVirtualLink_cafeInfoId_fkey" FOREIGN KEY ("cafeInfoId") REFERENCES "CafeInfo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CafeVirtualLinkThumbnailImage" ADD CONSTRAINT "CafeVirtualLinkThumbnailImage_cafeVirtualLinkId_fkey" FOREIGN KEY ("cafeVirtualLinkId") REFERENCES "CafeVirtualLink"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
