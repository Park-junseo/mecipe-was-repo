/*
  Warnings:

  - A unique constraint covering the columns `[memberId,proxyUserType]` on the table `ProxyUser` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "ProxyUser_memberId_proxyUserType_key" ON "ProxyUser"("memberId", "proxyUserType");
