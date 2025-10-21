/*
  Warnings:

  - Added the required column `thumbnailUrl` to the `CafeThumbnailImage` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "CafeThumbnailImage" ADD COLUMN     "thumbnailUrl" TEXT NOT NULL;
