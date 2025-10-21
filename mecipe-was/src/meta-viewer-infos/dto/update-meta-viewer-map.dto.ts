import { IsBoolean, IsEnum, IsString, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';
import { IsInt, IsOptional } from 'class-validator';
import { MetaMapType } from 'prisma/basic';

export class UpdateMetaViewerMapDto {
  @IsEnum(MetaMapType)
  @IsOptional()
  type: MetaMapType;

  @IsString()
  @IsOptional()
  url: string;

  @IsInt()
  @Type(() => Number)
  @IsOptional()
  size: number;

  @IsBoolean()
  @Type(() => Boolean)
  @IsOptional()
  isDraco: boolean;

  @IsString()
  @IsOptional()
  contentKey?: string;

  @IsNumber()
  @Type(() => Number)
  @IsOptional()
  version?: number;
}
