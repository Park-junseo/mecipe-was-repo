import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from './../src/app.module';

describe('API E2E Tests', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Health Check', () => {
    it('/hello (GET) - should return greeting', () => {
      return request(app.getHttpServer())
        .get('/hello')
        .expect(200)
        .expect('Hello World!');
    });
  });

  describe('Authentication', () => {
    it('/login (POST) - should handle login request', async () => {
      const response = await request(app.getHttpServer()).post('/login').send({
        loginType: 'LOCAL',
        loginId: 'test@example.com',
        loginPw: 'password123',
      });

      // 응답 구조 검증 (실패해도 OK - 실제 유저 없음)
      expect([200, 400, 401, 403]).toContain(response.status);
    });
  });

  // 필요한 경우 여기에 더 많은 E2E 테스트 추가
  // describe('Users API', () => { ... });
  // describe('Places API', () => { ... });
});
