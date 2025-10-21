import { LoginType, User } from 'prisma/basic';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { CreateUserDto } from 'src/users/dto/create-user.dto';
import { UsersService } from 'src/users/users.service';

@Injectable()
export class AuthService {
  constructor(
    private jwtService: JwtService,
    private usersService: UsersService,
  ) {}

  async signUp(userDto: CreateUserDto) {
    console.log(userDto);
    if (userDto.loginType === 'ADMIN') {
      throw new ForbiddenException('어드민 가입은 불가');
    } else if (userDto && userDto.loginType !== 'LOCAL') {

    } else if (userDto.loginId && userDto.loginPw) {
      const isDup = await this.usersService.findByLocal(
        userDto.loginType,
        userDto.loginId,
        userDto.loginPw,
      );
      console.log(isDup);
      if (isDup) {
        throw new ConflictException('가입 유저정보 중복');
      }
    } else {
      throw new ConflictException('가입 유저정보 무결성 오류');
    }

    const user = await this.usersService.create(userDto);

    const result = await this.login(
      user.loginType,
      user.loginId,
      userDto.loginPw,
    );

    return result;
  }

  async login(loginType: LoginType, loginId: string, loginPw?: string) {
    let user: User;

    if (!(loginType in LoginType)) {
      throw new BadRequestException('잘못된 로그인 타입');
    }

    else if (loginId && loginPw) {
      user = await this.usersService.findByLocal(loginType, loginId, loginPw);
    }

    console.log(user);
    if (!user) {
      throw new ForbiddenException('아이디/비밀번호를 확인하세요.');
    }

    if (user.isDisable) {
      throw new ForbiddenException('탈퇴한 회원입니다.');
    }

    const accessToken = this.jwtService.sign(user);

    return {
      user,
      accessToken,
    };
  }
}
