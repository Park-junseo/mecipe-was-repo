import { Controller, Header, Post, Req, UploadedFile, UploadedFiles, UseGuards, UseInterceptors } from '@nestjs/common';
import { RawimageuploadService } from './rawimageupload.service';
import { FileFieldsInterceptor, FileInterceptor } from '@nestjs/platform-express';
import { AdminAuthGuard } from 'src/auth/jwt.guard.admin';
import { Request } from 'express';

@Controller('rawimageupload')
export class RawimageuploadController {
  constructor(private readonly rawimageuploadService: RawimageuploadService) { }

  @Post('upload')
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'image' },
      { name: 'thumbnail' },
    ]),
  )
  @UseGuards(AdminAuthGuard)
  uploadImage(
    @UploadedFiles() files: {
      image: Express.Multer.File[];
      thumbnail?: Express.Multer.File[];
    }
  ) {
    return this.rawimageuploadService.uploadImage(
      files.image,
      files.thumbnail ?? undefined
    );
  }

  @Post('testupload')
  @UseInterceptors(
    FileInterceptor('image'),
  )
  uploadImagetest(
    @Req() req: Request,
    @UploadedFile() image: Express.Multer.File) {
    console.log('test Headers:', req.headers);
    console.log('test Body:', req.body);
    console.log('test Files:', (req as any).files);

    console.log("test uploadImage", image);
  }
}
