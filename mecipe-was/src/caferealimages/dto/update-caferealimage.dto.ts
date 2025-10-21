import { PrimitiveOnly } from 'src/util/types';
import { Prisma } from 'prisma/basic';

export type UpdateCaferealimageDto = PrimitiveOnly<Prisma.CafeRealImageUpdateInput>;
export type UpdateCaferealimageWithIdDto = {id:number}& UpdateCaferealimageDto;