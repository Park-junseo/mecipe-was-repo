-- DropForeignKey
ALTER TABLE "ProxyUser" DROP CONSTRAINT "ProxyUser_userId_fkey";

-- AlterTable
ALTER TABLE "ProxyUser" ALTER COLUMN "userId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "ProxyUser" ADD CONSTRAINT "ProxyUser_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
