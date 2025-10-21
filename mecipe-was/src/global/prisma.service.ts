import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
// import { PrismaClient } from 'prisma/basic';
import * as dayjs from 'dayjs';
import { PrismaClient } from 'prisma/basic';
import { isPrimitive } from 'src/util/isPrimitive';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  async onModuleInit() {
    this.$use(async (params, next) => {
      const result = await next(params);

      return prismaTimeMod(result);
    });

    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}

// Subtract 9 hours from all the Date objects recursively
function changeToLocaleDate(obj) {
  if (!obj) return;

  for (const key of Object.keys(obj)) {
    const val = obj[key];

    if (val instanceof Date) {
      obj[key] = dayjs(val).locale('ko').format('YYYY-MM-DDTHH:mm:ss.SSSZ');
    } else if (!isPrimitive(val)) {
      changeToLocaleDate(val as any);
    }
  }
}

function prismaTimeMod<T>(value: T): T {
  if (value instanceof Date) {
    return dayjs(value).locale('ko').format('YYYY-MM-DDTHH:mm:ss.SSSZ') as any;
  }

  if (isPrimitive(value)) {
    return value;
  }

  changeToLocaleDate(value as any);

  return value;
}
