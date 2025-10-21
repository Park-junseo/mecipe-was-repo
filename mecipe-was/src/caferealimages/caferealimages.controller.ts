import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { CaferealimagesService } from './caferealimages.service';
import { AdminAuthGuard } from 'src/auth/jwt.guard.admin';
import { UpsertCafeRealImageListDto } from './dto/upsert-caferealimage.dto';

@Controller('caferealimages')
export class CaferealimagesController {
  constructor(private readonly caferealimagesService: CaferealimagesService) { }

  @Post("admin/upload/:cafeId")
  @UseGuards(AdminAuthGuard)
  uploadCafeVirtualImagesByAdmin(@Param('cafeId') cafeId: string, @Body() upsertDto: UpsertCafeRealImageListDto) {
    return this.caferealimagesService.uploadCafeVirtualImagesByAdmin(+cafeId, upsertDto);
  }

  @Get("admin")
  @UseGuards(AdminAuthGuard)
  findAllCafeVirtualImagesByAdmin() {
    return this.caferealimagesService.findAllCafeVirtualImagesByAdmin();
  }
}
