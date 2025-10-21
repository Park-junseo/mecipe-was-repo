/*
  Warnings:

  - Added the required column `thumbnailUrl` to the `BoardImage` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "BoardImage" ADD COLUMN     "thumbnailUrl" TEXT NOT NULL;
