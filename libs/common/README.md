# Common Library

Common Library는 모노레포 내 모든 서비스에서 공통으로 사용되는 유틸리티, 미들웨어, 가드, 데코레이터 등을 제공하는 공유 라이브러리입니다. 코드 중복을 방지하고 일관된 인증/인가, 로깅, 에러 처리 등을 제공합니다.

## 개요

이 라이브러리는 다음과 같은 주요 기능을 제공합니다:

1. **인증 및 인가**: Gateway 방식 인증을 위한 Guard 및 미들웨어
2. **라우팅 정책 수집**: 데코레이터 기반 라우팅 정책 자동 수집 시스템
3. **Kafka 통합**: 서비스 간 비동기 통신을 위한 Kafka 모듈
4. **로깅**: HTTP 요청/응답 로깅 미들웨어 및 인터셉터
5. **에러 처리**: 공통 에러 클래스 및 예외 처리
6. **서비스 클라이언트**: 서비스 간 동기 통신을 위한 HTTP 클라이언트
7. **공통 타입 및 상수**: 서비스 간 공유되는 타입 및 상수 정의

## 모듈 구조

### 1. Auth Module (`auth/`)

인증 및 인가 관련 모듈입니다.

#### CommonAuthModule (`auth.module.ts`)

공통 인증 모듈로, Gateway 방식 인증을 지원합니다.

**주요 기능:**
- Gateway에서 JWT 검증 후, 내부 서비스는 인가만 수행
- `ServiceTokenGuard`: 서비스 간 통신용 토큰 검증
- `AuthorizationGuard`: 역할 기반 인가
- `UserHeaderMiddleware`: Gateway에서 전달한 사용자 정보 추출

#### AuthorizationGuard (`authorization.guard.ts`)

**역할 기반 인가 Guard**

Gateway에서 이미 인증이 완료된 경우 사용하는 Guard입니다.

**주요 기능:**
- `@Public()` 데코레이터: 인증 없이 접근 가능한 경로
- `@RequireRole()` 데코레이터: 특정 역할이 필요한 경로
- 역할 체크 (대소문자 구분 없음)

**사용 예시:**

```typescript
@Controller('places')
export class PlacesController {
  @Get()
  @Public()  // 인증 없이 접근 가능
  findAll() {
    // ...
  }

  @Post()
  @RequireRole('ADMIN', 'MANAGER')  // ADMIN 또는 MANAGER 역할 필요
  create() {
    // ...
  }
}
```

#### Export Policy (`export-policy.ts`)

**데코레이터 기반 라우팅 정책 수집 함수**

이 함수는 NestJS 애플리케이션의 모든 컨트롤러에서 `@Public()` 및 `@RequireRole()` 데코레이터를 수집하여 JSON 파일로 내보냅니다.

**작동 방식:**

1. **애플리케이션 컨텍스트 생성**: NestFactory를 통해 애플리케이션 컨텍스트 생성
2. **컨트롤러 스캔**: DiscoveryService를 통해 모든 컨트롤러 탐색
3. **메타데이터 수집**: Reflector를 통해 각 라우트의 데코레이터 메타데이터 수집
4. **경로 및 메서드 추출**: HTTP 메서드와 경로 정보 추출
5. **정책 파일 생성**: JSON 파일로 정책 저장

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

**사용 예시:**

```typescript
import { AppModule } from './app.module';
import { exportPolicy } from '@virtualcafe/common';

// 정책 수집 및 파일 생성
await exportPolicy(AppModule, 'config/route-policy.json');
```

**특징:**
- 데이터베이스 연결 없이 정책 수집 가능 (`SKIP_PRISMA_CONNECT` 환경 변수 사용)
- 동적 라우팅 파라미터 지원 (`:id`, `:userId` 등)
- 컨트롤러 경로와 라우트 경로 자동 결합

#### UserHeaderMiddleware (`user-header.middleware.ts`)

**Gateway에서 전달한 사용자 정보 추출 미들웨어**

API Gateway에서 JWT 검증 후 설정한 헤더에서 사용자 정보를 추출하여 `req.user`에 저장합니다.

**작동 방식:**
1. Gateway가 설정한 헤더에서 사용자 정보 추출:
   - `x-user-id`: 사용자 ID
   - `x-user-role`: 사용자 역할
   - `x-user-email`: 사용자 이메일
