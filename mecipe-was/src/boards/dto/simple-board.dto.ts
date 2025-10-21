import { Prisma } from 'prisma/basic';

// 방법 1: Prisma 타입을 그대로 사용 (검증 없음)
export type CreateBoardDto = Prisma.BoardCreateInput;
export type UpdateBoardDto = Prisma.BoardUpdateInput;
export type CreateBoardImageDto = Prisma.BoardImageCreateInput;
export type UpdateBoardImageDto = Prisma.BoardImageUpdateInput;
export type CreateBoardReplyDto = Prisma.BoardReplyCreateInput;
export type UpdateBoardReplyDto = Prisma.BoardReplyUpdateInput;

// 방법 2: Pick을 사용하여 필요한 필드만 선택
export type CreateBoardSimpleDto = Pick<Prisma.BoardCreateInput, 'title' | 'content' | 'boardType'> & {
  cafeInfoIds?: number[];
};

// 방법 3: Omit을 사용하여 불필요한 필드 제거
export type CreateBoardWithoutIdDto = Omit<Prisma.BoardCreateInput, 'id' | 'createdAt'> & {
  cafeInfoIds?: number[];
};
