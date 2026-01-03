import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { UsersModule } from '../users/users.module';
import { jwtConstants } from './jwtConstants';
import { AuthService } from './auth.service';

@Module({
  imports: [
    UsersModule,
    PassportModule,
    JwtModule.register({
      privateKey: jwtConstants.secret,
      signOptions: {
        algorithm: 'RS256',
        expiresIn: '15m',
      }
    }),
  ],
  providers: [AuthService],
  exports: [AuthService],
})
export class AuthModule {}
