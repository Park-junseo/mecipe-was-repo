import { Module } from '@nestjs/common';
import { CafevirtuallinksService } from './cafevirtuallinks.service';
import { CafevirtuallinksController } from './cafevirtuallinks.controller';
import { PrismaService } from 'src/global/prisma.service';

@Module({
  imports: [],
  controllers: [CafevirtuallinksController],
  providers: [CafevirtuallinksService, PrismaService],
})
export class CafevirtuallinksModule {}
