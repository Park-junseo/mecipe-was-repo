import { Controller, Post, Get, Body, Param, BadGatewayException, UseGuards, Req } from '@nestjs/common';
import { Request } from 'express';
import { AppService } from './app.service';
import { Public } from './util/decorators';
import { LoginType } from 'prisma/basic';
import { AuthService } from './auth/auth.service';
import { loginCryptoConstants } from './auth/jwtConstants';
import * as crypto from 'crypto';
import { CreateUserDto } from './users/dto/create-user.dto';
import { AdminAuthGuard } from './auth/jwt.guard.admin';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly authService: AuthService,
  ) {}

  @Public()
  @Get('hello')
  getHello(): string {
    return this.appService.getHello();
  }

  @Public()
  @Post('login')
  login(
    @Body()
    loginDto: {
      loginType: LoginType;
      loginId: string;
      loginPw?: string;
    },
  ) {
    return this.authService.login(
      loginDto.loginType,
      loginDto.loginId,
      loginDto.loginPw,
    );
  }

  @Public()
  @Get('testpw/:password')
  testPassword(
    @Param('password') password
  ):string {
    if(process.env.NODE_ENV !== 'development') throw new BadGatewayException("접근 불가");

    return crypto
    .createHmac('sha512', loginCryptoConstants.secret)
    .update(password)
    .digest('base64');
  }

  @Public()
  @Post('signup')
  signUp(@Body() userDto: CreateUserDto) {
    return this.authService.signUp(userDto);
  }

  @UseGuards(AdminAuthGuard)
  @Get('auth/me')
  getAuthToken() {
    return this.appService.getAuthToken();
  }

  @Public()
  @Get('')
  root() {
    return {
      message: 'Hello World',
    };
  }
}
