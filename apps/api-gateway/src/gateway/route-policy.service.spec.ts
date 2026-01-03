import { Test, TestingModule } from '@nestjs/testing';
import { RoutePolicyService } from './route-policy.service';
import { RoutePoilcy } from '@virtualcafe/common';
import { writeFileSync, unlinkSync, mkdirSync } from 'fs';
import { join } from 'path';
import { existsSync } from 'fs';

describe('RoutePolicyService', () => {
  let service: RoutePolicyService;
  let testPolicyFilePath: string;
  let originalEnv: string | undefined;

  beforeEach(async () => {
    // 테스트용 임시 정책 파일 생성
    const testDir = join(__dirname, '..', '..', 'test-temp');
    if (!existsSync(testDir)) {
      mkdirSync(testDir, { recursive: true });
    }
    testPolicyFilePath = join(testDir, 'test-route-policy.json');

    // 환경 변수 백업 및 설정
    originalEnv = process.env.ROUTE_POLICY_FILE_PATH;
    process.env.ROUTE_POLICY_FILE_PATH = testPolicyFilePath;

    const module: TestingModule = await Test.createTestingModule({
      providers: [RoutePolicyService],
    }).compile();

    service = module.get<RoutePolicyService>(RoutePolicyService);
  });

  afterEach(() => {
    // 테스트 파일 정리
    if (existsSync(testPolicyFilePath)) {
      unlinkSync(testPolicyFilePath);
    }

    // 환경 변수 복원
    if (originalEnv !== undefined) {
      process.env.ROUTE_POLICY_FILE_PATH = originalEnv;
    } else {
      delete process.env.ROUTE_POLICY_FILE_PATH;
    }
  });

  describe('정확한 경로 매칭', () => {
    it('정확한 경로로 정책을 찾을 수 있어야 함', () => {
      const testPolicy: Record<string, RoutePoilcy> = {
        'GET /hello': { type: 'public' },
        'POST /login': { type: 'public' },
        'GET /users/admin': { type: 'role', roles: ['ADMIN'] },
      };

      writeFileSync(
        testPolicyFilePath,
        JSON.stringify(testPolicy, null, 2),
        'utf-8',
      );

      service.onModuleInit();

      expect(service.getPolicy('GET', '/hello')).toEqual({ type: 'public' });
      expect(service.getPolicy('POST', '/login')).toEqual({ type: 'public' });
      expect(service.getPolicy('GET', '/users/admin')).toEqual({
        type: 'role',
        roles: ['ADMIN'],
      });
    });

    it('존재하지 않는 경로는 null을 반환해야 함', () => {
      const testPolicy: Record<string, RoutePoilcy> = {
        'GET /hello': { type: 'public' },
      };

      writeFileSync(
        testPolicyFilePath,
        JSON.stringify(testPolicy, null, 2),
        'utf-8',
      );

      service.onModuleInit();

      expect(service.getPolicy('GET', '/not-found')).toBeNull();
      expect(service.getPolicy('POST', '/hello')).toBeNull();
    });
  });

  describe('동적 라우팅 파라미터 매칭', () => {
    it('id가 포함된 파라미터는 숫자만 매칭되어야 함', () => {
      const testPolicy: Record<string, RoutePoilcy> = {
        'GET /users/:id': { type: 'public' },
        'GET /cafes/:cafeId': { type: 'public' },
        'GET /users/:userId/posts': { type: 'public' },
        'GET /products/:productId': { type: 'public' },
      };

      writeFileSync(
        testPolicyFilePath,
        JSON.stringify(testPolicy, null, 2),
        'utf-8',
      );

      service.onModuleInit();

      // 숫자는 매칭됨
      expect(service.getPolicy('GET', '/users/123')).toEqual({
        type: 'public',
      });
      expect(service.getPolicy('GET', '/cafes/456')).toEqual({
        type: 'public',
      });
      expect(service.getPolicy('GET', '/users/789/posts')).toEqual({
        type: 'public',
      });
      expect(service.getPolicy('GET', '/products/999')).toEqual({
        type: 'public',
      });

      // 숫자가 아니면 매칭 안 됨
      expect(service.getPolicy('GET', '/users/abc')).toBeNull();
      expect(service.getPolicy('GET', '/cafes/abc123')).toBeNull();
      expect(service.getPolicy('GET', '/users/abc/posts')).toBeNull();
      expect(service.getPolicy('GET', '/products/123abc')).toBeNull();
    });

    it('id가 포함되지 않은 파라미터는 모든 문자를 매칭해야 함', () => {
      const testPolicy: Record<string, RoutePoilcy> = {
        'GET /users/:name': { type: 'public' },
        'GET /posts/:slug': { type: 'public' },
        'GET /categories/:categoryName': { type: 'public' },
      };

      writeFileSync(
        testPolicyFilePath,
        JSON.stringify(testPolicy, null, 2),
        'utf-8',
      );

      service.onModuleInit();

      // 모든 문자 매칭
      expect(service.getPolicy('GET', '/users/john')).toEqual({
        type: 'public',
      });
      expect(service.getPolicy('GET', '/posts/my-post-slug')).toEqual({
        type: 'public',
      });
      expect(service.getPolicy('GET', '/categories/tech-news')).toEqual({
        type: 'public',
      });

      // 숫자도 매칭됨
      expect(service.getPolicy('GET', '/users/123')).toEqual({
        type: 'public',
      });
    });

    it('단일 동적 파라미터를 매칭할 수 있어야 함', () => {
      const testPolicy: Record<string, RoutePoilcy> = {
        'GET /users/checkLogin/:id': { type: 'public' },
        'GET /users/:userId': { type: 'role', roles: ['ADMIN'] },
      };

      writeFileSync(
        testPolicyFilePath,
        JSON.stringify(testPolicy, null, 2),
        'utf-8',
      );

      service.onModuleInit();

      // 동적 파라미터 매칭 (숫자만)
      expect(service.getPolicy('GET', '/users/checkLogin/123')).toEqual({
        type: 'public',
      });
      expect(service.getPolicy('GET', '/users/checkLogin/456')).toEqual({
        type: 'public',
      });
      expect(service.getPolicy('GET', '/users/789')).toEqual({
        type: 'role',
        roles: ['ADMIN'],
      });

      // id 파라미터는 숫자가 아니면 매칭 안 됨
      expect(service.getPolicy('GET', '/users/checkLogin/abc')).toBeNull();
      expect(service.getPolicy('GET', '/users/checkLogin/123abc')).toBeNull();
      expect(service.getPolicy('GET', '/users/abc')).toBeNull();
    });

    it('여러 동적 파라미터를 매칭할 수 있어야 함', () => {
      const testPolicy: Record<string, RoutePoilcy> = {
        'PATCH /users/:userId/posts/:postId': {
          type: 'role',
          roles: ['ADMIN'],
        },
        'GET /users/:userId/orders/:orderId/items/:itemId': {
          type: 'public',
        },
      };

      writeFileSync(
        testPolicyFilePath,
        JSON.stringify(testPolicy, null, 2),
        'utf-8',
      );

      service.onModuleInit();

      // id 파라미터는 숫자만 매칭
      expect(
        service.getPolicy('PATCH', '/users/123/posts/456'),
      ).toEqual({
        type: 'role',
        roles: ['ADMIN'],
      });

      expect(
        service.getPolicy('GET', '/users/123/orders/456/items/789'),
      ).toEqual({
        type: 'public',
      });

      // 숫자가 아니면 매칭 안 됨
      expect(
        service.getPolicy('PATCH', '/users/abc/posts/456'),
      ).toBeNull();
      expect(
        service.getPolicy('GET', '/users/123/orders/abc/items/789'),
      ).toBeNull();
    });

    it('동적 파라미터와 정확한 경로가 모두 있을 때 정확한 경로를 우선해야 함', () => {
      const testPolicy: Record<string, RoutePoilcy> = {
        'GET /users/admin': { type: 'role', roles: ['ADMIN'] },
        'GET /users/:id': { type: 'public' },
      };

      writeFileSync(
        testPolicyFilePath,
        JSON.stringify(testPolicy, null, 2),
        'utf-8',
      );

      service.onModuleInit();

      // 정확한 경로가 우선
      expect(service.getPolicy('GET', '/users/admin')).toEqual({
        type: 'role',
        roles: ['ADMIN'],
      });

      // 동적 파라미터 매칭
      expect(service.getPolicy('GET', '/users/123')).toEqual({
        type: 'public',
      });
    });

    it('동적 파라미터가 경로 끝에 있을 때도 매칭되어야 함', () => {
      const testPolicy: Record<string, RoutePoilcy> = {
        'DELETE /users/:userId': { type: 'role', roles: ['ADMIN'] },
        'GET /places/:id': { type: 'public' },
      };

      writeFileSync(
        testPolicyFilePath,
        JSON.stringify(testPolicy, null, 2),
        'utf-8',
      );

      service.onModuleInit();

      // id 파라미터는 숫자만 매칭
      expect(service.getPolicy('DELETE', '/users/123')).toEqual({
        type: 'role',
        roles: ['ADMIN'],
      });
      expect(service.getPolicy('GET', '/places/456')).toEqual({
        type: 'public',
      });

      // 숫자가 아니면 매칭 안 됨
      expect(service.getPolicy('DELETE', '/users/abc')).toBeNull();
      expect(service.getPolicy('GET', '/places/abc123')).toBeNull();
    });

    it('동적 파라미터가 중간에 있을 때도 매칭되어야 함', () => {
      const testPolicy: Record<string, RoutePoilcy> = {
        'PATCH /users/:userId/updatepw': { type: 'public' },
        'GET /users/:userId/posts/:postId/comments': {
          type: 'role',
          roles: ['ADMIN'],
        },
      };

      writeFileSync(
        testPolicyFilePath,
        JSON.stringify(testPolicy, null, 2),
        'utf-8',
      );

      service.onModuleInit();

      // id 파라미터는 숫자만 매칭
      expect(service.getPolicy('PATCH', '/users/123/updatepw')).toEqual({
        type: 'public',
      });
      expect(
        service.getPolicy('GET', '/users/123/posts/456/comments'),
      ).toEqual({
        type: 'role',
        roles: ['ADMIN'],
      });

      // 숫자가 아니면 매칭 안 됨
      expect(service.getPolicy('PATCH', '/users/abc/updatepw')).toBeNull();
      expect(
        service.getPolicy('GET', '/users/123/posts/abc/comments'),
      ).toBeNull();
    });

    it('추가 경로가 있으면 매칭되지 않아야 함', () => {
      const testPolicy: Record<string, RoutePoilcy> = {
        'GET /users/:id': { type: 'public' },
      };

      writeFileSync(
        testPolicyFilePath,
        JSON.stringify(testPolicy, null, 2),
        'utf-8',
      );

      service.onModuleInit();

      // 정확한 매칭
      expect(service.getPolicy('GET', '/users/123')).toEqual({
        type: 'public',
      });
      
      // 슬래시로 끝나는 경로는 정규화되어 매칭됨 (일반적인 동작)
      expect(service.getPolicy('GET', '/users/123/')).toEqual({
        type: 'public',
      });
      
      // 추가 경로가 있으면 매칭 안 됨
      expect(service.getPolicy('GET', '/users/123/extra')).toBeNull();
      expect(service.getPolicy('GET', '/users/123/extra/path')).toBeNull();
    });
  });

  describe('isPublic', () => {
    it('Public 라우트를 올바르게 식별해야 함', () => {
      const testPolicy: Record<string, RoutePoilcy> = {
        'GET /hello': { type: 'public' },
        'GET /users/:id': { type: 'public' },
        'GET /admin': { type: 'role', roles: ['ADMIN'] },
      };

      writeFileSync(
        testPolicyFilePath,
        JSON.stringify(testPolicy, null, 2),
        'utf-8',
      );

      service.onModuleInit();

      expect(service.isPublic('GET', '/hello')).toBe(true);
      expect(service.isPublic('GET', '/hello/123')).toBe(false);
      expect(service.isPublic('GET', '/users/123')).toBe(true);
      expect(service.isPublic('GET', '/admin')).toBe(false);
      expect(service.isPublic('GET', '/not-found')).toBe(false);
    });
  });

  describe('getRequiredRoles', () => {
    it('필요한 역할을 올바르게 반환해야 함', () => {
      const testPolicy: Record<string, RoutePoilcy> = {
        'GET /admin': { type: 'role', roles: ['ADMIN'] },
        'PATCH /users/:userId': { type: 'role', roles: ['ADMIN', 'USER'] },
        'GET /public': { type: 'public' },
      };

      writeFileSync(
        testPolicyFilePath,
        JSON.stringify(testPolicy, null, 2),
        'utf-8',
      );

      service.onModuleInit();

      expect(service.getRequiredRoles('GET', '/admin')).toEqual(['ADMIN']);
      expect(service.getRequiredRoles('PATCH', '/users/123')).toEqual([
        'ADMIN',
        'USER',
      ]);
      expect(service.getRequiredRoles('GET', '/public')).toBeNull();
      expect(service.getRequiredRoles('GET', '/not-found')).toBeNull();
    });
  });

  describe('hasAccess', () => {
    it('Public 라우트는 모든 사용자가 접근 가능해야 함', () => {
      const testPolicy: Record<string, RoutePoilcy> = {
        'GET /public': { type: 'public' },
        'GET /users/:id': { type: 'public' },
      };

      writeFileSync(
        testPolicyFilePath,
        JSON.stringify(testPolicy, null, 2),
        'utf-8',
      );

      service.onModuleInit();

      expect(service.hasAccess('GET', '/public')).toBe(true);
      expect(service.hasAccess('GET', '/public', 'ADMIN')).toBe(true);
      expect(service.hasAccess('GET', '/users/123')).toBe(true);
      expect(service.hasAccess('GET', '/users/123', 'USER')).toBe(true);
    });

    it('Role 기반 라우트는 필요한 역할이 있어야 접근 가능해야 함', () => {
      const testPolicy: Record<string, RoutePoilcy> = {
        'GET /admin': { type: 'role', roles: ['ADMIN'] },
        'PATCH /users/:userId': { type: 'role', roles: ['ADMIN', 'USER'] },
      };

      writeFileSync(
        testPolicyFilePath,
        JSON.stringify(testPolicy, null, 2),
        'utf-8',
      );

      service.onModuleInit();

      // ADMIN 역할
      expect(service.hasAccess('GET', '/admin', 'ADMIN')).toBe(true);
      expect(service.hasAccess('PATCH', '/users/123', 'ADMIN')).toBe(true);

      // USER 역할
      expect(service.hasAccess('GET', '/admin', 'USER')).toBe(false);
      expect(service.hasAccess('PATCH', '/users/123', 'USER')).toBe(true);

      // 역할 없음
      expect(service.hasAccess('GET', '/admin')).toBe(false);
      expect(service.hasAccess('PATCH', '/users/123')).toBe(false);
    });

    it('역할은 대소문자 구분 없이 매칭되어야 함', () => {
      const testPolicy: Record<string, RoutePoilcy> = {
        'GET /admin': { type: 'role', roles: ['ADMIN'] },
      };

      writeFileSync(
        testPolicyFilePath,
        JSON.stringify(testPolicy, null, 2),
        'utf-8',
      );

      service.onModuleInit();

      expect(service.hasAccess('GET', '/admin', 'admin')).toBe(true);
      expect(service.hasAccess('GET', '/admin', 'Admin')).toBe(true);
      expect(service.hasAccess('GET', '/admin', 'ADMIN')).toBe(true);
    });

    it('정책이 없으면 접근 불가해야 함 (보안)', () => {
      const testPolicy: Record<string, RoutePoilcy> = {
        'GET /public': { type: 'public' },
      };

      writeFileSync(
        testPolicyFilePath,
        JSON.stringify(testPolicy, null, 2),
        'utf-8',
      );

      service.onModuleInit();

      expect(service.hasAccess('GET', '/not-found')).toBe(false);
      expect(service.hasAccess('GET', '/not-found', 'ADMIN')).toBe(false);
    });
  });

  describe('경로 정규화', () => {
    it('다양한 경로 형식을 정규화해야 함', () => {
      const testPolicy: Record<string, RoutePoilcy> = {
        'GET /users/:id': { type: 'public' },
      };

      writeFileSync(
        testPolicyFilePath,
        JSON.stringify(testPolicy, null, 2),
        'utf-8',
      );

      service.onModuleInit();

      // 다양한 경로 형식 모두 매칭되어야 함
      expect(service.getPolicy('GET', 'users/123')).toEqual({
        type: 'public',
      });
      expect(service.getPolicy('GET', '/users/123')).toEqual({
        type: 'public',
      });
      expect(service.getPolicy('GET', '//users//123')).toEqual({
        type: 'public',
      });
    });

    it('끝에 슬래시가 있는 정책이 다양한 경로 형식과 매칭되어야 함', () => {
      const testPolicy: Record<string, RoutePoilcy> = {
        'GET /boards/': { type: 'public' },
      };

      writeFileSync(
        testPolicyFilePath,
        JSON.stringify(testPolicy, null, 2),
        'utf-8',
      );

      service.onModuleInit();

      // 끝에 슬래시가 없는 경로도 매칭되어야 함 (정규화 후 동일)
      expect(service.getPolicy('GET', '/boards')).toEqual({
        type: 'public',
      });
      expect(service.isPublic('GET', '/boards')).toBe(true);

      // 끝에 슬래시가 있는 경로도 매칭되어야 함
      expect(service.getPolicy('GET', '/boards/')).toEqual({
        type: 'public',
      });
      expect(service.isPublic('GET', '/boards/')).toBe(true);

      // 실제 미들웨어에서는 originalUrl에서 쿼리를 분리한 경로가 전달됨
      // 예: req.originalUrl?.split('?')[0] || req.path
      // 따라서 쿼리 파라미터가 있는 경우 경로만 분리하여 전달
      const pathWithQuery1 = '/boards?page=1';
      const pathOnly1 = pathWithQuery1.split('?')[0]; // '/boards'
      expect(service.getPolicy('GET', pathOnly1)).toEqual({
        type: 'public',
      });
      expect(service.isPublic('GET', pathOnly1)).toBe(true);

      const pathWithQuery2 = '/boards/?page=1&limit=10';
      const pathOnly2 = pathWithQuery2.split('?')[0]; // '/boards/'
      expect(service.getPolicy('GET', pathOnly2)).toEqual({
        type: 'public',
      });
      expect(service.isPublic('GET', pathOnly2)).toBe(true);

      // 빈 쿼리 파라미터가 있는 경우도 처리
      const pathWithEmptyQuery = '/boards?';
      const pathOnly3 = pathWithEmptyQuery.split('?')[0]; // '/boards'
      expect(service.getPolicy('GET', pathOnly3)).toEqual({
        type: 'public',
      });
      expect(service.isPublic('GET', pathOnly3)).toBe(true);
    });
  });

  describe('HTTP 메서드 대소문자 처리', () => {
    it('HTTP 메서드는 대소문자 구분 없이 처리되어야 함', () => {
      const testPolicy: Record<string, RoutePoilcy> = {
        'GET /hello': { type: 'public' },
        'POST /login': { type: 'public' },
        'PATCH /users/:id': { type: 'role', roles: ['ADMIN'] },
      };

      writeFileSync(
        testPolicyFilePath,
        JSON.stringify(testPolicy, null, 2),
        'utf-8',
      );

      service.onModuleInit();

      expect(service.getPolicy('get', '/hello')).toEqual({ type: 'public' });
      expect(service.getPolicy('Get', '/hello')).toEqual({ type: 'public' });
      expect(service.getPolicy('GET', '/hello')).toEqual({ type: 'public' });

      expect(service.getPolicy('post', '/login')).toEqual({ type: 'public' });
      expect(service.getPolicy('POST', '/login')).toEqual({ type: 'public' });

      expect(service.getPolicy('patch', '/users/123')).toEqual({
        type: 'role',
        roles: ['ADMIN'],
      });
      expect(service.getPolicy('PATCH', '/users/123')).toEqual({
        type: 'role',
        roles: ['ADMIN'],
      });
    });
  });

  describe('복잡한 시나리오', () => {
    it('실제 사용 사례와 유사한 복잡한 정책을 처리해야 함', () => {
      const testPolicy: Record<string, RoutePoilcy> = {
        'GET /': { type: 'public' },
        'GET /users/duplicate': { type: 'public' },
        'GET /users/checkLogin/:id': { type: 'public' },
        'GET /users/admin': { type: 'role', roles: ['ADMIN'] },
        'PATCH /users/admin/user/:userId': {
          type: 'role',
          roles: ['ADMIN'],
        },
        'PATCH /users/:userId/updatepw': { type: 'public' },
        'GET /places/:id': { type: 'public' },
        'DELETE /places/:id': { type: 'role', roles: ['ADMIN'] },
      };

      writeFileSync(
        testPolicyFilePath,
        JSON.stringify(testPolicy, null, 2),
        'utf-8',
      );

      service.onModuleInit();

      // Public 라우트
      expect(service.isPublic('GET', '/')).toBe(true);
      expect(service.isPublic('GET', '/users/duplicate')).toBe(true);
      expect(service.isPublic('GET', '/users/checkLogin/123')).toBe(true);
      expect(service.isPublic('PATCH', '/users/456/updatepw')).toBe(true);
      expect(service.isPublic('GET', '/places/789')).toBe(true);

      // Role 기반 라우트
      expect(service.isPublic('GET', '/users/admin')).toBe(false);
      expect(service.getRequiredRoles('GET', '/users/admin')).toEqual([
        'ADMIN',
      ]);
      expect(
        service.getRequiredRoles('PATCH', '/users/admin/user/123'),
      ).toEqual(['ADMIN']);
      expect(service.getRequiredRoles('DELETE', '/places/456')).toEqual([
        'ADMIN',
      ]);

      // 접근 권한 확인
      expect(service.hasAccess('GET', '/users/admin', 'ADMIN')).toBe(true);
      expect(service.hasAccess('GET', '/users/admin', 'USER')).toBe(false);
      expect(service.hasAccess('DELETE', '/places/123', 'ADMIN')).toBe(true);
      expect(service.hasAccess('DELETE', '/places/123', 'USER')).toBe(false);
    });
  });

  describe('정책 파일 없음 처리', () => {
    it('정책 파일이 없으면 빈 정책을 사용해야 함', () => {
      // 파일을 생성하지 않음
      service.onModuleInit();

      expect(service.getPolicy('GET', '/any')).toBeNull();
      expect(service.isPublic('GET', '/any')).toBe(false);
      expect(service.hasAccess('GET', '/any', 'ADMIN')).toBe(false);
    });
  });
});

