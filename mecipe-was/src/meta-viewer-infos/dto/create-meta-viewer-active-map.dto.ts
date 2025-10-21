import { IsInt } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateMetaViewerActiveMapDto {
  @IsInt()
  @Type(() => Number)
  metaViewerInfoId: number;

  @IsInt()
  @Type(() => Number)
  activeRenderMapId: number;

  @IsInt()
  @Type(() => Number)
  activeColliderMapId: number;
}

