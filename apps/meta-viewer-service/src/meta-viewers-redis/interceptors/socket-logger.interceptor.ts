import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, tap, catchError } from 'rxjs';
import { WsException } from '@nestjs/websockets';

/**
 * WebSocket 이벤트 로깅 인터셉터
 * 모든 @SubscribeMessage 핸들러의 요청/응답을 로깅
 */
@Injectable()
export class SocketLoggerInterceptor implements NestInterceptor {
  private readonly logger = new Logger('SocketLogger');

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    // Socket.IO 컨텍스트에서 클라이언트와 데이터 추출
    const wsContext = context.switchToWs();
    const client = wsContext.getClient();
    const data = wsContext.getData();
    
    // 이벤트 이름 추출 (SubscribeMessage 데코레이터의 메타데이터에서)
    const eventName = context.getHandler().name || 'unknown';
    const timestamp = new Date().toISOString();
    
    // 로깅 활성화 여부 확인
    const enableSocketLogging = process.env.ENABLE_SOCKET_LOGGING === 'true';
    
    if (enableSocketLogging) {
      const dataStr = data 
        ? JSON.stringify(data).substring(0, 500)
        : 'no data';
      
      this.logger.log(
        `📥 [${timestamp}] IN  | Client: ${client.id} | Event: ${eventName} | Data: ${dataStr}`
      );
    }

    return next.handle().pipe(
      tap((response) => {
        if (enableSocketLogging) {
          const responseStr = response
            ? JSON.stringify(response).substring(0, 500)
            : 'no response';
          
          this.logger.log(
            `📤 [${timestamp}] OUT | Client: ${client.id} | Event: ${eventName} | Response: ${responseStr}`
          );
        }
      }),
      catchError((error) => {
        if (enableSocketLogging) {
          this.logger.error(
            `❌ [${timestamp}] ERR | Client: ${client.id} | Event: ${eventName} | Error: ${error.message}`,
            error.stack
          );
        }
        throw error;
      }),
    );
  }
}
