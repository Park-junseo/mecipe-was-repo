import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { ConfigService } from '@nestjs/config';

/**
 * Gateway Service
 * 내부 서비스로 요청을 프록시
 */
@Injectable()
export class GatewayService {
  private readonly logger = new Logger(GatewayService.name);

  // 내부 서비스 URL (Kubernetes Service 이름 또는 환경 변수)
  private readonly placeApiServiceUrl: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.placeApiServiceUrl =
      this.configService.get<string>('PLACE_API_SERVICE_URL') ||
      'http://place-api-service:4000';

    this.logger.log(`Place API Service URL: ${this.placeApiServiceUrl}`);
  }

  /**
   * HTTP 헤더 값 정리 (제어 문자 제거 및 URL 인코딩)
   * RFC 7230: HTTP 헤더 값에는 제어 문자(0x00-0x1F, 0x7F), CR, LF, HTAB가 포함될 수 없음
   * 비-ASCII 문자(한글 등)는 URL 인코딩하여 전달
   */
  private sanitizeHeaderValue(value: any): string | undefined {
    if (value === null || value === undefined) {
      return undefined;
    }
    
    const stringValue = String(value);
    // 제어 문자 제거 (0x00-0x1F, 0x7F), CR(\r), LF(\n), HTAB(\t)
    const cleaned = stringValue
      .replace(/[\x00-\x1F\x7F\r\n\t]/g, '')
      .trim();
    
    if (!cleaned) {
      return undefined;
    }
    
    // 비-ASCII 문자를 URL 인코딩하여 안전하게 전달
    // ASCII 문자만 포함된 경우 인코딩하지 않음 (성능 최적화)
    try {
      // ASCII만 포함된 경우 그대로 반환
      if (/^[\x20-\x7E]*$/.test(cleaned)) {
        return cleaned;
      }
      // 비-ASCII 문자 포함 시 URL 인코딩
      return encodeURIComponent(cleaned);
    } catch (error) {
      // 인코딩 실패 시 빈 문자열 반환 (안전한 처리)
      this.logger.warn(`Failed to encode header value: ${stringValue}`);
      return undefined;
    }
  }

  /**
   * Place API Service로 프록시
   */
  async proxyToPlaceApi(
    path: string,
    method: string,
    headers: any,
    { query, body }: { query?: any, body?: any },
  ): Promise<{ data?: any; status: number; headers?: any }> {
    const url = `${this.placeApiServiceUrl}${path}`;
    let response: any;
    try {
      // 헤더 명시적으로 구성 (undefined 값 제외)
      const cleanedHeaders: Record<string, string> = {};
      
      // 필요한 헤더만 복사 (authorization 제외)
      Object.keys(headers).forEach((key) => {
        if (key.toLowerCase() !== 'authorization') {
          const value = headers[key];
          if (value !== undefined && value !== null) {
            cleanedHeaders[key] = String(value);
          }
        }
      });
      
      // User 정보 헤더 명시적으로 설정 (정리된 값 사용)
      const userId = this.sanitizeHeaderValue(headers['x-user-id']);
      const userRole = this.sanitizeHeaderValue(headers['x-user-role']);
      const userEmail = this.sanitizeHeaderValue(headers['x-user-email']);
      const userName = this.sanitizeHeaderValue(headers['x-user-name']);
      
      // 디버깅: 원본 값 확인 (개발 환경)
      if (process.env.NODE_ENV !== 'production') {
        if (headers['x-user-name']) {
          this.logger.debug(
            `[GatewayService] x-user-name original: "${headers['x-user-name']}", cleaned: "${userName}"`,
          );
        }
      }
      
      if (userId !== undefined) cleanedHeaders['x-user-id'] = userId;
      if (userRole !== undefined) cleanedHeaders['x-user-role'] = userRole;
      if (userEmail !== undefined) cleanedHeaders['x-user-email'] = userEmail;
      if (userName !== undefined) cleanedHeaders['x-user-name'] = userName;
      
      response = await firstValueFrom(
        this.httpService.request({
          method: method as any,
          url,
          headers: cleanedHeaders,
          params: query,
          data: body,
          validateStatus: (status) => status < 400, // 304를 포함한 모든 3xx 응답을 정상으로 처리
        }),
      );
    } catch (error: any) {
      // 304 Not Modified는 정상 응답이지만 axios가 에러로 처리할 수 있음
      if (error.response?.status === 304) {
        this.logger.debug(`304 Not Modified: ${method} ${url}`);
        return {
          status: 304,
          headers: error.response.headers,
          data: error.response.data,
        };
      }
      
      // 네트워크 연결 에러 처리
      if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND' || error.code === 'ETIMEDOUT') {
        this.logger.error(
          `Failed to connect to Place API at ${this.placeApiServiceUrl}. Is the service running?`,
        );
        throw new Error(
          `Place API Service is not available at ${this.placeApiServiceUrl}. Please ensure the service is running.`,
        );
      }
      
      // 기타 에러
      this.logger.error(
        `Error proxying to Place API: ${error.message}`,
        error.stack,
      );
      throw error;
    }
    
    this.logger.debug(`Proxying to Place API: [${response.status}] ${method} ${url} with query: ${JSON.stringify(query)}`);
    
    // 304 응답 처리
    if (response.status === 304) {
      return {
        status: 304,
        headers: response.headers,
        data: response.data,
      };
    }
    
    return {
      status: response.status,
      headers: response.headers,
      data: response.data,
    };
  }
}
