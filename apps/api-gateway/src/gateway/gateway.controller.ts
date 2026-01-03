import {
  Controller,
  All,
  Req,
  Res,
  Body,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { GatewayService } from './gateway.service';

/**
 * Gateway Controller
 * 모든 요청을 적절한 내부 서비스로 라우팅
 */
@Controller()
export class GatewayController {
  constructor(private readonly gatewayService: GatewayService) { }

  /**
   * 모든 HTTP 메서드 처리
   * 경로에 따라 적절한 서비스로 라우팅
   */
  @All('*')
  async proxy(@Req() req: Request, @Res() res: Response, @Body() body: any) {
    const path = req.path;
    const query = req.query as any;
    const method = req.method;

    try {
      // 경로에 따라 서비스 선택
      // 기본적으로 Place API Service로 라우팅
      const result = await this.gatewayService.proxyToPlaceApi(
        path,
        method,
        req.headers as any,
        {
          query,
          body,
        }
      );

      // 304 Not Modified 응답 처리
      if (result.status === 304) {
        // 304 응답 헤더 전달
        if (result.headers) {
          Object.keys(result.headers).forEach((key) => {
            res.setHeader(key, result.headers[key]);
          });
        }
        return res.status(304).send();
      }

      // 일반 응답 처리
      if (result.headers) {
        Object.keys(result.headers).forEach((key) => {
          // Content-Length는 Express가 자동으로 설정하므로 제외
          if (key.toLowerCase() !== 'content-length') {
            res.setHeader(key, result.headers[key]);
          }
        });
      }

      return res.status(result.status || 200).json(result.data);
    } catch (error: any) {
      const status = error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR;
      const message = error.response?.data || error.message;

      throw new HttpException(message, status);
    }
  }
}




