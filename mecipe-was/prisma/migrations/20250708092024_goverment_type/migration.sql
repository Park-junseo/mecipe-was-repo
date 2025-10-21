/*
  Warnings:

  - You are about to drop the column `GovermentType` on the `RegionCategory` table. All the data in the column will be lost.
  - Added the required column `govermentType` to the `RegionCategory` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "RegionCategory" DROP COLUMN "GovermentType",
ADD COLUMN     "govermentType" "GovermentType" NOT NULL;
