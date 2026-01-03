import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { CafevirtuallinksService } from './cafevirtuallinks.service';
import {
  CreateCafeVirtaulLinkWithImageDto,
  CreateCafeVirtaulLinkWithImageListDto,
} from './dto/create-cafevirtuallink.dto';
import {
  UpdateCafeVirtaulLinkThumbnailImageDto,
  UpdateCafevirtuallinkDto,
} from './dto/update-cafevirtuallink.dto';
import { RequireRole } from '../util/decorators';

@Controller('cafevirtuallinks')
export class CafevirtuallinksController {
  constructor(
    private readonly cafevirtuallinksService: CafevirtuallinksService,
  ) {}

  @Patch('admin/update/image/:imageId')
  @RequireRole('ADMIN')
  updateCafeVirtualLinkThumbnailImageByAdmin(
    @Param('imageId') imageId: string,
    @Body() updateDto: UpdateCafeVirtaulLinkThumbnailImageDto,
  ) {
    return this.cafevirtuallinksService.updateCafeVirtualLinkThumbnailImageByAdmin(
      +imageId,
      updateDto,
    );
  }

  @Post('admin/create/list/:cafeId')
  @RequireRole('ADMIN')
  createCafeVirtualLinkListByAdmin(
    @Param('cafeId') cafeId: string,
    @Body() createDto: CreateCafeVirtaulLinkWithImageListDto,
  ) {
    return this.cafevirtuallinksService.createCafeVirtualLinkListByAdmin(
      +cafeId,
      createDto,
    );
  }

  @Post('admin/create/:cafeId')
  @RequireRole('ADMIN')
  createCafeVirtualLinkByAdmin(
    @Param('cafeId') cafeId: string,
    @Body() createDto: CreateCafeVirtaulLinkWithImageDto,
  ) {
    return this.cafevirtuallinksService.createCafeVirtualLinkByAdmin(
      +cafeId,
      createDto,
    );
  }

  @Patch('admin/update/:id')
  @RequireRole('ADMIN')
  updateCafeVirtualLinkByAdmin(
    @Param('id') id: string,
    @Body() updateDto: UpdateCafevirtuallinkDto,
  ) {
    return this.cafevirtuallinksService.updateCafeVirtualLinkByAdmin(
      +id,
      updateDto,
    );
  }

  @Get('admin')
  @RequireRole('ADMIN')
  findAllCafeVirtualLinksByAdmin() {
    return this.cafevirtuallinksService.findAllCafeVirtualLinksByAdmin();
  }
}
