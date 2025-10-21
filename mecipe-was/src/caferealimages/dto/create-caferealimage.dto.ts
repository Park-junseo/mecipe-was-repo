import { Prisma } from "prisma/basic";
import { PrimitiveOnly } from "src/util/types";

export type CreateCaferealimageDto = PrimitiveOnly<Prisma.CafeRealImageCreateInput>;
export type CreateUnCheckedCaferealimageDto = PrimitiveOnly<Prisma.CafeRealImageUncheckedCreateInput>;
