-- CreateTable
CREATE TABLE "CafeCouponQRCode" (
    "serialNumber" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isDisable" BOOLEAN NOT NULL DEFAULT false,
    "cafeCouponId" INTEGER,
    "size" INTEGER NOT NULL,
    "base64Data" TEXT NOT NULL,

    CONSTRAINT "CafeCouponQRCode_pkey" PRIMARY KEY ("serialNumber")
);

-- CreateIndex
CREATE UNIQUE INDEX "CafeCouponQRCode_cafeCouponId_key" ON "CafeCouponQRCode"("cafeCouponId");

-- AddForeignKey
ALTER TABLE "CafeCouponQRCode" ADD CONSTRAINT "CafeCouponQRCode_cafeCouponId_fkey" FOREIGN KEY ("cafeCouponId") REFERENCES "CafeCoupon"("id") ON DELETE SET NULL ON UPDATE CASCADE;
