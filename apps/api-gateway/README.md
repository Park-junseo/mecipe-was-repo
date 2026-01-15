# API Gateway

API Gateway는 마이크로서비스 아키텍처에서 모든 클라이언트 요청의 단일 진입점 역할을 하는 서비스입니다. JWT 인증, 라우팅 정책 관리, 요청 프록시 등의 기능을 제공하며, 현재는 주로 Place API Service로 트래픽을 전달하고 있습니다.

## 개요

이 서비스는 다음과 같은 주요 기능을 제공합니다:

1. **단일 진입점**: 모든 클라이언트 요청을 받아 적절한 내부 서비스로 라우팅
2. **JWT 인증 미들웨어**: 모든 요청의 JWT 토큰 검증 및 사용자 정보 추출
3. **라우팅 정책 관리**: 데코레이터 기반 라우팅 정책 수집 및 적용
4. **요청 프록시**: 인증된 요청을 내부 서비스로 프록시
5. **헤더 전달**: JWT에서 추출한 사용자 정보를 내부 서비스로 전달

## 아키텍처

### 서비스 구조

```
Client
    ↓
API Gateway
    ├── JWT 인증 미들웨어
    ├── Route Policy Service
    ├── Gateway Controller
    └── Gateway Service
    ↓
Internal Services
    ├── Place API Service (현재 주 사용)
    ├── Meta Viewer Service (향후 연계 예정)
    └── 기타 서비스들 (향후 연계 예정)
```

### 요청 흐름

1. **클라이언트 요청**: 클라이언트가 API Gateway로 요청
2. **JWT 검증**: JWT 인증 미들웨어가 토큰 검증
3. **라우팅 정책 확인**: Route Policy Service가 Public/Protected 경로 확인
4. **사용자 정보 추출**: JWT에서 사용자 정보 추출 및 헤더 추가
5. **서비스 라우팅**: Gateway Service가 적절한 내부 서비스로 프록시
6. **응답 반환**: 내부 서비스 응답을 클라이언트에 반환

## 주요 기능

1. **JWT 인증 미들웨어**: 모든 요청의 JWT 토큰 검증 및 사용자 정보 추출
2. **데코레이터 기반 정책 수집**: 다른 서비스의 `@Public()`, `@RequireRole()` 데코레이터를 자동 수집
3. **동적 라우팅 정책**: `route-policy.json` 파일 기반 라우팅 정책 관리
4. **자동 정책 업데이트**: 개발 환경에서 정책 파일 변경 시 자동 재로드
5. **다중 서비스 지원**: 향후 여러 서비스로 라우팅 확장 가능

## 실행 방법

### 기본 실행 (개발 모드)

```bash
pnpm start:dev
```

개발 모드로 서비스를 실행합니다. 파일 변경 시 자동으로 재시작됩니다.

### 라우팅 정책 수집

```bash
pnpm export:policy
```

모든 서비스의 라우팅 정책을 수집하여 `config/route-policy.json` 파일을 생성합니다.

#### 정책 수집 옵션

- **통합 정책 생성 (기본값)**: `pnpm export:policy` 또는 `pnpm export:policy --merge`
  - 모든 서비스의 정책을 하나의 파일로 병합
- **서비스별 개별 파일**: `pnpm export:policy --separate`
  - 각 서비스별로 개별 정책 파일 생성
- **특정 서비스만**: `pnpm export:policy --service=place-api-service`
  - 특정 서비스의 정책만 수집

## 모듈 구조

### 1. App Module (`app.module.ts`)

애플리케이션의 루트 모듈입니다. 다음 모듈들을 통합합니다:
- `ConfigModule`: 환경 변수 및 설정 관리
- `GatewayModule`: Gateway 컨트롤러 및 서비스
- `JwtValidationMiddleware`: JWT 인증 미들웨어

**주요 기능:**
- JWT 인증 미들웨어를 모든 경로에 적용 (헬스체크 제외)
- HTTP 로깅 미들웨어 적용

