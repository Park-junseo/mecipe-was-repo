import { Injectable, OnModuleInit, OnModuleDestroy, Logger, Optional } from '@nestjs/common';
// import { PrismaClient } from 'prisma/basic';
import * as dayjs from 'dayjs';
import { Prisma, PrismaClient } from 'prisma/basic';
import { isPrimitive } from 'src/util/isPrimitive';

@Injectable()
export class PrismaService
  extends PrismaClient<Prisma.PrismaClientOptions, Prisma.LogLevel>
  implements OnModuleInit, OnModuleDestroy {

  private readonly logger = new Logger(PrismaService.name);

  constructor(@Optional() options?: Prisma.PrismaClientOptions) {
    super({
      log: [
        { emit: 'event', level: 'query' },
        { emit: 'event', level: 'error' },
        { emit: 'event', level: 'warn' },
        { emit: 'event', level: 'info' },
      ],
      ...options,
    });
  }

  async onModuleInit() {
    this.$use(async (params, next) => {
      const result = await next(params);

      return prismaTimeMod(result);
    });

    await this.$connect();


    this.$on('error', ({ message }) => {
      this.logger.error(message);
    });
    this.$on('warn', ({ message }) => {
      this.logger.warn(message);
    });
    this.$on('info', ({ message }) => {
      this.logger.debug(message);
    });
    this.$on('query', ({ query, params }) => {
      this.logger.log(`${query}; ${params}`);
    });
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
