import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import { ServeStaticModule } from '@nestjs/serve-static';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { join } from 'path';
import {
  CommonAuthModule,
  UserHeaderMiddleware,
  AuthorizationGuard,
  HttpLoggerMiddleware,
  HttpBodyLoggerInterceptor,
} from '@virtualcafe/common'; 
import { MetaVeiwersModule } from './meta-veiwers/meta-veiwers.module';

@Module({
  imports: [
    ConfigModule.forRoot(),
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'media'),
      serveRoot: '/media',
      serveStaticOptions: {
        fallthrough: false,
      },
    }),
    CommonAuthModule, // Gateway 방식: 공통 모듈 사용 
    MetaVeiwersModule,
  ],
  controllers: [AppController],
  providers: [
    {
      provide: APP_GUARD,
      useClass: AuthorizationGuard, // Gateway 방식: 권한 체크만
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: HttpBodyLoggerInterceptor,
    },
    AppService,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(HttpLoggerMiddleware).forRoutes('/');
    // Gateway가 전달한 헤더에서 user 정보 추출
    consumer.apply(UserHeaderMiddleware).forRoutes('*');
  }
}
