import { IsString, IsOptional, IsNumber } from 'class-validator';

export class CreateBoardReplyDto {
  @IsString()
  content: string;

  @IsOptional()
  @IsNumber()
  boardReplyId?: number;
}