### 2. Gateway Module (`gateway/`)

Gateway의 핵심 모듈입니다.

#### GatewayController (`gateway.controller.ts`)
- 모든 HTTP 메서드를 처리하는 컨트롤러 (`@All('*')`)
- 요청을 Gateway Service로 전달하여 프록시 처리
- 304 Not Modified 응답 처리

#### GatewayService (`gateway.service.ts`)
- 내부 서비스로 요청을 프록시하는 서비스
- 현재는 Place API Service로 대부분의 트래픽 전달
- 헤더 정리 및 사용자 정보 헤더 추가
- 네트워크 에러 처리

**주요 기능:**
- `proxyToPlaceApi()`: Place API Service로 요청 프록시
- 헤더 값 정리 (제어 문자 제거, URL 인코딩)
- 사용자 정보 헤더 추가 (`x-user-id`, `x-user-role`, `x-user-email`, `x-user-name`)

#### RoutePolicyService (`route-policy.service.ts`)

**라우팅 정책 관리 서비스**

- `route-policy.json` 파일을 읽어서 라우팅 정책 관리
- Public/Protected 경로 확인
- 역할 기반 접근 제어
- 동적 라우팅 파라미터 지원 (`:id`, `:userId` 등)

**주요 기능:**
- `getPolicy()`: 특정 라우트의 정책 조회
- `isPublic()`: 라우트가 Public인지 확인
- `getRequiredRoles()`: 라우트에 필요한 역할 조회
- `hasAccess()`: 사용자 역할이 라우트 접근 권한이 있는지 확인
- 정책 파일 자동 재로드 (개발 환경)

### 3. Middleware (`middleware/`)

미들웨어 모듈입니다.

#### JwtValidationMiddleware (`jwt-validation.middleware.ts`)

**JWT 인증 미들웨어**

- 모든 요청의 JWT 토큰 검증
- Route Policy를 통한 Public 경로 확인
- JWT에서 사용자 정보 추출 및 헤더 추가
- 토큰 만료 및 유효하지 않은 토큰 처리

**작동 방식:**
1. Route Policy를 확인하여 Public 경로인지 확인
2. Public 경로가 아니면 JWT 토큰 검증
3. JWT에서 사용자 정보 추출 (`sub`, `role`, `email`, `name`)
4. 사용자 정보를 헤더로 추가 (`x-user-id`, `x-user-role`, `x-user-email`, `x-user-name`)
5. `req.user`에도 사용자 정보 저장

**JWT 검증:**
- 알고리즘: RS256 (RSA 공개키)
- 공개키: `JWT_PUBLIC_KEY` 환경 변수 (Base64 인코딩된 PEM 형식)

### 4. Route Policy 수집 시스템

#### Export Route Policy Script (`scripts/export-route-policy.ts`)

**데코레이터 기반 라우팅 정책 수집 스크립트**

이 스크립트는 다른 서비스들의 컨트롤러에서 `@Public()` 및 `@RequireRole()` 데코레이터를 수집하여 `route-policy.json` 파일을 생성합니다.

**작동 방식:**

1. **서비스 모듈 동적 로드**: 각 서비스의 `AppModule`을 동적으로 로드
2. **데코레이터 수집**: `exportPolicy()` 함수를 통해 컨트롤러의 데코레이터 수집
3. **정책 파일 생성**: 수집된 정책을 JSON 파일로 저장
4. **정책 병합**: 여러 서비스의 정책을 하나의 파일로 병합

**서비스 설정:**

```typescript
const SERVICES: ServiceConfig[] = [
  {
    name: 'place-api-service',
    modulePath: 'apps/place-api-service/src/app.module',
    displayName: 'Place API Service',
  },
  // 향후 다른 서비스 추가 예정
];
```

**정책 파일 형식:**

```json
{
  "GET /api/places": {
    "type": "public"
  },
  "POST /api/places": {
    "type": "role",
    "roles": ["ADMIN", "MANAGER"]
  },
  "GET /api/places/:id": {
    "type": "public"
  }
}
```

