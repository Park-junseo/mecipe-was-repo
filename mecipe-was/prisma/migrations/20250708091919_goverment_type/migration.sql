/*
  Warnings:

  - Added the required column `GovermentType` to the `RegionCategory` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "RegionCategory" ADD COLUMN     "GovermentType" "GovermentType" NOT NULL;
