import { IsString, IsNumber, IsOptional, IsBoolean } from 'class-validator';
import { Transform } from 'class-transformer';
import { Prisma } from 'prisma/basic';

export class UpdateBoardImageDto implements Partial<Prisma.BoardImageUpdateInput> {
  @IsOptional()
  @IsString()
  url?: string;

  @IsOptional()
  @IsString()
  thumbnailUrl?: string;

  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsNumber()
  width?: number;

  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsNumber()
  height?: number;

  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsNumber()
  size?: number;

  @IsOptional()
  @IsBoolean()
  isThumb?: boolean;
}
