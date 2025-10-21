import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  UsePipes,
  ValidationPipe
} from '@nestjs/common';
import { MetaViewerInfosService } from './meta-viewer-infos.service';
import { CreateMetaViewerInfoDto } from './dto/create-meta-viewer-info.dto';
import { UpdateMetaViewerInfoDto } from './dto/update-meta-viewer-info.dto';
import { CreateMetaViewerMapDto } from './dto/create-meta-viewer-map.dto';
import { UpdateMetaViewerMapDto } from './dto/update-meta-viewer-map.dto';
import { CreateMetaViewerActiveMapDto } from './dto/create-meta-viewer-active-map.dto';
import { UpdateMetaViewerActiveMapDto } from './dto/update-meta-viewer-active-map.dto';
import { SearchMetaViewerInfoDto } from './dto/search-meta-viewer-info.dto';
import { AdminAuthGuard } from 'src/auth/jwt.guard.admin';
import { Public } from 'src/util/decorators';
import { RequireBuildApiKey } from 'src/auth/api-key.decorator';

@Controller('meta-viewer-infos')
@UsePipes(new ValidationPipe({
  whitelist: true,
  forbidNonWhitelisted: true,
  transform: true,
}))
export class MetaViewerInfosController {
  constructor(private readonly metaViewerInfosService: MetaViewerInfosService) { }

  // ========== 어드민 페이지용 - MetaViewerMap 관련 ==========

  @Post('admin/:metaViewerInfoId/maps')
  @UseGuards(AdminAuthGuard)
  createMetaViewerMap(
    @Param('metaViewerInfoId') metaViewerInfoId: string,
    @Body() createDto: CreateMetaViewerMapDto
  ) {
    return this.metaViewerInfosService.createMetaViewerMap(+metaViewerInfoId, createDto);
  }

  @Patch('admin/maps/:mapId')
  @UseGuards(AdminAuthGuard)
  updateMetaViewerMap(
    @Param('mapId') mapId: string,
    @Body() updateDto: UpdateMetaViewerMapDto
  ) {
    return this.metaViewerInfosService.updateMetaViewerMap(+mapId, updateDto);
  }

  @Delete('admin/maps/:mapId')
  @UseGuards(AdminAuthGuard)
  removeMetaViewerMap(@Param('mapId') mapId: string) {
    return this.metaViewerInfosService.removeMetaViewerMap(+mapId);
  }

  @Get('admin/:metaViewerInfoId/maps')
  @UseGuards(AdminAuthGuard)
  findAllMaps(@Param('metaViewerInfoId') metaViewerInfoId: string) {
    return this.metaViewerInfosService.findAllMaps(+metaViewerInfoId);
  }

  // ========== 어드민 페이지용 - MetaViewerActiveMap 관련 ==========

  @Post('admin/active-maps')
  @UseGuards(AdminAuthGuard)
  createMetaViewerActiveMap(@Body() createDto: CreateMetaViewerActiveMapDto) {
    return this.metaViewerInfosService.createMetaViewerActiveMap(createDto);
  }

  @Patch('admin/active-maps/:activeMapId')
  @UseGuards(AdminAuthGuard)
  updateMetaViewerActiveMap(
    @Param('activeMapId') activeMapId: string,
    @Body() updateDto: UpdateMetaViewerActiveMapDto
  ) {
    return this.metaViewerInfosService.updateMetaViewerActiveMap(+activeMapId, updateDto);
  }

  @Delete('admin/active-maps/:activeMapId')
  @UseGuards(AdminAuthGuard)
  removeMetaViewerActiveMap(@Param('activeMapId') activeMapId: string) {
    return this.metaViewerInfosService.removeMetaViewerActiveMap(+activeMapId);
  }

  // ========== 어드민 페이지용 - MetaViewerInfo 관련 ==========

  @Post('admin')
  @UseGuards(AdminAuthGuard)
  createMetaViewerInfo(@Body() createDto: CreateMetaViewerInfoDto) {
    return this.metaViewerInfosService.createMetaViewerInfo(createDto);
  }

  @Patch('admin/:id')
  @UseGuards(AdminAuthGuard)
  updateMetaViewerInfo(
    @Param('id') id: string,
    @Body() updateDto: UpdateMetaViewerInfoDto
  ) {
    return this.metaViewerInfosService.updateMetaViewerInfo(+id, updateDto);
  }

  @Get('admin')
  @UseGuards(AdminAuthGuard)
  findAllMetaViewerInfos(@Query() searchDto: SearchMetaViewerInfoDto) {
    return this.metaViewerInfosService.findAllMetaViewerInfos(searchDto);
  }

  @Get('admin/:id')
  @UseGuards(AdminAuthGuard)
  findOneMetaViewerInfo(@Param('id') id: string) {
    return this.metaViewerInfosService.findOneMetaViewerInfo(+id);
  }

  @Delete('admin/:id')
  @UseGuards(AdminAuthGuard)
  removeMetaViewerInfo(@Param('id') id: string) {
    return this.metaViewerInfosService.removeMetaViewerInfo(+id);
  }

  // ========== SSG 빌드 전용 ==========

  // SSG 빌드 전용 엔드포인트 (API Key 필요)
  @Public()
  @RequireBuildApiKey()
  @Get('ssg/codes')
  findAllMetaViewerCodes() {
    return this.metaViewerInfosService.findAllMetaViewerCodes();
  }

  // ========== 사용자 조회용 ==========

  @Public()
  @Get('code/:code')
  findOneMetaViewerInfoByCode(@Param('code') code: string) {
    return this.metaViewerInfosService.findOneMetaViewerInfoByCode(code);
  }
}
