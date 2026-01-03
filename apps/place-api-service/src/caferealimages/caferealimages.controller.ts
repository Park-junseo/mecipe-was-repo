import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { CaferealimagesService } from './caferealimages.service';
import { RequireRole } from '../util/decorators';
import { UpsertCafeRealImageListDto } from './dto/upsert-caferealimage.dto';

@Controller('caferealimages')
export class CaferealimagesController {
  constructor(private readonly caferealimagesService: CaferealimagesService) {}

  @Post('admin/upload/:cafeId')
  @RequireRole('ADMIN')
  uploadCafeVirtualImagesByAdmin(
    @Param('cafeId') cafeId: string,
    @Body() upsertDto: UpsertCafeRealImageListDto,
  ) {
    return this.caferealimagesService.uploadCafeVirtualImagesByAdmin(
      +cafeId,
      upsertDto,
    );
  }

  @Get('admin')
  @RequireRole('ADMIN')
  findAllCafeVirtualImagesByAdmin() {
    return this.caferealimagesService.findAllCafeVirtualImagesByAdmin();
  }
}
