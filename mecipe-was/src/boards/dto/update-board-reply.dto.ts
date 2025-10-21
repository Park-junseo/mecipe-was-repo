import { IsString, IsOptional } from 'class-validator';
import { Prisma } from 'prisma/basic';

export class UpdateBoardReplyDto implements Partial<Prisma.BoardReplyUpdateInput> {
  @IsOptional()
  @IsString()
  content?: string;
}
