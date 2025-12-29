import { Prisma } from '../../../prisma/basic';
import { PrimitiveOnly } from '../../util/types';

export type CreateCafeInfoDto = PrimitiveOnly<Prisma.CafeInfoCreateInput>;
export type CreateUcheckedCafeInfoDto =
  PrimitiveOnly<Prisma.CafeInfoUncheckedCreateInput>;
