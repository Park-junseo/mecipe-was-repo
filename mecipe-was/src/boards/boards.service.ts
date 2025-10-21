import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { CreateBoardDto, CreateBoardImageDto, CreateBoardReplyDto } from './dto/create-board.dto';
import { UpdateBoardDto } from './dto/update-board.dto';
import { UpdateBoardImageDto } from './dto/update-board-image.dto';
import { UpdateBoardReplyDto } from './dto/update-board-reply.dto';
import { SearchBoardDto, SearchImageIdDto } from './dto/search-board.dto';
import { PrismaService } from 'src/global/prisma.service';
import { BoardType } from './dto/create-board.dto';

@Injectable()
export class BoardsService {
  constructor(private readonly prisma: PrismaService) { }

  // Board 생성
  async createBoard(createBoardDto: CreateBoardDto, userId: number) {
    const { cafeInfoIds, boardImages, ...boardData } = createBoardDto;

    return this.prisma.$transaction(async (tx) => {
      // Board 생성
      const board = await tx.board.create({
        data: {
          ...boardData,
          userId: userId,
          startDay: boardData.startDay ? new Date(boardData.startDay) : new Date(),
          endDay: boardData.endDay ? new Date(boardData.endDay) : null,
        },
        include: {
          User: {
            select: {
              id: true,
              username: true,
              nickname: true,
            },
          },
        },
      });

      // BoardImage 생성
      if (boardImages && boardImages.length > 0) {
        // isThumb이 true인 경우, 기존 썸네일 이미지들을 false로 변경
        const hasThumb = boardImages.some(img => img.isThumb);
        if (hasThumb) {
          // 이미 생성된 BoardImage가 있다면 isThumb을 false로 설정
          // (아직 없으므로 이 부분은 실행되지 않음)
        }

        // BoardImage들 생성
        await tx.boardImage.createMany({
          data: boardImages.map((image, index) => ({
            ...image,
            boardId: board.id,
            // 첫 번째 이미지를 썸네일로 설정 (isThumb이 지정되지 않은 경우)
            isThumb: image.isThumb !== undefined ? image.isThumb : index === 0,
          })),
        });
      }

      // CafeInfo 연결
      if (cafeInfoIds && cafeInfoIds.length > 0) {
        await tx.cafeBoard.createMany({
          data: cafeInfoIds.map(cafeInfoId => ({
            boardId: board.id,
            cafeInfoId: cafeInfoId,
          })),
        });
      }

      // 트랜잭션 내에서 생성된 Board를 모든 관계와 함께 반환
      const createdBoard = await tx.board.findUnique({
        where: { id: board.id },
        include: {
          User: {
            select: {
              id: true,
              username: true,
              nickname: true,
            },
          },
          BoardImages: true,
          BoardReplies: true,
          CafeBoards: {
            include: {
              CafeInfo: true,
            },
          },
        },
      });

      return createdBoard;
    });
  }

