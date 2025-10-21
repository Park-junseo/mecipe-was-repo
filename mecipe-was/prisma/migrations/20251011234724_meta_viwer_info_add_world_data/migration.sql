/*
  Warnings:

  - Added the required column `worldData` to the `MetaViewerInfo` table without a default value. This is not possible if the table is not empty.
  - Added the required column `isDraco` to the `MetaViewerMap` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "MetaViewerInfo" ADD COLUMN     "worldData" JSONB NOT NULL;

-- AlterTable
ALTER TABLE "MetaViewerMap" ADD COLUMN     "isDraco" BOOLEAN NOT NULL;
