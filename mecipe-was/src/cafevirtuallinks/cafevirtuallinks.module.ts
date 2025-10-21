import { Module } from '@nestjs/common';
import { CafevirtuallinksService } from './cafevirtuallinks.service';
import { CafevirtuallinksController } from './cafevirtuallinks.controller';
// import { ImageuploadModule } from 'src/imageupload/imageupload.module';
import { PrismaService } from 'src/global/prisma.service';
import { RawimageuploadModule } from 'src/rawimageupload/rawimageupload.module';

@Module({
  imports: [
    RawimageuploadModule
  ],
  controllers: [CafevirtuallinksController],
  providers: [CafevirtuallinksService, PrismaService]
})
export class CafevirtuallinksModule { }