2. `req.user` 객체에 저장하여 다른 미들웨어/가드에서 사용 가능

**사용 예시:**

```typescript
@Module({
  imports: [CommonAuthModule],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(UserHeaderMiddleware).forRoutes('*');
  }
}
```

#### ServiceTokenGuard (`service-token.guard.ts`)

**서비스 간 통신용 토큰 Guard**

서비스 간 통신 시 `x-service-token` 헤더를 검증하는 Guard입니다.

**작동 방식:**
- `x-service-token` 헤더 확인
- 환경 변수 `SERVICE_TOKEN`과 비교
- 일치하지 않으면 `UnauthorizedException` 발생

### 2. Decorators (`decorators/`)

공통 데코레이터를 제공합니다.

#### Public Decorator (`public.decorator.ts`)

**Public 경로 데코레이터**

인증 없이 접근 가능한 경로를 표시하는 데코레이터입니다.

**사용 예시:**

```typescript
@Controller('auth')
export class AuthController {
  @Post('login')
  @Public()  // 인증 없이 접근 가능
  login() {
    // ...
  }
}
```

**참고:** 현재는 `@Public()` 데코레이터가 `authorization.guard.ts`에 정의되어 있으며, `LegacyPublic` 데코레이터도 제공됩니다.

### 3. Kafka Module (`kafka/`)

Kafka를 통한 서비스 간 비동기 통신을 지원합니다.

#### KafkaModule (`kafka.module.ts`)

**Kafka 모듈**

NestJS Microservices를 사용하여 Kafka 클라이언트를 설정합니다.

**주요 기능:**
- 동적 모듈 패턴으로 Kafka 설정
- 브로커, 클라이언트 ID, 그룹 ID 설정
- `KAFKA_SERVICE` 토큰으로 주입 가능

**사용 예시:**

```typescript
@Module({
  imports: [
    KafkaModule.forRoot({
      brokers: ['localhost:9092'],
      clientId: 'my-service',
      groupId: 'my-service-group',
    }),
  ],
})
export class AppModule {}
```

#### Kafka Events (`events.ts`)

**Kafka 이벤트 타입 정의**

서비스 간 통신에 사용되는 Kafka 이벤트의 타입을 정의합니다.

**주요 이벤트:**
- `CafeInfoCreatedEvent`: 카페 정보 생성 이벤트
- `CafeInfoUpdatedEvent`: 카페 정보 업데이트 이벤트
- `CafeInfoDeletedEvent`: 카페 정보 삭제 이벤트
- `MetaViewerInfoCreatedEvent`: 메타 뷰어 정보 생성 이벤트
- `MetaViewerInfoUpdatedEvent`: 메타 뷰어 정보 업데이트 이벤트
- `MetaViewerInfoDeletedEvent`: 메타 뷰어 정보 삭제 이벤트

### 4. Middleware (`middleware/`)

공통 미들웨어를 제공합니다.

#### HttpLoggerMiddleware (`http-logger.middleware.ts`)

**HTTP 요청 로깅 미들웨어**

모든 HTTP 요청을 로깅합니다.

**로깅 정보:**
- HTTP 메서드
- 요청 URL
- 응답 상태 코드
- 응답 크기
- User-Agent
- 클라이언트 IP

**사용 예시:**

```typescript
@Module({
  // ...
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(HttpLoggerMiddleware).forRoutes('*');
  }
}
```

### 5. Interceptor (`interceptor/`)

공통 인터셉터를 제공합니다.

#### HttpBodyLoggerInterceptor (`http-body-logger.interceptor.ts`)

**HTTP 요청/응답 본문 로깅 인터셉터**

요청 본문과 응답 본문을 로깅합니다.

**주요 기능:**
- 요청 본문 로깅
- 응답 본문 로깅
- 큰 본문은 자동으로 잘라서 로깅 (최대 1000자)
- GraphQL 요청 등 HTTP 컨텍스트가 없는 경우 안전하게 처리

**사용 예시:**

```typescript
@Module({
  providers: [
    {
      provide: APP_INTERCEPTOR,
      useClass: HttpBodyLoggerInterceptor,
    },
  ],
})
export class AppModule {}
```

