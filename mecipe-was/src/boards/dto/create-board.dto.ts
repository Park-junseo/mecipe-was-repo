import { IsString, IsOptional, IsEnum, IsDateString, IsArray, IsNumber, IsBoolean } from 'class-validator';
import { Transform } from 'class-transformer';
import { Prisma } from 'prisma/basic';

export enum BoardType {
  BTALK = 'BTALK',
  BINFORM = 'BINFORM', 
  BQUESTION = 'BQUESTION',
  BEVENT = 'BEVENT'
}

// Prisma 타입을 기반으로 DTO 정의
export class CreateBoardDto implements Partial<Prisma.BoardCreateInput> {
  @IsString()
  title: string;

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
}

export class CreateBoardImageDto implements Partial<Prisma.BoardImageCreateInput> {
  @IsString()
  url: string;

  @IsString()
  thumbnailUrl: string;

  @Transform(({ value }) => parseInt(value))
  @IsNumber()
  width: number;

  @Transform(({ value }) => parseInt(value))
  @IsNumber()
  height: number;

  @Transform(({ value }) => parseInt(value))
  @IsNumber()
  size: number;

  @IsOptional()
  @IsBoolean()
  isThumb?: boolean;
}

export class CreateBoardReplyDto implements Partial<Prisma.BoardReplyCreateInput> {
  @IsString()
  content: string;

  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsNumber()
  boardReplyId?: number;
}