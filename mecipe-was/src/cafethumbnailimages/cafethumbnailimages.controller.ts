import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { CafethumbnailimagesService as CafethumbnailimagesService } from './cafethumbnailimages.service';
import { UpsertCafethumbnailimageListDto } from './dto/upsert-cafethumbnailimage.dto';
import { AdminAuthGuard } from 'src/auth/jwt.guard.admin';

@Controller('cafethumbnailimages')
export class CafethumbnailimagesController {
  constructor(private readonly cafethumnailimagesService: CafethumbnailimagesService) { }

  @Post("admin/upload/:cafeId")
  @UseGuards(AdminAuthGuard)
  uploadCafeThumnailImagesByAdmin(@Param('cafeId') cafeId:string, @Body() upsertDto: UpsertCafethumbnailimageListDto) {
    return this.cafethumnailimagesService.uploadCafeThumnailImagesByAdmin(+cafeId, upsertDto);
  }

  @Get("admin")
  @UseGuards(AdminAuthGuard)
  findAllCafeThumbnailImagesByAdmin() {
    return this.cafethumnailimagesService.findAllCafeThumbnailImagesByAdmin();
  }

}
