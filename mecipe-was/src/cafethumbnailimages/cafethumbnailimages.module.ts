import { Module } from '@nestjs/common';
import { CafethumbnailimagesService } from './cafethumbnailimages.service';
import { CafethumbnailimagesController } from './cafethumbnailimages.controller';
// import { ImageuploadModule } from 'src/imageupload/imageupload.module';
import { PrismaService } from 'src/global/prisma.service';
import { RawimageuploadModule } from 'src/rawimageupload/rawimageupload.module';

@Module({
  imports: [RawimageuploadModule],
  controllers: [CafethumbnailimagesController],
  providers: [CafethumbnailimagesService, PrismaService],
})
export class CafethumbnailimagesModule {}
