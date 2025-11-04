import { Prisma } from 'prisma/basic';

export type ModelName = Prisma.ModelName;

export type SelectQuery = Record<string, boolean | { select: SelectQuery }>;