import { Module } from '@nestjs/common';
import { CafethumbnailimagesService } from './cafethumbnailimages.service';
import { CafethumbnailimagesController } from './cafethumbnailimages.controller';
import { PrismaService } from '../global/prisma.service';

@Module({
  imports: [],
  controllers: [CafethumbnailimagesController],
  providers: [CafethumbnailimagesService, PrismaService],
})
export class CafethumbnailimagesModule {}
