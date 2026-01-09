import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  /**
   * 헬스체크용 엔드포인트
   * Kubernetes liveness/readiness probe에서 사용
   * 최소한의 응답만 반환 (애플리케이션이 실행 중인지 확인)
   */
  getHello(): string {
    return 'OK';
  }

  getAuthToken() {
    return { authToken: true };
  }
}
