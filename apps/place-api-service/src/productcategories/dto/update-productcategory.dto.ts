import { PrimitiveOnly } from '../../util/types';
import { Prisma } from '../../../prisma/basic';

export type UpdateProductcategoryDto =
  PrimitiveOnly<Prisma.ProductCategoryUpdateInput>;
