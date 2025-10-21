import { Prisma } from "prisma/basic";
import { PrimitiveOnly } from "src/util/types";

export type CreateCafethumbnailimageDto = PrimitiveOnly<Prisma.CafeThumbnailImageCreateInput>;
export type CreateUnCheckedCafethumbnailimageDto = Omit<PrimitiveOnly<Prisma.CafeThumbnailImageUncheckedCreateInput>,"id">;
