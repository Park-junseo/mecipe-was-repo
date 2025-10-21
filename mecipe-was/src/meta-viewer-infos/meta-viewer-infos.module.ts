import { Module } from '@nestjs/common';
import { MetaViewerInfosService } from './meta-viewer-infos.service';
import { MetaViewerInfosController } from './meta-viewer-infos.controller';
import { PrismaService } from 'src/global/prisma.service';

@Module({
  controllers: [MetaViewerInfosController],
  providers: [MetaViewerInfosService, PrismaService]
})
export class MetaViewerInfosModule {}
