-- CreateEnum
CREATE TYPE "LoginType" AS ENUM ('LOCAL', 'ADMIN', 'KAKAO', 'NAVER', 'GOOGLE', 'APPLE', 'ZEPETO');

-- CreateEnum
CREATE TYPE "UserType" AS ENUM ('GENERAL', 'BUSINESS', 'ADMIN', 'MANAGER');

-- CreateEnum
CREATE TYPE "BoardType" AS ENUM ('BTALK', 'BINFORM', 'BQUESTION', 'BEVENT');

-- CreateEnum
CREATE TYPE "GovermentType" AS ENUM ('SPECIAL_CITY', 'METROPOLITAN_CITY', 'SPECIAL_SELF_GOVERNING_CITY', 'PROVINCE', 'SPECIAL_SELF_GOVERNING_PROVINCE', 'DISTRICT', 'CITY', 'COUNTY', 'TOWN', 'TOWNSHIP', 'NEIGHBORHOOD', 'PLACENAME');

-- CreateEnum
CREATE TYPE "ProxyUserType" AS ENUM ('ETC', 'WEB', 'ZEPETO', 'WEV_VIEWER');

-- CreateEnum
CREATE TYPE "CafeCouponEventType" AS ENUM ('CREATED', 'USED', 'REVOKED', 'EXPIRED', 'UPDATE');

