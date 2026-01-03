import { Prisma } from '../../../prisma/basic';
import { PrimitiveOnly } from '../../util/types';

export type CreateUserDto = PrimitiveOnly<Prisma.UserCreateInput>;
