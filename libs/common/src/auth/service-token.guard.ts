import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { serviceTokenConfig } from './jwt.config';

/**
 * 서비스 간 통신용 토큰 Guard
 * x-service-token 헤더를 검증
 */
@Injectable()
export class ServiceTokenGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const serviceToken = request.headers['x-service-token'];

    if (!serviceToken) {
      throw new UnauthorizedException('Service token is required');
    }

    if (serviceToken !== serviceTokenConfig.serviceToken) {
      throw new UnauthorizedException('Invalid service token');
    }

    return true;
  }
}

