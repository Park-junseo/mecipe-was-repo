import { Module } from '@nestjs/common';
import { ServiceTokenGuard } from './service-token.guard';
import { AuthorizationGuard } from './authorization.guard';
import { UserHeaderMiddleware } from './user-header.middleware';

/**
 * 공통 인증 모듈 (Gateway 방식)
 * Gateway에서 JWT 검증 후, 내부 서비스는 인가만 수행
 */
@Module({
  providers: [ServiceTokenGuard, AuthorizationGuard, UserHeaderMiddleware],
  exports: [ServiceTokenGuard, AuthorizationGuard, UserHeaderMiddleware],
})
export class CommonAuthModule {}

