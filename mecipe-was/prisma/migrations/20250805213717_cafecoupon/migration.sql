-- CreateTable
CREATE TABLE "CafeCoupon" (
    "id" SERIAL NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "name" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "serialNumber" TEXT NOT NULL,
    "startDay" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endDay" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isDisable" BOOLEAN NOT NULL DEFAULT false,
    "cafeInfoId" INTEGER NOT NULL,

    CONSTRAINT "CafeCoupon_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "CafeCoupon" ADD CONSTRAINT "CafeCoupon_cafeInfoId_fkey" FOREIGN KEY ("cafeInfoId") REFERENCES "CafeInfo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