  // Board 조회 (검색 및 페이징)
  async findAll(searchDto: SearchBoardDto, isAdmin: boolean = false) {
    const { page = 1, limit = 10, ...searchParams } = searchDto;
    const skip = (page - 1) * limit;

    console.log("findAll", searchParams);

    // 검색 조건 구성
    const where: any = {};

    if (searchParams.boardType) {
      where.boardType = searchParams.boardType;
    }

    if (searchParams.title) {
      where.title = { contains: searchParams.title, mode: 'insensitive' };
    }

    if (searchParams.content) {
      where.content = { contains: searchParams.content, mode: 'insensitive' };
    }

    if (searchParams.startDay) {
      where.startDay = { gte: new Date(searchParams.startDay) };
    }

    if (searchParams.endDay) {
      where.endDay = { lte: new Date(searchParams.endDay) };
    }

    if (searchParams.notInProgressDay) {
      where.endDay = { lt: new Date(searchParams.notInProgressDay) };
    }

    if (searchParams.inProgressDay) {
      where.endDay = { gte: new Date(searchParams.inProgressDay) };
      where.startDay = { lt: new Date(searchParams.inProgressDay) };
    }

    // 일반 유저는 isDisable이 false인 것만 조회
    if (!isAdmin) {
      where.isDisable = false;
    }

    // CafeInfo로 검색
    if (searchParams.cafeInfoId) {
      if (searchParams.cafeInfoId > 1) {
        where.CafeBoards = {
          some: {
            cafeInfoId: searchParams.cafeInfoId,
          },
        };
      } else {
        // CafeInfoId가 1 이하인 경우, 모든 CafeInfo에 연결된 Board 조회
        where.CafeBoards = {
          some: {}  // 빈 객체로 모든 CafeBoard 존재 여부만 확인
        };
      }
    }

    const total = await this.prisma.board.count({ where });

    const boards = total > 0 ? await this.prisma.board.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        User: {
          select: {
            id: true,
            username: true,
            nickname: true,
          },
        },
        BoardImages: {
          orderBy: { isThumb: 'desc' },
          take: 1,
        },
        // BoardReplies: {
        //   where: { isDisable: false },
        //   include: {
        //     User: {
        //       select: {
        //         id: true,
        //         username: true,
        //         nickname: true,
        //       },
        //     },
        //   },
        // },
        CafeBoards: {
          include: {
            CafeInfo: true,
          },
        },
      },
    }) : [];

    return {
      boards: boards,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // Board 상세 조회
  async findOne(id: number, isAdmin: boolean = false) {
    const where: any = { id };

    if (!isAdmin) {
      where.isDisable = false;
    }

    const board = await this.prisma.board.findFirst({
      where,
      include: {
        User: {
          select: {
            id: true,
            username: true,
            nickname: true,
          },
        },
        BoardImages: {
          orderBy: { isThumb: 'desc' },
        },
        BoardReplies: {
          where: { isDisable: false },
          include: {
            User: {
              select: {
                id: true,
                username: true,
                nickname: true,
              },
            },
          },
        },
        CafeBoards: {
          include: {
            CafeInfo: true,
          },
        },
      },
    });

    if (!board) {
      throw new NotFoundException(`Board with ID ${id} not found`);
    }

    return board;
  }

  async findImageUrls(searchDto: SearchImageIdDto) {
    const images = await this.prisma.boardImage.findMany({
      where: { id: { in: searchDto.imageIds } },
      select: { id: true, url: true, thumbnailUrl: true },
    });
    const imageUrls = images.map(image => image.url);
    const thumbnailUrls = images.map(image => image.thumbnailUrl);
    return [...imageUrls, ...thumbnailUrls];
  }

  // Board 수정
  async update(id: number, updateBoardDto: UpdateBoardDto, userId: number, isAdmin: boolean = false) {
    const board = await this.findOne(id, isAdmin);

    // 작성자나 어드민만 수정 가능
    if (board.userId !== userId && !isAdmin) {
      throw new BadRequestException('Only the author or admin can update this board');
    }

    const { cafeInfoIds, boardImages, disabledImageIds, ...boardData } = updateBoardDto;


    return this.prisma.$transaction(async (tx) => {
      // Board 수정
      const updatedBoard = await tx.board.update({
        where: { id },
        data: {
          ...boardData,
          startDay: boardData.startDay ? new Date(boardData.startDay) : undefined,
          endDay: boardData.endDay ? new Date(boardData.endDay) : undefined,
        },
        include: {
          User: {
            select: {
              id: true,
              username: true,
              nickname: true,
            },
          },
        },
      });

      if (disabledImageIds !== undefined) {
        await tx.boardImage.updateMany({
          where: { id: { in: disabledImageIds } },
          data: { isDisable: true },
        });
      }

      // BoardImage 업데이트
      if (boardImages !== undefined) {

        // 새로운 BoardImage들 생성
        if (boardImages && boardImages.length > 0) {
          await tx.boardImage.createMany({
            data: boardImages.map((image, index) => ({
              ...image,
              boardId: id,
              // 첫 번째 이미지를 썸네일로 설정 (isThumb이 지정되지 않은 경우)
              isThumb: image.isThumb !== undefined ? image.isThumb : index === 0,
            })),
          });
        }
      }

      // CafeInfo 연결 업데이트
      if (cafeInfoIds !== undefined) {
        if (cafeInfoIds.length === 0) {

          // 기존 연결 삭제
          await tx.cafeBoard.deleteMany({
            where: { boardId: id },
          });

        } else {
          // 추가 연결 생성 리스트
          const addCafeInfoIds = cafeInfoIds.filter(cafeInfoId => !board.CafeBoards.some(cafeBoard => cafeBoard.cafeInfoId === cafeInfoId));

          // 제거 연결 생성 리스트
          const removeCafeInfoIds = board.CafeBoards.filter(cafeBoard => !cafeInfoIds.includes(cafeBoard.cafeInfoId)).map(cafeBoard => cafeBoard.cafeInfoId);

          // 기존 연결 삭제
          await tx.cafeBoard.deleteMany({
            where: { boardId: id, cafeInfoId: { in: removeCafeInfoIds } },
          });

          // 새로운 연결 생성
          if (addCafeInfoIds && addCafeInfoIds.length > 0) {
            await tx.cafeBoard.createMany({
              data: addCafeInfoIds.map(cafeInfoId => ({
                boardId: id,
                cafeInfoId: cafeInfoId,
              })),
            });
          }

        }
      }


      return updatedBoard;
    });
  }

  // Board 삭제
  async remove(id: number, userId: number, isAdmin: boolean = false) {
    const board = await this.findOne(id, isAdmin);

    // 작성자나 어드민만 삭제 가능
    if (board.userId !== userId && !isAdmin) {
      throw new BadRequestException('Only the author or admin can delete this board');
    }

    // 관련 데이터 삭제
    await this.prisma.$transaction([
      this.prisma.cafeBoard.deleteMany({ where: { boardId: id } }),
      this.prisma.boardImage.deleteMany({ where: { boardId: id } }),
      this.prisma.boardReply.deleteMany({ where: { boardId: id } }),
      this.prisma.board.delete({ where: { id } }),
    ]);

    return { message: 'Board deleted successfully' };
  }

  // BoardImage 생성
  async createBoardImage(boardId: number, createBoardImageDto: CreateBoardImageDto, userId: number) {
    // Board 존재 확인 및 권한 확인
    const board = await this.findOne(boardId);
    if (board.userId !== userId) {
      throw new BadRequestException('Only the author can add images to this board');
    }

    // isThumb이 true인 경우, 기존 썸네일 이미지들을 false로 변경
    if (createBoardImageDto.isThumb) {
      await this.prisma.boardImage.updateMany({
        where: { boardId, isThumb: true },
        data: { isThumb: false },
      });
    }

    return this.prisma.boardImage.create({
      data: {
        ...createBoardImageDto,
        boardId,
      },
    });
  }

  // BoardImage 수정
  async updateBoardImage(id: number, updateBoardImageDto: UpdateBoardImageDto, userId: number) {
    const boardImage = await this.prisma.boardImage.findUnique({
      where: { id },
      include: { Board: true },
    });

    if (!boardImage) {
      throw new NotFoundException(`BoardImage with ID ${id} not found`);
    }

    if (boardImage.Board.userId !== userId) {
      throw new BadRequestException('Only the author can update images in this board');
    }

    // isThumb이 true로 변경되는 경우, 기존 썸네일 이미지들을 false로 변경
    if (updateBoardImageDto.isThumb) {
      await this.prisma.boardImage.updateMany({
        where: { boardId: boardImage.boardId, isThumb: true, id: { not: id } },
        data: { isThumb: false },
      });
    }

    return this.prisma.boardImage.update({
      where: { id },
      data: updateBoardImageDto,
    });
  }

  // BoardImage 삭제
  async removeBoardImage(id: number, userId: number) {
    const boardImage = await this.prisma.boardImage.findUnique({
      where: { id },
      include: { Board: true },
    });

    if (!boardImage) {
      throw new NotFoundException(`BoardImage with ID ${id} not found`);
    }

    if (boardImage.Board.userId !== userId) {
      throw new BadRequestException('Only the author can delete images from this board');
    }

    await this.prisma.boardImage.delete({ where: { id } });
    return { message: 'BoardImage deleted successfully' };
  }

  // BoardReply 생성
  async createBoardReply(boardId: number, createBoardReplyDto: CreateBoardReplyDto, userId: number) {
    // Board 존재 확인 및 댓글 작성 가능 여부 확인
    const board = await this.findOne(boardId);
    if (!board.isReplyAvaliable) {
      throw new BadRequestException('This board does not allow replies');
    }

    return this.prisma.boardReply.create({
      data: {
        ...createBoardReplyDto,
        boardId,
        userId,
      },
      include: {
        User: {
          select: {
            id: true,
            username: true,
            nickname: true,
          },
        },
      },
    });
  }

  // BoardReply 수정
  async updateBoardReply(id: number, updateBoardReplyDto: UpdateBoardReplyDto, userId: number) {
    const boardReply = await this.prisma.boardReply.findUnique({
      where: { id },
    });

    if (!boardReply) {
      throw new NotFoundException(`BoardReply with ID ${id} not found`);
    }

    if (boardReply.userId !== userId) {
      throw new BadRequestException('Only the author can update this reply');
    }

    return this.prisma.boardReply.update({
      where: { id },
      data: {
        ...updateBoardReplyDto,
        updatedAt: new Date(),
      },
      include: {
        User: {
          select: {
            id: true,
            username: true,
            nickname: true,
          },
        },
      },
    });
  }

  // BoardReply 삭제
  async removeBoardReply(id: number, userId: number) {
    const boardReply = await this.prisma.boardReply.findUnique({
      where: { id },
    });

    if (!boardReply) {
      throw new NotFoundException(`BoardReply with ID ${id} not found`);
    }

    if (boardReply.userId !== userId) {
      throw new BadRequestException('Only the author can delete this reply');
    }

    await this.prisma.boardReply.delete({ where: { id } });
    return { message: 'BoardReply deleted successfully' };
  }

  // CafeInfo로 Board 검색
  async findByCafeInfo(cafeInfoId: number, searchDto: SearchBoardDto, isAdmin: boolean = false) {
    const searchParams = { ...searchDto, cafeInfoId };
    return this.findAll(searchParams, isAdmin);
  }
}
