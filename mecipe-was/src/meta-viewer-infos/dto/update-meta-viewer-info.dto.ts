import { IsBoolean, IsInt, IsObject, IsOptional, IsString } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateMetaViewerInfoDto {
    @IsString()
    @IsOptional()
    code: string;
  
    @IsInt()
    @Type(() => Number)
    @IsOptional()
    cafeInfoId: number;

    @IsObject()
    @IsOptional()
    worldData: Record<string, any>;

    @IsBoolean()
    @IsOptional()
    isDisable: boolean;
  }