### 6. Clients (`clients/`)

서비스 간 동기 통신을 위한 HTTP 클라이언트를 제공합니다.

#### PlaceApiClient (`place-api.client.ts`)

**Place API Service 클라이언트**

Place API Service와 동기 통신을 위한 HTTP 클라이언트입니다.

**주요 기능:**
- `getCafeInfo()`: ID로 카페 정보 조회
- `getCafeInfoByCode()`: 코드로 카페 정보 조회
- 서비스 장애 시 `ServiceUnavailableError` 발생

**사용 예시:**

```typescript
@Injectable()
export class MyService {
  constructor(private readonly placeApiClient: PlaceApiClient) {}

  async getCafeInfo(id: number) {
    return await this.placeApiClient.getCafeInfo(id);
  }
}
```

**참고:** 비동기 통신이 필요한 경우 Kafka 이벤트를 사용하는 것이 권장됩니다.

### 7. Errors (`errors/`)

공통 에러 클래스를 제공합니다.

#### ServiceError (`service-error.ts`)

**서비스 에러 클래스**

서비스 간 통신에서 발생하는 에러를 처리하기 위한 클래스입니다.

**주요 클래스:**
- `ServiceError`: 기본 서비스 에러 클래스
- `ServiceUnavailableError`: 서비스가 사용 불가능한 경우 (503 상태 코드)

**사용 예시:**

```typescript
try {
  await this.placeApiClient.getCafeInfo(id);
} catch (error) {
  if (error instanceof ServiceUnavailableError) {
    // 서비스 장애 처리
  }
}
```

### 8. Constants (`constants/`)

공통 상수를 제공합니다.

#### Kafka Topics (`constants/index.ts`)

**Kafka 토픽 상수**

서비스 간 통신에 사용되는 Kafka 토픽 이름을 정의합니다.

**주요 토픽:**
- `CAFE_INFO_CREATED`: 카페 정보 생성 토픽
- `CAFE_INFO_UPDATED`: 카페 정보 업데이트 토픽
- `CAFE_INFO_DELETED`: 카페 정보 삭제 토픽
- `META_VIEWER_INFO_CREATED`: 메타 뷰어 정보 생성 토픽
- `META_VIEWER_INFO_UPDATED`: 메타 뷰어 정보 업데이트 토픽
- `META_VIEWER_INFO_DELETED`: 메타 뷰어 정보 삭제 토픽

#### Service Names (`constants/index.ts`)

**서비스 이름 상수**

모노레포 내 서비스 이름을 정의합니다.

**주요 서비스:**
- `META_VIEWER_SERVICE`: Meta Viewer Service
- `PLACE_API_SERVICE`: Place API Service
- `PLACE_INDEXER_SERVICE`: Place Indexer Service

### 9. Types (`types/`)

공통 타입을 제공합니다.

#### ServiceConfig (`types/index.ts`)

**서비스 설정 타입**

서비스의 기본 설정 정보를 정의합니다.

```typescript
interface ServiceConfig {
  name: string;
  port: number;
  version: string;
}
```

#### HealthCheckResult (`types/index.ts`)

**헬스체크 결과 타입**

서비스의 헬스체크 결과를 정의합니다.

```typescript
interface HealthCheckResult {
  status: 'healthy' | 'unhealthy';
  timestamp: Date;
  checks: {
    database?: boolean;
    redis?: boolean;
    kafka?: boolean;
  };
}
```

### 10. DTO (`dto/`)

서비스 간 통신에 사용되는 DTO를 제공합니다.

#### CafeInfoDto (`dto/cafe-info.dto.ts`)

**카페 정보 DTO**

서비스 간 통신에서 카페 정보를 전달할 때 사용하는 DTO입니다.

**주요 필드:**
- `id`: 카페 ID
- `name`: 카페 이름
- `code`: 카페 코드 (선택)
- `isDisable`: 비활성화 여부
- `createdAt`: 생성 일시

### 11. Utils (`utils/`)

공통 유틸리티를 제공합니다.

#### CommonLogger (`utils/logger.ts`)

**공통 로거 유틸리티**

간단한 로깅 유틸리티입니다.

**주요 메서드:**
- `log()`: 일반 로그
- `error()`: 에러 로그
- `warn()`: 경고 로그

