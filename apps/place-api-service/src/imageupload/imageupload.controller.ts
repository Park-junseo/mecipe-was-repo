import { Controller, Get, Param } from '@nestjs/common';
import { ImageuploadService } from './imageupload.service';
import { RequireRole } from '../util/decorators';

@Controller('imageupload')
export class ImageuploadController {
  constructor(private readonly imageuploadService: ImageuploadService) {}

  @Get('direct')
  @RequireRole('ADMIN')
  directUploadURL() {
    return this.imageuploadService.directUploadURL();
  }

  @Get('check/:id')
  checkUploadURL(@Param('id') imageId: string) {
    return this.imageuploadService.checkUploadURL(imageId);
  }
}
