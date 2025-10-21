/*
  Warnings:

  - You are about to drop the column `parentId` on the `product_categories` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "product_categories" DROP CONSTRAINT "product_categories_parentId_fkey";

-- AlterTable
ALTER TABLE "product_categories" DROP COLUMN "parentId";

-- CreateTable
CREATE TABLE "closure_product_categories" (
    "ancestor" INTEGER NOT NULL,
    "descendant" INTEGER NOT NULL,
    "depth" INTEGER NOT NULL DEFAULT 0
);

-- CreateIndex
CREATE UNIQUE INDEX "closure_product_categories_ancestor_descendant_depth_key" ON "closure_product_categories"("ancestor", "descendant", "depth");

-- AddForeignKey
ALTER TABLE "closure_product_categories" ADD CONSTRAINT "closure_product_categories_ancestor_fkey" FOREIGN KEY ("ancestor") REFERENCES "product_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "closure_product_categories" ADD CONSTRAINT "closure_product_categories_descendant_fkey" FOREIGN KEY ("descendant") REFERENCES "product_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
