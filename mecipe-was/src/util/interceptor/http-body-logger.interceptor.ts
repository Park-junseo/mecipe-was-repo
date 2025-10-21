import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { catchError, tap } from 'rxjs/operators';

@Injectable()
export class HttpBodyLoggerInterceptor implements NestInterceptor {
  private logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler) {
    const request = context.switchToHttp().getRequest();
    const { method, originalUrl, body } = request;

    return next.handle().pipe(
      tap((data) => {
        // if (process.env.EN.NODE_ENV.toLocaleLowerCase() === 'development') {
        this.logger.verbose(
          body,
          'Request Body - ' + method + ' ' + originalUrl,
        );

        this.logger.verbose(
          data,
          'Response Body - ' + method + ' ' + originalUrl,
        );
        // }
      }),
    );
  }
}
