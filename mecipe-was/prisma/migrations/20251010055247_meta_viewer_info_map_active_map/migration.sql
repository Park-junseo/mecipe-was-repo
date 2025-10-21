-- CreateEnum
CREATE TYPE "MetaMapType" AS ENUM ('RENDER', 'COLLIDER');

-- CreateTable
CREATE TABLE "MetaViewerInfo" (
    "id" SERIAL NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "code" TEXT NOT NULL,
    "cafeInfoId" INTEGER NOT NULL,

    CONSTRAINT "MetaViewerInfo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MetaViewerMap" (
    "id" SERIAL NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "type" "MetaMapType" NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 0,
    "url" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "isDisable" BOOLEAN NOT NULL DEFAULT false,
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

-- CreateIndex
CREATE UNIQUE INDEX "MetaViewerInfo_code_key" ON "MetaViewerInfo"("code");

-- CreateIndex
CREATE UNIQUE INDEX "MetaViewerActiveMap_metaViewerInfoId_key" ON "MetaViewerActiveMap"("metaViewerInfoId");

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
