import { Prisma } from "prisma/basic";
import { PrimitiveOnly } from "src/util/types";

export type CreateCafevirtualimageDto = PrimitiveOnly<Prisma.CafeVirtualImageCreateInput>;
export type CreateUnCheckedCafevirtualimageDto = PrimitiveOnly<Prisma.CafeVirtualImageUncheckedCreateInput>;