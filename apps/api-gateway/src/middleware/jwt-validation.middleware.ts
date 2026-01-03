import { Injectable, Logger, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import * as jwt from 'jsonwebtoken';
import { RoutePolicyService } from '../gateway/route-policy.service';

/**
 * JWT 검증 미들웨어
 * Gateway에서 모든 요청의 JWT를 검증하고, user 정보를 헤더로 추가
 */
@Injectable()
export class JwtValidationMiddleware implements NestMiddleware {
  private readonly jwtPublicKey: string;
  private readonly logger = new Logger('JwtValidationMiddleware');

  constructor(
    private readonly routePolicyService: RoutePolicyService,
  ) {
    this.jwtPublicKey = Buffer .from(process.env.JWT_PUBLIC_KEY!.trim(), 'base64') .toString('utf-8') || 'default-secret';
  }

  use(req: Request, res: Response, next: NextFunction) {
    const method = req.method;
    // req.path는 라우팅 후 경로이므로, originalUrl에서 경로를 추출
    // originalUrl: "/login?param=value" -> path: "/login"
    const path = req.originalUrl?.split('?')[0] || req.path || req.url?.split('?')[0] || '/';

    // 디버깅: 경로 확인 (개발 환경)
    if (process.env.NODE_ENV !== 'production') {
      this.logger.debug(
        `[JwtValidationMiddleware] ${method} ${path} - originalUrl: ${req.originalUrl}, path: ${req.path}, url: ${req.url}`,
      );
    }

    // Route Policy 시스템 사용 (우선순위 1)
    const isPublic = this.routePolicyService.isPublic(method, path);
    if (isPublic) {
      return next();
    }

    // Authorization 헤더에서 토큰 추출
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      this.logger.error(`JwtValidationMiddleware ${method} ${path} result: 401 Unauthorized - Missing or invalid token`);
      return res.status(401).json({
        statusCode: 401,
        message: 'Unauthorized - Missing or invalid token',
      });
    }

    const token = authHeader.substring(7); // 'Bearer ' 제거

    try {
      // JWT 검증
      const decoded = jwt.verify(
        token,
        this.jwtPublicKey,
        {
          algorithms: ['RS256'],
        }
      ) as any;

      // HTTP 헤더 값 정리 함수 (제어 문자 제거)
      const sanitizeHeaderValue = (value: any): string => {
        if (!value) return '';
        const stringValue = String(value);
        // 제어 문자 제거 (0x00-0x1F, 0x7F), CR(\r), LF(\n), HTAB(\t)
        return stringValue.replace(/[\x00-\x1F\x7F\r\n\t]/g, '').trim();
      };

      // 내부 서비스로 전달할 헤더 추가 (제어 문자 제거)
      req.headers['x-user-id'] = sanitizeHeaderValue(decoded.sub || decoded.id || decoded.userId);
      req.headers['x-user-role'] = sanitizeHeaderValue(decoded.role || 'USER');
      req.headers['x-user-email'] = sanitizeHeaderValue(decoded.email || '');
      req.headers['x-user-name'] = sanitizeHeaderValue(decoded.name || decoded.username || '');

      // req.user에도 저장 (선택적)
      req['user'] = {
        id: decoded.sub || decoded.id || decoded.userId,
        role: decoded.role || 'USER',
        email: decoded.email,
        name: decoded.name || decoded.username,
      };

      next();
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        this.logger.error(`JwtValidationMiddleware ${method} ${path} result: 401 Token expired`);
        return res.status(401).json({
          statusCode: 401,
          message: 'Token expired',
        });
      }

      if (error instanceof jwt.JsonWebTokenError) {
        this.logger.error(`JwtValidationMiddleware ${method} ${path} result: 401 Invalid token`);
        return res.status(401).json({
          statusCode: 401,
          message: 'Invalid token',
        });
      }

      this.logger.error(`JwtValidationMiddleware ${method} ${path} result: 401 Unauthorized`);
      return res.status(401).json({
        statusCode: 401,
        message: 'Unauthorized',
      });
    }
  }
}

