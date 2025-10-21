import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ImageuploadService } from './imageupload.service';
import { AdminAuthGuard } from 'src/auth/jwt.guard.admin';

@Controller('imageupload')
export class ImageuploadController {
  constructor(private readonly imageuploadService: ImageuploadService) { }

  @Get('direct')
  @UseGuards(AdminAuthGuard)
  directUploadURL() {
    return this.imageuploadService.directUploadURL();
  }

  @Get('check/:id')
  checkUploadURL(@Param('id') imageId: string) {
    return this.imageuploadService.checkUploadURL(imageId);
  }
}
