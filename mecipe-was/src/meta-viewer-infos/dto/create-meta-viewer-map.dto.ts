import { IsEnum, IsString, IsInt, IsOptional, IsBoolean, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';
import { MetaMapType } from 'prisma/basic';

export class CreateMetaViewerMapDto {
  @IsEnum(MetaMapType)
  type: MetaMapType;

  @IsString()
  url: string;

  @IsInt()
  @Type(() => Number)
  size: number;

  @IsBoolean()
  @Type(() => Boolean)
  isDraco: boolean;

  @IsString()
  @IsOptional()
  contentKey?: string;

  @IsNumber()
  @Type(() => Number)
  @IsOptional()
  version?: number;
}

