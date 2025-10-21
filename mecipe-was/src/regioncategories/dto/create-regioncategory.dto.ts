import { Prisma } from "prisma/basic";
import { PrimitiveOnly } from "src/util/types";

export type CreateRegioncategoryDto = PrimitiveOnly<Prisma.RegionCategoryCreateInput>;
export type CreateUncheckedRegioncategoryDto = PrimitiveOnly<Prisma.RegionCategoryUncheckedCreateInput>;