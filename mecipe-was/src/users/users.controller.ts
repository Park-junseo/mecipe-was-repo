import { Controller, Get, Post, Body, Patch, Param, Delete, Query, Logger, Request, UseGuards } from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { Public } from 'src/util/decorators';
import { LoginType, UserType } from 'prisma/basic';
import { AdminAuthGuard } from 'src/auth/jwt.guard.admin';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  // NOTE 중복확인
  @Public()
  @Get('duplicate')
  findDuplicateUserData(
    @Query('type') type: string,
    @Query('content') content: string,
  ) {
    return this.usersService.findDuplicateUserData(type, content);
  }

  @Public()
  @Get('find/id')
  findUserId(
    @Query('username') username: string,
    @Query('email') email: string,
  ) {
    return this.usersService.findUserId(username, email);
  }

  // 닉네임으로 유저찾기
  @Get('find/search')
  findAllUserByNickName(
    @Query('userType') userType: 'GENERAL' | 'MANAGER',
    @Query('nickname') nickname?: string,
    @Query('loginId') loginId?: string,
  ) {
    return this.usersService.findAllUserByNickName(userType, {
      nickname,
      loginId,
    });
  }

  //유저 페이징
  @Get('admin')
  @UseGuards(AdminAuthGuard)
  findAdminAllUsesrs(
    @Query('page') page: string,
    @Query('take') take: string,
    @Query('searchType') searchType: string,
    @Query('searchText') searchText: string,
    @Query('userType') userType: string,
  ) {
    return this.usersService.findAdminAllUsesrs(
      +page,
      +take,
      searchType,
      searchText,
      userType,
    );
  }

  @Public()
  @Get('checkLogin/:id')
  findUserTypeWithNoLogin (@Param('id') id: string) {
    return this.usersService.findUserTypeWithNoLogin(+id);
  }

  @Get('admin/general/list')
  @UseGuards(AdminAuthGuard)
  findAllUsersByGeneralInAdmin() {
    return this.usersService.findAllUsersByGeneralInAdmin();
  }

  @Patch('admin/user/:userId')
  @UseGuards(AdminAuthGuard)
  updateUserByAdmin(
    @Param('userId') userId: string,
    @Query('userType') userType?: UserType,
    @Query('username') username?: string,
    @Query('password') password?: string,
  ) {
    const updateDto: {
      userType?: UserType;
      username?: string;
      loginPw?: string;
    } = {};
    if (userType) updateDto.userType = userType;
    if (username) updateDto.username = username;
    if (password) updateDto.loginPw = password;
    console.log(updateDto, 'update');
    return this.usersService.updateUserByAdmin(+userId, updateDto);
  }

  // 회원정보 변경 - 비밀번호 일치 채크 포함
  @Patch(':userId/update')
  updateUserByUserSelf(
    @Param('userId') userId: string,
    @Body()
    body: {
      loginType: LoginType;
      loginId: string;
      loginPw?: string;
      password?: string;
      nickname?: string;
    },
  ) {
    return this.usersService.updateUserByUserSelf(+userId, body);
  }

  @Public()
  @Patch(':userId/updatepw')
  updatePwByFindPw(
    @Param('userId') userId: string,
    @Body()
    body: {
      loginType: LoginType;
      loginId: string;
      password: string;
    },
  ) {
    return this.usersService.updatePwByFindPw(+userId, body);
  }

  // @Delete(':userId/image')
  // deleteImage(@Param('userId') userId: string) {
  //   return this.usersService.removeImage(Number(userId));
  // }

  @Post('admin')
  @UseGuards(AdminAuthGuard)
  createUserByAdmin(@Body() body: { adminId: number; body: CreateUserDto }) {
    return this.usersService.createUserByAdmin(body.adminId, body.body);
  }

  //NOTE 대시보드 회원 목록
  @Get('dashboard/user')
  findTheLatestUser() {
    return this.usersService.findTheLatestUser();
  }

  @Get()
  findAll() {
    return this.usersService.findAll();
  }

  @Get('userType/:userType')
  findUserByType(@Param('userType') userType: UserType) {
    return this.usersService.findUserByType(userType);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Request() req) {
    Logger.debug(`user is `);
    Logger.debug(req.user);
    return this.usersService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    return this.usersService.update(+id, updateUserDto);
  }

  @Delete('admin')
  @UseGuards(AdminAuthGuard)
  removeUserByAdmin(
    @Query('adminId') adminId: string,
    @Query('id') id: string,
  ) {
    return this.usersService.removeUserByAdmin(+adminId, +id);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.usersService.remove(+id);
  }
}
