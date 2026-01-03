import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { tap } from 'rxjs/operators';

@Injectable()
export class HttpBodyLoggerInterceptor implements NestInterceptor {
  private logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler) {
    // GraphQL 요청인 경우 HTTP context가 없을 수 있음
    try {
      const request = context.switchToHttp().getRequest();
      const { method, originalUrl, body } = request;

      return next.handle().pipe(
        tap((data) => {
          // if (process.env.NODE_ENV?.toLowerCase() === 'development') {
          // Limit body logging to prevent huge outputs (e.g., webpack bundles)
          const MAX_LOG_LENGTH = 1000;
          
          let bodyStr: string;
          try {
            const bodyJson = typeof body === 'object' ? JSON.stringify(body) : String(body);
            bodyStr = bodyJson.length > MAX_LOG_LENGTH 
              ? bodyJson.substring(0, MAX_LOG_LENGTH) + '... (truncated)' 
              : bodyJson;
          } catch (e) {
            bodyStr = '[Unable to stringify body]';
          }
          
          let dataStr: string;
          try {
            const dataJson = typeof data === 'object' ? JSON.stringify(data) : String(data);
            dataStr = dataJson.length > MAX_LOG_LENGTH 
              ? dataJson.substring(0, MAX_LOG_LENGTH) + '... (truncated)' 
              : dataJson;
          } catch (e) {
            dataStr = '[Unable to stringify data]';
          }
          
          this.logger.verbose(
            bodyStr,
            'Request Body - ' + method + ' ' + originalUrl,
          );

          this.logger.verbose(
            dataStr,
            'Response Body - ' + method + ' ' + originalUrl,
          );
          // }
        }),
      );
    } catch (error) {
      // HTTP context가 없는 경우 (예: GraphQL)는 그냥 통과
      return next.handle();
    }
  }
}
