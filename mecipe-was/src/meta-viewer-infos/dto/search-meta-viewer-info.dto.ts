import { IsInt, IsOptional, IsBoolean, IsString } from 'class-validator';
import { Type, Transform } from 'class-transformer';

export class SearchMetaViewerInfoDto {
  @IsInt()
  @Type(() => Number)
  @IsOptional()
  page?: number;

  @IsInt()
  @Type(() => Number)
  @IsOptional()
  limit?: number;

  @IsInt()
  @Type(() => Number)
  @IsOptional()
  cafeInfoId?: number;

  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsOptional()
  isDisable?: boolean;

  @IsString()
  @IsOptional()
  searchText?: string;

  @IsString()
  @IsOptional()
  searchType?: 'code' | 'cafeInfoId';
}

