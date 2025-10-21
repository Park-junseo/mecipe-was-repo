/*
  Warnings:

  - You are about to drop the column `isDisable` on the `MetaViewerMap` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "MetaViewerInfo" ADD COLUMN     "isDisable" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "MetaViewerMap" DROP COLUMN "isDisable";