## 사용 방법

### 1. 인증 모듈 사용

```typescript
import { CommonAuthModule } from '@virtualcafe/common';

@Module({
  imports: [CommonAuthModule],
  providers: [
    {
      provide: APP_GUARD,
      useClass: AuthorizationGuard,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(UserHeaderMiddleware).forRoutes('*');
  }
}
```

### 2. 데코레이터 사용

```typescript
import { Public, RequireRole } from '@virtualcafe/common';

@Controller('places')
export class PlacesController {
  @Get()
  @Public()
  findAll() {
    // 인증 없이 접근 가능
  }

  @Post()
  @RequireRole('ADMIN')
  create() {
    // ADMIN 역할 필요
  }
}
```

### 3. Kafka 모듈 사용

```typescript
import { KafkaModule, KAFKA_TOPICS } from '@virtualcafe/common';

@Module({
  imports: [
    KafkaModule.forRoot({
      brokers: ['localhost:9092'],
      clientId: 'my-service',
      groupId: 'my-service-group',
    }),
  ],
})
export class AppModule {}

// 이벤트 발행
@Injectable()
export class MyService {
  constructor(
    @Inject('KAFKA_SERVICE') private readonly kafkaClient: ClientKafka,
  ) {}

  async publishEvent() {
    await this.kafkaClient.emit(KAFKA_TOPICS.CAFE_INFO_CREATED, {
      id: 1,
      name: 'Cafe Name',
    });
  }
}
```

### 4. 라우팅 정책 수집

```typescript
import { exportPolicy } from '@virtualcafe/common';
import { AppModule } from './app.module';

// 정책 수집 및 파일 생성
await exportPolicy(AppModule, 'config/route-policy.json');
```

## 라우팅 정책 수집 시스템 상세 설명

### 작동 원리

1. **애플리케이션 컨텍스트 생성**
   - NestFactory를 통해 애플리케이션 컨텍스트 생성
   - 데이터베이스 연결 없이 메타데이터만 수집

2. **컨트롤러 탐색**
   - DiscoveryService를 통해 모든 컨트롤러 탐색
   - MetadataScanner를 통해 각 컨트롤러의 메서드 스캔

3. **메타데이터 수집**
   - Reflector를 통해 `@Public()`, `@RequireRole()` 데코레이터 메타데이터 수집
   - HTTP 메서드 및 경로 정보 추출
   - 컨트롤러 경로와 라우트 경로 결합

4. **정책 파일 생성**
   - 수집된 정책을 JSON 형식으로 저장
   - 키 형식: `"METHOD /path"` (예: `"GET /api/places"`)
   - 값 형식: `{ type: 'public' }` 또는 `{ type: 'role', roles: ['ADMIN'] }`

### 정책 파일 예시

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
  },
  "PUT /api/places/:id": {
    "type": "role",
    "roles": ["ADMIN"]
  }
}
```

### 동적 라우팅 지원

동적 라우팅 파라미터(`:id`, `:userId` 등)를 포함한 경로도 정책 수집이 가능합니다. API Gateway의 RoutePolicyService에서 정규식으로 매칭하여 처리합니다.

## 의존성

### 주요 의존성

- `@nestjs/common`, `@nestjs/core`: NestJS 프레임워크
- `@nestjs/microservices`: Kafka 마이크로서비스 지원
- `@nestjs/axios`: HTTP 클라이언트
- `reflect-metadata`: 메타데이터 리플렉션

## 개발 가이드

### 새로운 데코레이터 추가하기

1. `decorators/` 디렉토리에 새 데코레이터 파일 생성
2. `SetMetadata`를 사용하여 메타데이터 설정
3. `index.ts`에서 export

### 새로운 Kafka 이벤트 추가하기

1. `kafka/events.ts`에 이벤트 인터페이스 추가
2. `constants/index.ts`에 토픽 이름 추가
3. 이벤트를 사용하는 서비스에서 타입 import

### 새로운 서비스 클라이언트 추가하기

1. `clients/` 디렉토리에 새 클라이언트 파일 생성
2. `HttpService`를 사용하여 HTTP 요청 구현
3. 에러 처리 시 `ServiceUnavailableError` 사용
4. `index.ts`에서 export

## 라이선스

UNLICENSED
