import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { CafevirtualimagesService } from './cafevirtualimages.service';
import { UpsertCafeVirtualImageListDto } from './dto/upsert-cafevirtualimage.dto';
import { RequireRole } from '../util/decorators';

@Controller('cafevirtualimages')
export class CafevirtualimagesController {
  constructor(
    private readonly cafevirtualimagesService: CafevirtualimagesService,
  ) {}

  @Post('admin/upload/:cafeId')
  @RequireRole('ADMIN')
  uploadCafeVirtualImagesByAdmin(
    @Param('cafeId') cafeId: string,
    @Body() upsertDto: UpsertCafeVirtualImageListDto,
  ) {
    return this.cafevirtualimagesService.uploadCafeVirtualImagesByAdmin(
      +cafeId,
      upsertDto,
    );
  }

  @Get('admin')
  @RequireRole('ADMIN')
  findAllCafeVirtualImagesByAdmin() {
    return this.cafevirtualimagesService.findAllCafeVirtualImagesByAdmin();
  }
}
