import { Module } from '@nestjs/common';
import { CafevirtualimagesService } from './cafevirtualimages.service';
import { CafevirtualimagesController } from './cafevirtualimages.controller';
import { PrismaService } from 'src/global/prisma.service';

@Module({
  imports: [],
  controllers: [CafevirtualimagesController],
  providers: [CafevirtualimagesService, PrismaService],
})
export class CafevirtualimagesModule {}
