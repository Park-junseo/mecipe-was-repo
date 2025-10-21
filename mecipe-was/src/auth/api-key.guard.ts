import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

export const API_KEY_HEADER = 'x-api-key';
export const BUILD_API_KEY_META = 'buildApiKey';

@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // @RequireBuildApiKey() 데코레이터가 있는지 확인
    const requireBuildApiKey = this.reflector.getAllAndOverride<boolean>(
      BUILD_API_KEY_META,
      [context.getHandler(), context.getClass()],
    );

    if (!requireBuildApiKey) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const apiKey = request.headers[API_KEY_HEADER];
    const validApiKey = process.env.BUILD_API_KEY;

    if (!validApiKey) {
      throw new UnauthorizedException('BUILD_API_KEY is not configured');
    }

    if (!apiKey || apiKey !== validApiKey) {
      throw new UnauthorizedException('Invalid or missing API key');
    }

    return true;
  }
}

