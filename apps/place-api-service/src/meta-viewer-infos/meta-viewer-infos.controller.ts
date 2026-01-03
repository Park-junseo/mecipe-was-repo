import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { MetaViewerInfosService } from './meta-viewer-infos.service';
import { CreateMetaViewerInfoDto } from './dto/create-meta-viewer-info.dto';
import { UpdateMetaViewerInfoDto } from './dto/update-meta-viewer-info.dto';
import { CreateMetaViewerMapDto } from './dto/create-meta-viewer-map.dto';
import { UpdateMetaViewerMapDto } from './dto/update-meta-viewer-map.dto';
import { CreateMetaViewerActiveMapDto } from './dto/create-meta-viewer-active-map.dto';
import { UpdateMetaViewerActiveMapDto } from './dto/update-meta-viewer-active-map.dto';
import { SearchMetaViewerInfoDto } from './dto/search-meta-viewer-info.dto';
import { Public, RequireRole, RequireBuildApiKey } from '../util/decorators';

@Controller('meta-viewer-infos')
@UsePipes(
  new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
    transformOptions: {
      enableImplicitConversion: true,
    },
  }),
)
export class MetaViewerInfosController {
  constructor(
    private readonly metaViewerInfosService: MetaViewerInfosService,
  ) {}

  // ========== 어드민 페이지용 - MetaViewerMap 관련 ==========

  @RequireRole('ADMIN')
  @Post('admin/:metaViewerInfoId/maps')
  createMetaViewerMap(
    @Param('metaViewerInfoId') metaViewerInfoId: string,
    @Body() createDto: CreateMetaViewerMapDto,
  ) {
    return this.metaViewerInfosService.createMetaViewerMap(
      +metaViewerInfoId,
      createDto,
    );
  }

  @RequireRole('ADMIN')
  @Patch('admin/maps/:mapId')
  updateMetaViewerMap(
    @Param('mapId') mapId: string,
    @Body() updateDto: UpdateMetaViewerMapDto,
  ) {
    return this.metaViewerInfosService.updateMetaViewerMap(+mapId, updateDto);
  }

  @RequireRole('ADMIN')
  @Delete('admin/maps/:mapId')
  removeMetaViewerMap(@Param('mapId') mapId: string) {
    return this.metaViewerInfosService.removeMetaViewerMap(+mapId);
  }

  @RequireRole('ADMIN')
  @Get('admin/:metaViewerInfoId/maps')
  findAllMaps(@Param('metaViewerInfoId') metaViewerInfoId: string) {
    return this.metaViewerInfosService.findAllMaps(+metaViewerInfoId);
  }

  // ========== 어드민 페이지용 - MetaViewerActiveMap 관련 ==========

  @RequireRole('ADMIN')
  @Post('admin/active-maps')
  createMetaViewerActiveMap(@Body() createDto: CreateMetaViewerActiveMapDto) {
    return this.metaViewerInfosService.createMetaViewerActiveMap(createDto);
  }

  @RequireRole('ADMIN')
  @Patch('admin/active-maps/:activeMapId')
  updateMetaViewerActiveMap(
    @Param('activeMapId') activeMapId: string,
    @Body() updateDto: UpdateMetaViewerActiveMapDto,
  ) {
    return this.metaViewerInfosService.updateMetaViewerActiveMap(
      +activeMapId,
      updateDto,
    );
  }

  @RequireRole('ADMIN')
  @Delete('admin/active-maps/:activeMapId')
  removeMetaViewerActiveMap(@Param('activeMapId') activeMapId: string) {
    return this.metaViewerInfosService.removeMetaViewerActiveMap(+activeMapId);
  }

  // ========== 어드민 페이지용 - MetaViewerInfo 관련 ==========

  @RequireRole('ADMIN')
  @Post('admin')
  createMetaViewerInfo(@Body() createDto: CreateMetaViewerInfoDto) {
    return this.metaViewerInfosService.createMetaViewerInfo(createDto);
  }

  @RequireRole('ADMIN')
  @Patch('admin/:id')
  updateMetaViewerInfo(
    @Param('id') id: string,
    @Body() updateDto: UpdateMetaViewerInfoDto,
  ) {
    return this.metaViewerInfosService.updateMetaViewerInfo(+id, updateDto);
  }

  @RequireRole('ADMIN')
  @Get('admin')
  findAllMetaViewerInfos(@Query() searchDto: SearchMetaViewerInfoDto) {
    return this.metaViewerInfosService.findAllMetaViewerInfos(searchDto);
  }

  @RequireRole('ADMIN')
  @Get('admin/:id')
  findOneMetaViewerInfo(@Param('id') id: string) {
    return this.metaViewerInfosService.findOneMetaViewerInfo(+id);
  }

  @RequireRole('ADMIN')
  @Delete('admin/:id')
  removeMetaViewerInfo(@Param('id') id: string) {
    return this.metaViewerInfosService.removeMetaViewerInfo(+id);
  }

  // ========== SSG 빌드 전용 ==========

  // SSG 빌드 전용 엔드포인트 (API Key 필요)
  @Get('ssg/codes')
  @Public()
  @RequireBuildApiKey()
  findAllMetaViewerCodes() {
    return this.metaViewerInfosService.findAllMetaViewerCodes();
  }

  // ========== 사용자 조회용 ==========

  @Get('code/:code')
  @Public()
  findOneMetaViewerInfoByCode(@Param('code') code: string) {
    return this.metaViewerInfosService.findOneMetaViewerInfoByCode(code);
  }
}
