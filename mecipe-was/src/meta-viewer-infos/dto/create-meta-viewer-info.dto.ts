import { IsString, IsInt, IsBoolean, IsOptional, IsObject, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { CreateMetaViewerMapDto } from './create-meta-viewer-map.dto';

export class CreateMetaViewerInfoDto {
  @IsString()
  code: string;

  @IsInt()
  @Type(() => Number)
  cafeInfoId: number;

  @IsObject()
  worldData: Record<string, any>;

  @IsBoolean()
  @IsOptional()
  isDisable?: boolean;

  @ValidateNested()
  @Type(() => CreateMetaViewerMapDto)
  activeRenderMap: CreateMetaViewerMapDto;

  @ValidateNested()
  @Type(() => CreateMetaViewerMapDto)
  activeColliderMap: CreateMetaViewerMapDto;
}