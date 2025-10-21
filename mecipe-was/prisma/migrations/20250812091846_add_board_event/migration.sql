-- AlterEnum
ALTER TYPE "BoardType" ADD VALUE 'BEVENT';

-- AlterTable
ALTER TABLE "Board" ADD COLUMN     "isReplyAvaliable" BOOLEAN NOT NULL DEFAULT true,
ALTER COLUMN "endDay" DROP NOT NULL,
ALTER COLUMN "endDay" DROP DEFAULT;

-- CreateTable
CREATE TABLE "CafeBoard" (
    "boardId" INTEGER NOT NULL,
    "cafeInfoId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "CafeBoard_boardId_cafeInfoId_key" ON "CafeBoard"("boardId", "cafeInfoId");

-- AddForeignKey
ALTER TABLE "CafeBoard" ADD CONSTRAINT "CafeBoard_boardId_fkey" FOREIGN KEY ("boardId") REFERENCES "Board"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CafeBoard" ADD CONSTRAINT "CafeBoard_cafeInfoId_fkey" FOREIGN KEY ("cafeInfoId") REFERENCES "CafeInfo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
