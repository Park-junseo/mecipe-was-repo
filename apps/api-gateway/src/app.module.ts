import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { JwtValidationMiddleware, HttpLoggerMiddleware } from './middleware';
import { GatewayModule } from './gateway/gateway.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    GatewayModule,
  ],
  controllers: [AppController],
  providers: [
    AppService, 
    JwtValidationMiddleware
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    // JWT 검증 미들웨어를 모든 경로에 적용 (헬스체크 제외)
    // Public 경로는 Route Policy 시스템에서 처리 (RoutePolicyService가 자동 주입됨)
    // GatewayModule에서 RoutePolicyService를 export하므로 자동으로 주입됨
    // /health 엔드포인트는 헬스체크용이므로 JWT 검증 제외
    consumer
      .apply(JwtValidationMiddleware)
      .exclude('health', 'health/(.*)')
      .forRoutes('*');
    consumer.apply(HttpLoggerMiddleware).forRoutes('*');
  }
}




