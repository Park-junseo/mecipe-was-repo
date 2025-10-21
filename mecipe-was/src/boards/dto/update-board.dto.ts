import { IsString, IsOptional, IsEnum, IsDateString, IsArray, IsNumber, IsBoolean } from 'class-validator';
import { Transform } from 'class-transformer';
import { BoardType } from './create-board.dto';
import { Prisma } from 'prisma/basic';
import { CreateBoardImageDto } from './create-board.dto';

export class UpdateBoardDto implements Partial<Prisma.BoardUpdateInput> {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  content?: string;

  @IsOptional()
  @IsString()
  link?: string;

  @IsOptional()
  @IsDateString()
  startDay?: string;

  @IsOptional()
  @IsDateString()
  endDay?: string;

  @IsOptional()
  @IsBoolean()
  isReplyAvaliable?: boolean;

  @IsOptional()
  @IsEnum(BoardType)
  boardType?: BoardType;

  @IsOptional()
  @IsArray()
  @Transform(({ value }) => Array.isArray(value) ? value.map(v => parseInt(v)) : value)
  @IsNumber({}, { each: true })
  cafeInfoIds?: number[];

  @IsOptional()
  @IsArray()
  boardImages?: CreateBoardImageDto[];

  @IsOptional()
  @IsArray()
  @Transform(({ value }) => Array.isArray(value) ? value.map(v => parseInt(v)) : value)
  @IsNumber({}, { each: true })
  disabledImageIds?: number[];
}