import { Prisma } from "prisma/basic";
import { PrimitiveOnly } from "src/util/types";

export type CreateCouponDto = PrimitiveOnly<Prisma.CafeCouponCreateInput>;
export type CreateCouponDataDto = {
    name?: string;
    content?: string;
    startDay?: string | Date;
    endDay?: string | Date;
    groupCode: string;
    memberId: string;
    userType: string;
}