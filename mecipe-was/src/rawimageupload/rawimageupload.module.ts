import { Module } from '@nestjs/common';
import { RawimageuploadService } from './rawimageupload.service';
import { RawimageuploadController } from './rawimageupload.controller';
import { MulterModule } from '@nestjs/platform-express';
import { getStorageVariant } from 'src/util/multer';

@Module({
  imports: [
    MulterModule.register({
      storage: getStorageVariant(),
    }),
  ],
  controllers: [RawimageuploadController],
  providers: [RawimageuploadService],
  exports:[RawimageuploadService]
})
export class RawimageuploadModule { }
