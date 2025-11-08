import { Injectable, OnModuleInit, OnModuleDestroy, Logger, Optional } from '@nestjs/common';
// import { PrismaClient } from 'prisma/basic';
import * as dayjs from 'dayjs';
import { Prisma, PrismaClient } from 'prisma/basic';
import { FilteredOnlyRequired, RequiredKeys } from 'src/util/types';
import { isPrimitive } from 'src/util/isPrimitive';

type DefaultClientOptions = Pick<Prisma.PrismaClientOptions, 'log'>

type IterableSubset<T> = {
  [key in keyof T]: T[key];
}

@Injectable()
export class PrismaService<TClientOptions extends Prisma.PrismaClientOptions = Prisma.PrismaClientOptions>
  extends PrismaClient<DefaultClientOptions & TClientOptions, Prisma.LogLevel>
  implements OnModuleInit, OnModuleDestroy {

  private readonly logger = new Logger(PrismaService.name);

  // constructor(@Optional() optionsArg: IterableSubset<TClientOptions>|undefined = undefined) {
  constructor(@Optional() optionsArg: Prisma.Subset<TClientOptions, Prisma.PrismaClientOptions>|undefined = undefined) {
    const options: Prisma.Subset<DefaultClientOptions & TClientOptions, Prisma.PrismaClientOptions> = {
      log: [
        { emit: 'event', level: 'query' },
        { emit: 'event', level: 'error' },
        { emit: 'event', level: 'warn' },
        { emit: 'event', level: 'info' },
      ],
      ...(optionsArg ?? {}),
    } as Prisma.Subset<DefaultClientOptions & TClientOptions, Prisma.PrismaClientOptions>;
    super(options);
  }

  async onModuleInit() {
    // this.$extends({
    //     result: (args) => {
    //       return prismaTimeMod(args);
    //     },
    // });

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