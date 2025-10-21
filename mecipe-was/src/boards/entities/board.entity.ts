import { Prisma } from 'prisma/basic';

// 기본 Board 타입 (관계 없음)
export type BoardBasic = Prisma.BoardGetPayload<{}>;

// User만 포함된 Board 타입
export type BoardWithUser = Prisma.BoardGetPayload<{
  include: {
    User: {
      select: {
        id: true;
        username: true;
        nickname: true;
      };
    };
  };
}>;

// 모든 관계가 포함된 Board 타입
export type Board = Prisma.BoardGetPayload<{
  include: {
    User: {
      select: {
        id: true;
        username: true;
        nickname: true;
      };
    };
    BoardImages: true;
    BoardReplies: {
      include: {
        User: {
          select: {
            id: true;
            username: true;
            nickname: true;
          };
        };
      };
    };
    CafeBoards: {
      include: {
        CafeInfo: true;
      };
    };
  };
}>;

export type BoardImage = Prisma.BoardImageGetPayload<{}>;
export type BoardReply = Prisma.BoardReplyGetPayload<{
  include: {
    User: {
      select: {
        id: true;
        username: true;
        nickname: true;
      };
    };
  };
}>;
export type CafeBoard = Prisma.CafeBoardGetPayload<{
  include: {
    CafeInfo: true;
  };
}>;
