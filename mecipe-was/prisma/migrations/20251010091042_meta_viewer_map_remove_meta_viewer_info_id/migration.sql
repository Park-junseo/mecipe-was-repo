/*
  Warnings:

  - You are about to drop the column `metaViewerInfoId` on the `MetaViewerMap` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "MetaViewerMap" DROP CONSTRAINT "MetaViewerMap_metaViewerInfoId_fkey";

-- AlterTable
ALTER TABLE "MetaViewerMap" DROP COLUMN "metaViewerInfoId";
