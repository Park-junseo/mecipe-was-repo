import { Prisma } from '../../../prisma/basic';
import { PrimitiveOnly } from '../../util/types';

export type UpdateCouponDto = PrimitiveOnly<Prisma.CafeCouponUpdateInput>;
