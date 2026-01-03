import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

/**
 * API Gateway에서 전달한 User 헤더를 추출하는 미들웨어
 * Gateway 방식 인증 시 사용
 */
@Injectable()
export class UserHeaderMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    // Gateway가 설정한 헤더에서 user 정보 추출
    const userId = req.headers['x-user-id'];
    const userRole = req.headers['x-user-role'];
    const userEmail = req.headers['x-user-email'];

    if (userId) {
      (req as any)['user'] = {
        id: userId,
        role: userRole,
        email: userEmail,
      };
    }

    next();
  }
}




