import { Prisma } from 'prisma/basic';
import { PrimitiveOnly } from 'src/util/types';

export type UpdateCouponDto = PrimitiveOnly<Prisma.CafeCouponUpdateInput>;
