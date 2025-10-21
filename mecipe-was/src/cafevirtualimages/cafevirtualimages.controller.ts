import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { CafevirtualimagesService } from './cafevirtualimages.service';
import { UpsertCafeVirtualImageListDto } from './dto/upsert-cafevirtualimage.dto';
import { AdminAuthGuard } from 'src/auth/jwt.guard.admin';

@Controller('cafevirtualimages')
export class CafevirtualimagesController {
  constructor(private readonly cafevirtualimagesService: CafevirtualimagesService) {}

  @Post("admin/upload/:cafeId")
  @UseGuards(AdminAuthGuard)
  uploadCafeVirtualImagesByAdmin(@Param('cafeId') cafeId:string, @Body() upsertDto: UpsertCafeVirtualImageListDto) {
    return this.cafevirtualimagesService.uploadCafeVirtualImagesByAdmin(+cafeId, upsertDto);
  }

  @Get("admin")
  @UseGuards(AdminAuthGuard)
  findAllCafeVirtualImagesByAdmin() {
    return this.cafevirtualimagesService.findAllCafeVirtualImagesByAdmin();
  }
}
