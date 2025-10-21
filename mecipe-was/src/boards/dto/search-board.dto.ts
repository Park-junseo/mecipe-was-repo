import { IsOptional, IsEnum, IsString, IsDateString, IsNumber, IsBoolean, Length } from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { BoardType } from './create-board.dto';

export class SearchBoardDto {
  @IsOptional()
  @IsEnum(BoardType)
  boardType?: BoardType;

  @IsOptional()
  @IsDateString()
  startDay?: string;

  @IsOptional()
  @IsDateString()
  endDay?: string;

  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  content?: string;

  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsNumber()
  page?: number = 1;

  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsNumber()
  limit?: number = 10;

  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsNumber()
  cafeInfoId?: number;

  @IsOptional()
  @IsDateString()
  notInProgressDay?: string;

  
  @IsOptional()
  @IsDateString()
  inProgressDay?: string;
}

export class SearchImageIdDto {
  @Transform(({ value }) => Array.isArray(value) ? value.map(v => parseInt(v)) : value)
  @IsNumber({}, { each: true })
  imageIds?: number[];
}