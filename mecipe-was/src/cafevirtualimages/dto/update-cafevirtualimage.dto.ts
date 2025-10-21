import { PrimitiveOnly } from 'src/util/types';
import { Prisma } from 'prisma/basic';

export type UpdateCafevirtualimageDto = PrimitiveOnly<Prisma.CafeVirtualImageUpdateInput>;
export type UpdateCafevirtualimageWithIdDto = {id:number}& UpdateCafevirtualimageDto