**정책 타입:**
- `public`: 인증 없이 접근 가능
- `role`: 특정 역할이 필요 (roles 배열에 지정된 역할 중 하나)

**동적 라우팅 지원:**
- `:id`, `:userId` 등의 동적 파라미터를 정규식으로 변환하여 매칭
- `:id`는 숫자만 매칭 (`\d+`)
- 그 외 파라미터는 모든 문자 매칭 (`[^/]+`)

## 현재 라우팅 구조

현재 API Gateway는 대부분의 트래픽을 **Place API Service**로 전달하고 있습니다.

### Place API Service

- **URL**: `PLACE_API_SERVICE_URL` 환경 변수 또는 `http://place-api-service:4000` (기본값)
- **역할**: 카페 정보, 사용자, 상품, 쿠폰 등 도메인 데이터 관리
- **프로토콜**: HTTP/REST, GraphQL

### 향후 확장 계획

향후 다른 서비스와 연계하여 라우팅을 확장할 예정입니다:

- **Meta Viewer Service**: 실시간 소켓 통신 서비스
- **기타 서비스들**: 필요에 따라 추가 서비스 연계

## 환경 변수

다음 환경 변수를 설정해야 합니다:

### JWT 설정

- `JWT_PUBLIC_KEY`: JWT 검증에 사용되는 공개키 (Base64 인코딩된 PEM 형식)

### 서비스 URL 설정

- `PLACE_API_SERVICE_URL`: Place API Service URL (기본값: `http://place-api-service:4000`)

### 기타 설정

- `PORT`: API Gateway 포트 (기본값: `3000`)
- `NODE_ENV`: 실행 환경 (`development`, `production`)
- `ROUTE_POLICY_FILE_PATH`: 라우팅 정책 파일 경로 (기본값: `config/route-policy.json`)

## 의존성

### 주요 의존성

- `@nestjs/core`, `@nestjs/common`: NestJS 프레임워크
- `@nestjs/axios`: HTTP 클라이언트 (프록시용)
- `@nestjs/config`: 환경 변수 관리
- `jsonwebtoken`: JWT 토큰 검증
- `express`: HTTP 서버

### 개발 의존성

- `jest`, `ts-jest`: 테스트 프레임워크
- `ts-node`: TypeScript 실행

## 개발 가이드

### 새로운 서비스 추가하기

1. `scripts/export-route-policy.ts`의 `SERVICES` 배열에 서비스 추가
2. `gateway.service.ts`에 새로운 프록시 메서드 추가
3. `gateway.controller.ts`에서 경로에 따라 적절한 서비스로 라우팅
4. 정책 수집: `pnpm export:policy`

### 라우팅 정책 수집 프로세스

1. **정책 수집**: `pnpm export:policy` 실행
2. **정책 파일 생성**: `config/route-policy.json` 파일 생성
3. **자동 재로드**: 개발 환경에서 정책 파일 변경 시 자동 재로드
4. **프로덕션 배포**: 빌드 시 정책 파일이 `dist/apps/api-gateway/config/`로 복사됨

### JWT 공개키 설정

JWT 공개키는 Base64로 인코딩된 PEM 형식이어야 합니다:

```bash
# PEM 파일을 Base64로 인코딩
cat public.pem | base64

# 환경 변수로 설정
export JWT_PUBLIC_KEY="<base64-encoded-pem>"
```

### 테스트 실행

```bash
# 단위 테스트
pnpm test

# 테스트 커버리지
pnpm test:cov
```

## 보안 고려사항

1. **JWT 검증**: 모든 Protected 경로에 대해 JWT 토큰 검증
2. **헤더 정리**: 제어 문자 제거 및 URL 인코딩을 통한 헤더 값 정리
3. **기본 보안**: 정책이 없는 경로는 기본적으로 인증 필요
4. **토큰 만료 처리**: 만료된 토큰에 대한 적절한 에러 응답

## 라이선스

UNLICENSED