-- CreateEnum
CREATE TYPE "CafeCouponStatus" AS ENUM ('ACTIVE', 'USED', 'REVOKED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "MetaMapType" AS ENUM ('RENDER', 'COLLIDER');

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
    "email" TEXT NOT NULL,
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
    "endDay" TIMESTAMP(3),
    "isDisable" BOOLEAN NOT NULL DEFAULT false,
    "isReplyAvaliable" BOOLEAN NOT NULL DEFAULT true,
    "userId" INTEGER NOT NULL,
    "boardType" "BoardType" NOT NULL DEFAULT 'BTALK',

    CONSTRAINT "Board_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BoardImage" (
    "id" SERIAL NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "url" TEXT NOT NULL,
    "thumbnailUrl" TEXT NOT NULL,
    "width" INTEGER NOT NULL,
    "height" INTEGER NOT NULL,
    "size" INTEGER NOT NULL,
    "isThumb" BOOLEAN NOT NULL DEFAULT false,
    "isDisable" BOOLEAN NOT NULL DEFAULT false,
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

    CONSTRAINT "BoardReply_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CafeBoard" (
    "boardId" INTEGER NOT NULL,
    "cafeInfoId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "RegionCategory" (
    "id" SERIAL NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "name" TEXT NOT NULL,
    "isDisable" BOOLEAN NOT NULL DEFAULT false,
    "govermentType" "GovermentType" NOT NULL,

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
    "code" TEXT,
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
    "thumbnailUrl" TEXT NOT NULL,
    "width" INTEGER NOT NULL,
    "height" INTEGER NOT NULL,
    "size" INTEGER NOT NULL,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "isDisable" BOOLEAN NOT NULL DEFAULT false,
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
    "isDisable" BOOLEAN NOT NULL DEFAULT false,
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
    "isDisable" BOOLEAN NOT NULL DEFAULT false,
    "cafeInfoId" INTEGER NOT NULL,

    CONSTRAINT "CafeRealImage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CafeVirtualLink" (
    "id" SERIAL NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "name" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "isDisable" BOOLEAN NOT NULL DEFAULT false,
    "isAvaliable" BOOLEAN NOT NULL DEFAULT true,
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
    "proxyUserType" "ProxyUserType" NOT NULL,
    "name" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "userId" INTEGER,

    CONSTRAINT "ProxyUser_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CafeCoupon" (
    "id" SERIAL NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "name" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "serialNumber" TEXT NOT NULL,
    "startDay" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endDay" TIMESTAMP(3),
    "isDisable" BOOLEAN NOT NULL DEFAULT false,
    "proxyUserId" INTEGER NOT NULL,
    "cafeCouponGroupId" INTEGER NOT NULL,

    CONSTRAINT "CafeCoupon_pkey" PRIMARY KEY ("id")
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

-- CreateTable
CREATE TABLE "CafeCouponQRCode" (
    "serialNumber" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isDisable" BOOLEAN NOT NULL DEFAULT false,
    "cafeCouponId" INTEGER,
    "size" INTEGER NOT NULL,
    "base64Data" TEXT NOT NULL,

    CONSTRAINT "CafeCouponQRCode_pkey" PRIMARY KEY ("serialNumber")
);

-- CreateTable
CREATE TABLE "MetaViewerInfo" (
    "id" SERIAL NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "code" TEXT NOT NULL,
    "isDisable" BOOLEAN NOT NULL DEFAULT false,
    "worldData" JSONB NOT NULL,
    "cafeInfoId" INTEGER NOT NULL,

    CONSTRAINT "MetaViewerInfo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MetaViewerMap" (
    "id" SERIAL NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "type" "MetaMapType" NOT NULL,
    "version" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "url" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "contentKey" TEXT,
    "isDraco" BOOLEAN NOT NULL,
    "metaViewerInfoId" INTEGER NOT NULL,

    CONSTRAINT "MetaViewerMap_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MetaViewerActiveMap" (
    "id" SERIAL NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "metaViewerInfoId" INTEGER NOT NULL,
    "activeRenderMapId" INTEGER NOT NULL,
    "activeColliderMapId" INTEGER NOT NULL,

    CONSTRAINT "MetaViewerActiveMap_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_categories" (
    "id" SERIAL NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isDisable" BOOLEAN NOT NULL DEFAULT false,
    "code" TEXT NOT NULL,

    CONSTRAINT "product_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "closure_product_categories" (
    "ancestor" INTEGER NOT NULL,
    "descendant" INTEGER NOT NULL,
    "depth" INTEGER NOT NULL DEFAULT 0
);

-- CreateTable
CREATE TABLE "products" (
    "id" SERIAL NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "price" INTEGER NOT NULL,
    "originalPrice" INTEGER,
    "stockQuantity" INTEGER NOT NULL DEFAULT 0,
    "minOrderQuantity" INTEGER NOT NULL DEFAULT 1,
    "isDisable" BOOLEAN NOT NULL DEFAULT false,
    "isAvailable" BOOLEAN NOT NULL DEFAULT true,
    "categoryId" INTEGER NOT NULL,
    "cafeInfoId" INTEGER,
    "productRedirectUrl" TEXT,
    "isSignature" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wishlist_products" (
    "id" SERIAL NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "productId" INTEGER NOT NULL,
    "proxyUserId" INTEGER NOT NULL,

    CONSTRAINT "wishlist_products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_images" (
    "id" SERIAL NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "url" TEXT NOT NULL,
    "thumbnailUrl" TEXT NOT NULL,
    "width" INTEGER NOT NULL,
    "height" INTEGER NOT NULL,
    "size" INTEGER NOT NULL,
    "isDisable" BOOLEAN NOT NULL DEFAULT false,
    "isThumb" BOOLEAN NOT NULL DEFAULT false,
    "productId" INTEGER NOT NULL,

    CONSTRAINT "product_images_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_loginType_loginId_key" ON "User"("loginType", "loginId");

-- CreateIndex
CREATE UNIQUE INDEX "CafeBoard_boardId_cafeInfoId_key" ON "CafeBoard"("boardId", "cafeInfoId");

-- CreateIndex
CREATE UNIQUE INDEX "ClosureRegionCategory_ancestor_descendant_depth_key" ON "ClosureRegionCategory"("ancestor", "descendant", "depth");

-- CreateIndex
CREATE UNIQUE INDEX "CafeInfo_code_key" ON "CafeInfo"("code");

-- CreateIndex
CREATE UNIQUE INDEX "CafeVirtualLinkThumbnailImage_cafeVirtualLinkId_key" ON "CafeVirtualLinkThumbnailImage"("cafeVirtualLinkId");

-- CreateIndex
CREATE UNIQUE INDEX "CafeCouponGroup_code_key" ON "CafeCouponGroup"("code");

-- CreateIndex
CREATE UNIQUE INDEX "CafeCouponGoupPartner_cafeCouponGroupId_cafeInfoId_key" ON "CafeCouponGoupPartner"("cafeCouponGroupId", "cafeInfoId");

-- CreateIndex
CREATE UNIQUE INDEX "ProxyUser_memberId_proxyUserType_key" ON "ProxyUser"("memberId", "proxyUserType");

-- CreateIndex
CREATE UNIQUE INDEX "CafeCoupon_serialNumber_key" ON "CafeCoupon"("serialNumber");

-- CreateIndex
CREATE UNIQUE INDEX "MetaViewerInfo_code_key" ON "MetaViewerInfo"("code");

-- CreateIndex
CREATE UNIQUE INDEX "MetaViewerActiveMap_metaViewerInfoId_key" ON "MetaViewerActiveMap"("metaViewerInfoId");

-- CreateIndex
CREATE UNIQUE INDEX "product_categories_code_key" ON "product_categories"("code");

-- CreateIndex
CREATE UNIQUE INDEX "closure_product_categories_ancestor_descendant_depth_key" ON "closure_product_categories"("ancestor", "descendant", "depth");

-- CreateIndex
CREATE UNIQUE INDEX "products_code_key" ON "products"("code");

-- CreateIndex
CREATE UNIQUE INDEX "wishlist_products_productId_proxyUserId_key" ON "wishlist_products"("productId", "proxyUserId");

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
ALTER TABLE "CafeBoard" ADD CONSTRAINT "CafeBoard_boardId_fkey" FOREIGN KEY ("boardId") REFERENCES "Board"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CafeBoard" ADD CONSTRAINT "CafeBoard_cafeInfoId_fkey" FOREIGN KEY ("cafeInfoId") REFERENCES "CafeInfo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

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

-- AddForeignKey
ALTER TABLE "CafeCouponGoupPartner" ADD CONSTRAINT "CafeCouponGoupPartner_cafeCouponGroupId_fkey" FOREIGN KEY ("cafeCouponGroupId") REFERENCES "CafeCouponGroup"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CafeCouponGoupPartner" ADD CONSTRAINT "CafeCouponGoupPartner_cafeInfoId_fkey" FOREIGN KEY ("cafeInfoId") REFERENCES "CafeInfo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProxyUser" ADD CONSTRAINT "ProxyUser_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CafeCoupon" ADD CONSTRAINT "CafeCoupon_proxyUserId_fkey" FOREIGN KEY ("proxyUserId") REFERENCES "ProxyUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CafeCoupon" ADD CONSTRAINT "CafeCoupon_cafeCouponGroupId_fkey" FOREIGN KEY ("cafeCouponGroupId") REFERENCES "CafeCouponGroup"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CafeCouponHistory" ADD CONSTRAINT "CafeCouponHistory_cafeCouponId_fkey" FOREIGN KEY ("cafeCouponId") REFERENCES "CafeCoupon"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CafeCouponHistory" ADD CONSTRAINT "CafeCouponHistory_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CafeCouponQRCode" ADD CONSTRAINT "CafeCouponQRCode_cafeCouponId_fkey" FOREIGN KEY ("cafeCouponId") REFERENCES "CafeCoupon"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MetaViewerInfo" ADD CONSTRAINT "MetaViewerInfo_cafeInfoId_fkey" FOREIGN KEY ("cafeInfoId") REFERENCES "CafeInfo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MetaViewerMap" ADD CONSTRAINT "MetaViewerMap_metaViewerInfoId_fkey" FOREIGN KEY ("metaViewerInfoId") REFERENCES "MetaViewerInfo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MetaViewerActiveMap" ADD CONSTRAINT "MetaViewerActiveMap_metaViewerInfoId_fkey" FOREIGN KEY ("metaViewerInfoId") REFERENCES "MetaViewerInfo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MetaViewerActiveMap" ADD CONSTRAINT "MetaViewerActiveMap_activeRenderMapId_fkey" FOREIGN KEY ("activeRenderMapId") REFERENCES "MetaViewerMap"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MetaViewerActiveMap" ADD CONSTRAINT "MetaViewerActiveMap_activeColliderMapId_fkey" FOREIGN KEY ("activeColliderMapId") REFERENCES "MetaViewerMap"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "closure_product_categories" ADD CONSTRAINT "closure_product_categories_ancestor_fkey" FOREIGN KEY ("ancestor") REFERENCES "product_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "closure_product_categories" ADD CONSTRAINT "closure_product_categories_descendant_fkey" FOREIGN KEY ("descendant") REFERENCES "product_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "product_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_cafeInfoId_fkey" FOREIGN KEY ("cafeInfoId") REFERENCES "CafeInfo"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wishlist_products" ADD CONSTRAINT "wishlist_products_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wishlist_products" ADD CONSTRAINT "wishlist_products_proxyUserId_fkey" FOREIGN KEY ("proxyUserId") REFERENCES "ProxyUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_images" ADD CONSTRAINT "product_images_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
