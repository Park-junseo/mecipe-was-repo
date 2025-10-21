import { ForbiddenException, GoneException, Injectable } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { PrismaService } from 'src/global/prisma.service';
import * as crypto from 'crypto';
import { loginCryptoConstants } from 'src/auth/jwtConstants';
import { LoginType, UserType } from 'prisma/basic';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  create(createUserDto: CreateUserDto) {
    let cryptoPw = undefined;
    if (createUserDto.loginPw) {
      cryptoPw = crypto
        .createHmac('sha512', loginCryptoConstants.secret)
        .update(createUserDto.loginPw)
        .digest('base64');
    }
    return this.prisma.user.create({
      data: {
        ...createUserDto,
        loginPw: cryptoPw,
      },
    });
  }

  async createUserByAdmin(adminId: number, createUserDto: CreateUserDto) {
    const user = await this.findUser(adminId);

    if (!user) {
      throw new ForbiddenException('불가능한 접근입니다.');
    } else if (user.userType !== 'ADMIN') {
      throw new ForbiddenException('어드민만 이용가능합니다.');
    }

    let cryptoPw = undefined;
    if (createUserDto.loginPw) {
      cryptoPw = crypto
        .createHmac('sha512', loginCryptoConstants.secret)
        .update(createUserDto.loginPw)
        .digest('base64');
    }
    return this.prisma.user.create({
      data: {
        ...createUserDto,
        loginPw: cryptoPw,
      },
    });
  }

  //
  async updateUserByUserSelf(
    userId: number,
    body: {
      loginType: LoginType;
      loginId: string;
      loginPw?: string;
      password?: string;
      nickname?: string;
    },
  ) {
    const passwordCheck = await this.findByLocal(
      body.loginType,
      body.loginId,
      body.loginPw,
    );
    console.log('======passwordcheck', passwordCheck);
    if (passwordCheck) {
      console.log(body.nickname);
      console.log(body.password);
      // 업데이트하고 결과 보내기
      let cryptoPw = undefined;
      if (body.password) {
        cryptoPw = crypto
          .createHmac('sha512', loginCryptoConstants.secret)
          .update(body.password)
          .digest('base64');
      }
      console.log('=====', body.password);
      //
      return this.prisma.user.update({
        where: {
          id: userId,
        },
        data: {
          nickname: body.nickname ? body.nickname : passwordCheck.nickname,
          loginPw: !body.password ? passwordCheck.loginPw : cryptoPw,
        },
      });
    } else {
      // 에러 보내기
      throw new ForbiddenException('비밀번호가 일치하지 않습니다.');
    }
    return;
  }

  //
  async updatePwByFindPw(
    userId: number,
    body: {
      loginType: LoginType;
      loginId: string;
      password: string;
    },
  ) {
    // 업데이트하고 결과 보내기
    let cryptoPw = undefined;
    if (body.password) {
      cryptoPw = crypto
        .createHmac('sha512', loginCryptoConstants.secret)
        .update(body.password)
        .digest('base64');
    }
    console.log('=====', body.password);

    if (!cryptoPw)
      throw new ForbiddenException('비밀번호가 일치하지 않습니다.');
    //
    return this.prisma.user.update({
      where: {
        id: userId,
      },
      data: {
        loginPw: cryptoPw,
      },
    });
  }

  //NOTE 대시보드 회원 목록
  async findTheLatestUser() {
    // 전체회원
    const totalCount = await this.prisma.user.count();

    // 신규회원 - 오늘 기준
    const date = new Date();
    const now = date.toISOString().split('T')[0] + 'T00:00:00Z';
    const letestCount = await this.prisma.user.count({
      where: {
        createdAt: {
          gte: now,
        },
      },
    });

    // 목록
    const list = await this.prisma.user.findMany({
      take: 7,
      orderBy: [
        {
          id: 'desc',
        },
      ],
    });

    return { totalCount, letestCount, list };
  }

  //NOTE 회원 목록
  findAll() {
    return this.prisma.user.findMany({
      orderBy: [
        {
          id: 'desc',
        },
      ],
    });
  }

  findUserByType(userType: UserType) {
    return this.prisma.user.findMany({
      where: {
        userType,
      },
    });
  }

  findUser(id: number) {
    return this.prisma.user.findFirst({
      where: {
        id,
      },
    });
  }

  findOne(id: number) {
    return this.prisma.user.findUnique({
      where: {
        id,
      },
    });
  }

  async update(id: number, updateUserDto: UpdateUserDto) {
    const result = await this.prisma.user.findFirst({
      where: {
        id,
      },
    });

    return this.prisma.user.update({
      where: {
        id,
      },
      data: {
        ...result,
        nickname: updateUserDto.nickname,
      },
    });
  }

  remove(id: number) {
    return this.prisma.user.delete({
      where: {
        id,
      },
    });
  }

  async removeUserByAdmin(adminId: number, id: number) {
    const user = await this.findUser(adminId);

    if (!user) {
      throw new ForbiddenException('불가능한 접근입니다.');
    } else if (user.userType !== 'ADMIN') {
      throw new ForbiddenException('어드민만 이용가능합니다.');
    }

    return this.prisma.user.delete({
      where: {
        id,
      },
    });
  }

  // async uploadImage(userId: number, file: Express.Multer.File) {
  //   const user = await this.findOne(userId);
  //   if (!user) throw new GoneException('해당 유저 없음');

  //   const { height, width } = sizeOf(file.path);
  //   const size = Math.floor(file.size / 1024);

  //   return await this.prisma.userImage.create({
  //     data: {
  //       userId,
  //       height,
  //       width,
  //       size,
  //       url: file.path,
  //       // isMain,
  //     },
  //   });
  // }

  // async removeImage(userId: number) {
  //   const image = await this.prisma.userImage.findFirst({
  //     where: {
  //       userId: userId,
  //     },
  //   });
  //   if (image?.url) fs.rmSync(join(getAppDirectory(), image?.url));

  //   return this.prisma.userImage.delete({
  //     where: {
  //       id: image.id,
  //     },
  //   });
  // }

  findByLocal(loginType: LoginType, loginId: string, loginPw: string) {
    return this.prisma.user.findFirst({
      where: {
        loginId,
        loginPw: crypto
          .createHmac('sha512', loginCryptoConstants.secret)
          .update(loginPw)
          .digest('base64'),
        // loginType,
      },
    });
  }

  async findDuplicateUserData(type: string, content: string) {
    console.log(type, content);
    let whereVal:
      | { loginId: string }
      | { nickname: string }
      | { email: string }
      | undefined = undefined;
    if (type === 'loginId') {
      whereVal = {
        loginId: content,
      };
    } else if (type === 'nickname') {
      whereVal = {
        nickname: content,
      };
    } else if (type === 'email') {
      whereVal = {
        email: content,
      };
    } else {
      return false;
    }

    const result = await this.prisma.user.findFirst({
      where: whereVal,
    });

    console.log('result: ', result);
    return result === undefined ? true : false;
  }

  findAllUsersByGeneralInAdmin() {
    return this.prisma.user.findMany({
      where: {
        userType: 'GENERAL',
      },
      orderBy: {
        id: 'desc',
      },
    });
  }

  findAllUsersByGeneralEventInAdmin() {
    return this.prisma.user.findMany({
      where: {
        userType: 'GENERAL',
      },
      orderBy: {
        id: 'desc',
      },
    });
  }

  //
  updateUserByAdmin(
    userId: number,
    updateDto: {
      userType?: UserType;
      username?: string;
      email?: string;
      loginPw?: string;
      termEvent?: boolean;
    },
  ) {
    let cryptoPw = undefined;
    if (updateDto.loginPw) {
      cryptoPw = crypto
        .createHmac('sha512', loginCryptoConstants.secret)
        .update(updateDto.loginPw)
        .digest('base64');
      updateDto.loginPw = cryptoPw;
    }

    return this.prisma.user.update({
      where: {
        id: userId,
      },
      data: updateDto,
    });
  }
  //
  findUserId(username: string, email: string) {
    return this.prisma.user.findFirst({
      where: {
        username,
      },
    });
  }

  async findAdminAllUsesrs(
    skip: number,
    take: number,
    searchType: string,
    searchText: string,
    userType: string,
  ) {
    const where: any = {};

    if (searchType === '닉네임') {
      where.OR = [
        {
          nickname: { contains: searchText },
        }
      ];
    } else if (searchType === '아이디') {
      where.loginId = { contains: searchText };
    } else if (searchType === '이름') {
      where.username = { contains: searchText };
    }

    if (userType && userType !== '전체') {
      where.userType = {
        equals: userType,
      };
    }

    const count = await this.prisma.user.count({
      where: {
        ...where,
      },
    });
    const result =
      count > 0
        ? await this.prisma.user.findMany({
            where: {
              ...where,
            },
            skip: (skip - 1) * take,
            take: take,
            orderBy: {
              id: 'desc',
            },
          })
        : [];

    const userCount: {
      [key: string]: number;
    } = {};

    for (const value in UserType) {
      userCount[value] = await this.prisma.user.count({
        where: {
          ...where,
          userType: value as UserType,
        },
      });
    }

    return { count: count, data: result, userCount };
  }

  //
  async createMany(createUserDto: CreateUserDto) {
    let cryptoPw = undefined;
    if (createUserDto.loginPw) {
      cryptoPw = crypto
        .createHmac('sha512', loginCryptoConstants.secret)
        .update(createUserDto.loginPw)
        .digest('base64');
    }

    return this.prisma.user.create({
      data: {
        ...createUserDto,
        loginPw: cryptoPw,
      },
    });
  }

  findAllUserByNickName(
    userType: 'GENERAL' | 'MANAGER',
    query: {
      nickname?: string;
      loginId?: string;
    },
  ) {
    const where: any = {};

    if (query.nickname) {
      where.nickname = {
        contains: query.nickname,
      };
    } else if (query.loginId) {
      where.loginId = {
        contains: query.loginId,
      };
    }

    return this.prisma.user.findMany({
      where: {
        userType,
        ...where,
      },
      orderBy: {
        id: 'desc',
      },
    });
  }

  async findUserTypeWithNoLogin(id:number) {
    const user = await this.prisma.user.findFirst({
      where:{
        id
      }
    });

    return {userType:user?.userType || 'NoLogin'};
  }

}
