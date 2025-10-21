import { PrimitiveOnly } from 'src/util/types';
import { Prisma } from "prisma/basic";

export type UpdateCafeInoDto = PrimitiveOnly<Prisma.CafeInfoUpdateInput>;
