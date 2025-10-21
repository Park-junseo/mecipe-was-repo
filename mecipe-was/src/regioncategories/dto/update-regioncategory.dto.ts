import { PrimitiveOnly } from 'src/util/types';
import { Prisma } from "prisma/basic";

export type UpdateRegioncategoryDto = PrimitiveOnly<Prisma.RegionCategoryUpdateInput>;
