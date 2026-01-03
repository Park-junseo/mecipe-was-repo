import { IsString, IsNumber, IsOptional, IsBoolean } from 'class-validator';

export class CreateBoardImageDto {
  @IsString()
  url: string;

  @IsString()
  thumbnailUrl: string;

  @IsNumber()
  width: number;

  @IsNumber()
  height: number;

  @IsNumber()
  size: number;

  @IsOptional()
  @IsBoolean()
  isThumb?: boolean;
}
