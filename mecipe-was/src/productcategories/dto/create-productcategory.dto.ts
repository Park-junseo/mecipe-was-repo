import { Prisma } from '../../../prisma/basic';
import { PrimitiveOnly } from '../../util/types';

export type CreateProductcategoryDto =
  PrimitiveOnly<Prisma.ProductCategoryCreateInput>;
export type CreateUncheckedProductcategoryDto =
  PrimitiveOnly<Prisma.ProductCategoryUncheckedCreateInput>;
