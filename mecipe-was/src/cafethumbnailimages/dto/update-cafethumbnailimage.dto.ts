import { PrimitiveOnly } from 'src/util/types';
import { Prisma } from 'prisma/basic';

export type UpdateCafethumbnailimageDto = PrimitiveOnly<Prisma.CafeThumbnailImageUpdateInput>;
export type UpdateCafethumbnailimageWithIdDto = {id:number}& UpdateCafethumbnailimageDto