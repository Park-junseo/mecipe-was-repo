import { IsInt, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateMetaViewerActiveMapDto {
  @IsInt()
  @Type(() => Number)
  @IsOptional()
  activeRenderMapId?: number;

  @IsInt()
  @Type(() => Number)
  @IsOptional()
  activeColliderMapId?: number;
}

