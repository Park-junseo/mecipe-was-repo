/*
  Warnings:

  - Added the required column `type` to the `CafeVirtualLink` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "CafeVirtualLink" ADD COLUMN     "type" TEXT NOT NULL;
