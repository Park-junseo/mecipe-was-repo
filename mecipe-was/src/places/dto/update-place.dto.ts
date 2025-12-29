import { PrimitiveOnly } from '../../util/types';
import { Prisma } from '../../../prisma/basic';

export type UpdateCafeInoDto = PrimitiveOnly<Prisma.CafeInfoUpdateInput>;
