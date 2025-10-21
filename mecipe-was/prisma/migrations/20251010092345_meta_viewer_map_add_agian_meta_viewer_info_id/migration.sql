/*
  Warnings:

  - Added the required column `metaViewerInfoId` to the `MetaViewerMap` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "MetaViewerMap" ADD COLUMN     "metaViewerInfoId" INTEGER NOT NULL;

-- AddForeignKey
ALTER TABLE "MetaViewerMap" ADD CONSTRAINT "MetaViewerMap_metaViewerInfoId_fkey" FOREIGN KEY ("metaViewerInfoId") REFERENCES "MetaViewerInfo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
