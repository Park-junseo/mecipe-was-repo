import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { CafethumbnailimagesService as CafethumbnailimagesService } from './cafethumbnailimages.service';
import { UpsertCafethumbnailimageListDto } from './dto/upsert-cafethumbnailimage.dto';
import { RequireRole } from '../util/decorators';

@Controller('cafethumbnailimages')
export class CafethumbnailimagesController {
  constructor(
    private readonly cafethumnailimagesService: CafethumbnailimagesService,
  ) {}

  @Post('admin/upload/:cafeId')
  @RequireRole('ADMIN')
  uploadCafeThumnailImagesByAdmin(
    @Param('cafeId') cafeId: string,
    @Body() upsertDto: UpsertCafethumbnailimageListDto,
  ) {
    return this.cafethumnailimagesService.uploadCafeThumnailImagesByAdmin(
      +cafeId,
      upsertDto,
    );
  }

  @Get('admin')
  @RequireRole('ADMIN')
  findAllCafeThumbnailImagesByAdmin() {
    return this.cafethumnailimagesService.findAllCafeThumbnailImagesByAdmin();
  }
}
