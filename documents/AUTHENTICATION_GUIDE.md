# 인증 및 인가 가이드

## 개요

이 문서는 마이그레이션된 microservices (`place-api-service`, `meta-viewer-service`)의 인증 및 인가 시스템에 대한 종합 가이드입니다.

## 아키텍처

### 전체 흐름

```
Client
  ↓ JWT Token
API Gateway
  ├─ JWT 검증 (서명, 만료)
  ├─ Public 경로 체크
  └─ userId / role 추출 → X-User-* 헤더 추가
        ↓
내부 서비스 (place-api-service, meta-viewer-service)
  ├─ UserHeaderMiddleware: 헤더에서 user 정보 추출
  ├─ AuthorizationGuard: RequireRole 데코레이터 확인
  └─ Controller: req.user 사용
```

### 핵심 개념

| 구분 | 담당 | 설명 |
|------|------|------|
| **Authentication** | API Gateway | JWT 검증 (서명, 만료) |
| **Authorization** | 내부 서비스 | Role 기반 접근 제어 |

## API Gateway

### 역할

1. **JWT 검증**
   - 모든 요청의 JWT 토큰 검증
   - Public 경로는 인증 생략

2. **User 정보 전달**
   - 검증된 JWT에서 user 정보 추출
   - 내부 서비스로 헤더 전달:
     - `X-User-Id`: 사용자 ID
     - `X-User-Role`: 사용자 Role (ADMIN, MANAGER, USER)
     - `X-User-Email`: 사용자 이메일
     - `X-User-Name`: 사용자 이름

### Public 경로 관리

각 서비스의 public 경로는 설정 파일로 관리:

```typescript
// apps/place-api-service/src/config/public-paths.config.ts
export const placeApiPublicPaths = [
  '/login',
  '/signup',
  '/health',
  // ...
];

// apps/api-gateway/src/config/public-paths.config.ts
import { placeApiPublicPaths } from '../../../apps/place-api-service/src/config/public-paths.config';
import { metaViewerPublicPaths } from '../../../apps/meta-viewer-service/src/config/public-paths.config';

export const publicPathsConfig = {
  placeApi: placeApiPublicPaths,
  metaViewer: metaViewerPublicPaths,
  common: ['/health'],
};
```

## 내부 서비스

### UserHeaderMiddleware

Gateway가 전달한 헤더에서 user 정보를 추출하여 `req.user`에 설정:

```typescript
// libs/common/src/auth/user-header.middleware.ts
req['user'] = {
  id: req.headers['x-user-id'],
  role: req.headers['x-user-role'],
  email: req.headers['x-user-email'],
};
```

### AuthorizationGuard

`RequireRole` 데코레이터가 적용된 엔드포인트의 role을 체크:

```typescript
// libs/common/src/auth/authorization.guard.ts
const requiredRoles = this.reflector.getAllAndOverride<string[]>(
  ROLES_KEY,
  [context.getHandler(), context.getClass()],
);

if (requiredRoles && requiredRoles.length > 0) {
  const user = request.user;
  return requiredRoles.some((role) => user.role === role);
}
```

## Role 기반 접근 제어

### Role 값

JWT에서 role은 `user.userType`에서 가져옵니다:

```typescript
// apps/place-api-service/src/auth/auth.service.ts
const payload = {
  sub: user.id.toString(),
  role: user.userType || 'USER', // 'ADMIN', 'MANAGER', 'USER'
  // ...
};
```

### 사용 방법

#### 기본 사용법

```typescript
import { Public, RequireRole } from '../util/decorators';

@Controller('orders')
export class OrdersController {
  // 모든 인증된 사용자 접근 가능
  @Get()
  getOrders(@Req() req) {
    return this.ordersService.findByUserId(req.user.id);
  }

  // ADMIN 또는 MANAGER만 접근 가능
  @RequireRole('ADMIN', 'MANAGER')
  @Post()
  createOrder(@Body() dto: CreateOrderDto) {
    return this.ordersService.create(dto);
  }

  // ADMIN만 접근 가능
  @RequireRole('ADMIN')
  @Delete(':id')
  deleteOrder(@Param('id') id: string) {
    return this.ordersService.delete(id);
  }
}
```

#### Controller 레벨 적용

```typescript
@Controller('admin')
@RequireRole('ADMIN') // 모든 엔드포인트에 적용
export class AdminController {
  @Get('users')
  getUsers() {
    // ADMIN만 접근 가능
  }
}
```

### Role 체크 흐름

1. Gateway: JWT에서 role 추출 → `X-User-Role` 헤더 추가
2. UserHeaderMiddleware: 헤더에서 role 추출 → `req.user.role` 설정
3. AuthorizationGuard: `@RequireRole` 확인 → role 체크
4. Controller: role 체크 통과 시 실행

