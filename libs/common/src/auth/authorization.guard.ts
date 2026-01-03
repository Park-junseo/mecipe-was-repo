import {
  Injectable,
  CanActivate,
  ExecutionContext,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

export const ROLES_KEY = 'route-policy';

export type RoutePoilcy = 
 | { type: 'public' }
 | { type: 'role', roles: string[] }

/**
 * 역할 기반 인가 데코레이터
 * @RequireRole('USER', 'ADMIN')
 */
export const RequireRole = (...roles: string[]) =>
  SetMetadata(ROLES_KEY, { type: 'role', roles });

export const Public = () => 
  SetMetadata(ROLES_KEY, { type: 'public' });

/**
 * 권한 체크만 수행하는 Guard
 * Gateway에서 이미 인증이 완료된 경우 사용
 */
@Injectable()
export class AuthorizationGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<RoutePoilcy>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    // 권한 체크가 필요 없는 경우
    if (!requiredRoles || requiredRoles.type === 'public') {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      return false;
    }

    // 역할 체크 (대소문자 구분)
    const userRole = user.role || 'USER';
    const hasRequiredRole = requiredRoles.type === 'role' && requiredRoles.roles.some(
      (role: string) => userRole === role || userRole.toUpperCase() === role.toUpperCase(),
    );

    if (!hasRequiredRole) {
      // 디버깅을 위한 로그 (선택적)
      // console.log(`Access denied. User role: ${userRole}, Required: ${requiredRoles.join(', ')}`);
    }

    return hasRequiredRole;
  }
}

