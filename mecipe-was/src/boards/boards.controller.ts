import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Request, Query, UsePipes, ValidationPipe } from '@nestjs/common';
import { BoardsService } from './boards.service';
import { CreateBoardDto, CreateBoardImageDto, CreateBoardReplyDto } from './dto/create-board.dto';
import { UpdateBoardDto } from './dto/update-board.dto';
import { UpdateBoardImageDto } from './dto/update-board-image.dto';
import { UpdateBoardReplyDto } from './dto/update-board-reply.dto';
import { SearchBoardDto, SearchImageIdDto } from './dto/search-board.dto';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { Board, BoardWithUser, BoardImage, BoardReply } from './entities/board.entity';
import { Public } from 'src/util/decorators';

interface RequestWithUser extends Request {
  user: {
    id: number;
    userType?: string;
    [key: string]: any;
  };
}

// 응답 타입 정의
interface BoardListResponse {
  boards: BoardWithUserAndCafeInfo[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

type BoardWithUserAndCafeInfo = Omit<Board, "BoardReplies">;

@Controller('boards')
@UsePipes(new ValidationPipe({
  whitelist: true,
  forbidNonWhitelisted: true,
  transform: true,
}))
export class BoardsController {
  constructor(private readonly boardsService: BoardsService) { }

  // Board 생성
  @Post('create')
  @UseGuards(JwtAuthGuard)
  async createBoard(@Body() body: CreateBoardDto, @Request() req: RequestWithUser): Promise<BoardWithUser> {
    const userId = req.user.id;
    return this.boardsService.createBoard(body, userId);
  }

  // Board 조회 (검색 및 페이징)
  @Public()
  @Get()
  async findAll(@Query() searchDto: SearchBoardDto): Promise<BoardListResponse> {
    return this.boardsService.findAll(searchDto);
  }

  // 관리자 Board 조회 (검색 및 페이징)
  @Get('admin')
  async findAdminAll(@Query() searchDto: SearchBoardDto, @Request() req: RequestWithUser): Promise<BoardListResponse> {
    const isAdmin = req.user?.userType === 'ADMIN' || req.user?.userType === 'MANAGER';
    return this.boardsService.findAll(searchDto, isAdmin);
  }

  @Get('imageUrls')
  async findImageUrls(@Query() searchDto: SearchImageIdDto): Promise<string[]> {
    return this.boardsService.findImageUrls(searchDto);
  }

  // CafeInfo로 Board 검색
  @Get('cafe/:cafeInfoId')
  async findByCafeInfo(
    @Param('cafeInfoId') cafeInfoId: string,
    @Query() searchDto: SearchBoardDto
  ): Promise<BoardListResponse> {
    return this.boardsService.findByCafeInfo(+cafeInfoId, searchDto, false);
  }

  // Board 상세 조회
  @Get(':id')
  async findOne(@Param('id') id: string): Promise<Board> {
    return this.boardsService.findOne(+id, false);
  }

  // Board 수정
  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  async update(@Param('id') id: string, @Body() updateBoardDto: UpdateBoardDto, @Request() req: RequestWithUser): Promise<BoardWithUser> {
    const userId = req.user.id;
    const isAdmin = req.user.userType === 'ADMIN' || req.user.userType === 'MANAGER';
    return this.boardsService.update(+id, updateBoardDto, userId, isAdmin);
  }

  // Board 삭제
  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  async remove(@Param('id') id: string, @Request() req: RequestWithUser): Promise<{ message: string }> {
    const userId = req.user.id;
    const isAdmin = req.user.userType === 'ADMIN' || req.user.userType === 'MANAGER';
    return this.boardsService.remove(+id, userId, isAdmin);
  }

  // BoardImage 생성
  @Post(':id/images')
  @UseGuards(JwtAuthGuard)
  async createBoardImage(
    @Param('id') boardId: string,
    @Body() createBoardImageDto: CreateBoardImageDto,
    @Request() req: RequestWithUser
  ): Promise<BoardImage> {
    const userId = req.user.id;
    return this.boardsService.createBoardImage(+boardId, createBoardImageDto, userId);
  }

  // BoardImage 수정
  @Patch('images/:imageId')
  @UseGuards(JwtAuthGuard)
  async updateBoardImage(
    @Param('imageId') imageId: string,
    @Body() updateBoardImageDto: UpdateBoardImageDto,
    @Request() req: RequestWithUser
  ): Promise<BoardImage> {
    const userId = req.user.id;
    return this.boardsService.updateBoardImage(+imageId, updateBoardImageDto, userId);
  }

  // BoardImage 삭제
  @Delete('images/:imageId')
  @UseGuards(JwtAuthGuard)
  async removeBoardImage(@Param('imageId') imageId: string, @Request() req: RequestWithUser): Promise<{ message: string }> {
    const userId = req.user.id;
    return this.boardsService.removeBoardImage(+imageId, userId);
  }

  // BoardReply 생성
  @Post(':id/replies')
  @UseGuards(JwtAuthGuard)
  async createBoardReply(
    @Param('id') boardId: string,
    @Body() createBoardReplyDto: CreateBoardReplyDto,
    @Request() req: RequestWithUser
  ): Promise<BoardReply> {
    const userId = req.user.id;
    return this.boardsService.createBoardReply(+boardId, createBoardReplyDto, userId);
  }

  // BoardReply 수정
  @Patch('replies/:replyId')
  @UseGuards(JwtAuthGuard)
  async updateBoardReply(
    @Param('replyId') replyId: string,
    @Body() updateBoardReplyDto: UpdateBoardReplyDto,
    @Request() req: RequestWithUser
  ): Promise<BoardReply> {
    const userId = req.user.id;
    return this.boardsService.updateBoardReply(+replyId, updateBoardReplyDto, userId);
  }

  // BoardReply 삭제
  @Delete('replies/:replyId')
  @UseGuards(JwtAuthGuard)
  async removeBoardReply(@Param('replyId') replyId: string, @Request() req: RequestWithUser): Promise<{ message: string }> {
    const userId = req.user.id;
    return this.boardsService.removeBoardReply(+replyId, userId);
  }
}