## Decorator Re-export 패턴

### 구조

모든 데코레이터를 `util/decorators.ts`에서 관리:

```typescript
// apps/place-api-service/src/util/decorators.ts
import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

export { RequireRole } from '@virtualcafe/common';
```

### 사용

```typescript
// Controller
import { Public, RequireRole } from '../util/decorators';
```

### 장점

1. **일관성**: 모든 데코레이터를 한 곳에서 관리
2. **확장성**: 서비스별 커스텀 데코레이터 추가 가능
3. **유지보수성**: 데코레이터 변경 시 한 곳만 수정

## JWT 발급

### place-api-service

로그인 시 JWT를 발급합니다:

```typescript
// apps/place-api-service/src/auth/auth.service.ts
async login(loginType: LoginType, loginId: string, loginPw?: string) {
  // ... user validation

  const payload = {
    sub: user.id.toString(),      // Gateway에서 사용 (필수)
    id: user.id,
    userId: user.id,
    role: user.userType || 'USER', // Gateway에서 사용
    email: user.email || '',
    name: user.nickname || user.loginId || '',
  };

  const accessToken = this.jwtService.sign(payload);
  return { user, accessToken };
}
```

## 마이그레이션 상태

### 완료된 서비스

- ✅ `place-api-service`: 모든 Admin API가 `@RequireRole('ADMIN')` 사용
- ✅ `meta-viewer-service`: 모든 Admin API가 `@RequireRole('ADMIN')` 사용

### 기존 Monolith

- `mecipe-was`: 기존 `AdminAuthGuard` 유지 (독립 운영)

## 주의사항

### 1. Role 값 일치

JWT에서 발급하는 role과 `RequireRole`에서 사용하는 role이 일치해야 합니다:

```typescript
// JWT 발급
role: user.userType || 'USER'  // 'ADMIN', 'MANAGER', 'USER'

// RequireRole 사용
@RequireRole('ADMIN', 'MANAGER')  // ✅ 일치해야 함
```

### 2. Public 경로 동기화

각 서비스의 public 경로는 Gateway 설정에 반영되어야 합니다:

```typescript
// 서비스에서 public 경로 추가 시
// apps/place-api-service/src/config/public-paths.config.ts
export const placeApiPublicPaths = [
  '/login',
  '/signup',
  '/new-public-endpoint', // 추가
];

// Gateway 설정도 업데이트 필요
// apps/api-gateway/src/config/public-paths.config.ts
```

### 3. User 정보 신뢰

Gateway에서 전달한 user 정보는 신뢰할 수 있습니다. 추가 DB 조회는 불필요합니다:

```typescript
// ✅ 올바른 사용
@Get('profile')
getProfile(@Req() req) {
  const userId = req.user.id; // Gateway가 검증한 값
  return this.service.findProfile(userId);
}

// ❌ 불필요한 검증
@Get('profile')
async getProfile(@Req() req) {
  // Gateway가 이미 검증했으므로 불필요
  const user = await this.userService.findById(req.user.id);
  if (!user) throw new Error('User not found');
  // ...
}
```

## 예시: 전체 흐름

### 1. 로그인

```typescript
// Client → place-api-service
POST /login
Body: { loginType: 'LOCAL', loginId: 'user', loginPw: 'pass' }

// Response
{
  user: { id: 1, userType: 'ADMIN', ... },
  accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
}
```

### 2. 인증된 요청

```typescript
// Client → API Gateway
GET /api/places/admin
Headers: { Authorization: 'Bearer <token>' }

// Gateway
1. JWT 검증 ✅
2. decoded.role = 'ADMIN'
3. req.headers['x-user-role'] = 'ADMIN'
4. place-api-service로 프록시

// place-api-service
1. UserHeaderMiddleware: req.user.role = 'ADMIN'
2. AuthorizationGuard: @RequireRole('ADMIN') 체크 ✅
3. Controller 실행
```

### 3. Public 요청

```typescript
// Client → API Gateway
GET /api/places/search

// Gateway
1. Public 경로 확인 ✅
2. 인증 생략
3. place-api-service로 프록시
```

## 참고 파일

- Gateway JWT 검증: `apps/api-gateway/src/middleware/jwt-validation.middleware.ts`
- User 헤더 추출: `libs/common/src/auth/user-header.middleware.ts`
- Role 체크: `libs/common/src/auth/authorization.guard.ts`
- Public 경로 설정: `apps/*/src/config/public-paths.config.ts`
- Decorator: `apps/*/src/util/decorators.ts`



