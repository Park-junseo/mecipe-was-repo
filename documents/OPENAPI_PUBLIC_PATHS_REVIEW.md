# OpenAPI Extension을 통한 Public 경로 자동 추출 검토

## 제안된 방식

### 패턴 B: OpenAPI Extension

```typescript
export const Public = () =>
  applyDecorators(
    SetMetadata(PUBLIC_API, true),
    ApiExtension('x-public', true),
  );
```

### Gateway에서 사용

```typescript
// Swagger JSON에서 추출
{
  "public": [
    "GET /health",
    "GET /feeds",
    "POST /auth/login"
  ]
}

// Gateway 미들웨어
if (publicMap.has(`${method} ${path}`)) {
  return next();
}
```

## 현재 상황 분석

### ✅ 가능한 부분

1. **NestJS Swagger 지원**
   - `@nestjs/swagger` 패키지 사용 가능
   - `@ApiExtension` 데코레이터 사용 가능
   - Swagger JSON 자동 생성 가능

2. **OpenAPI Extension 표준**
   - OpenAPI 3.0+ 에서 `x-*` extension 지원
   - `x-public: true` 형태로 메타데이터 추가 가능

3. **Swagger JSON 접근**
   - NestJS에서 `/api-json` 또는 `/api-docs-json` 엔드포인트 제공
   - 정적 파일로 빌드 타임에 생성 가능

### ⚠️ 고려사항

1. **Swagger 설정 필요**
   - 현재 프로젝트에 Swagger 설정 없음
   - `@nestjs/swagger` 패키지 설치 필요
   - `main.ts`에 SwaggerModule 설정 필요

2. **빌드 타임 vs 런타임**
   - **빌드 타임**: Swagger JSON을 빌드 시 생성 → 정적 파일로 제공
   - **런타임**: 서비스 실행 시 Swagger JSON 생성 → 동적 접근

3. **Gateway와의 통신**
   - Gateway가 각 서비스의 Swagger JSON을 읽어야 함
   - 서비스 URL 필요: `http://place-api-service:3000/api-json`

## 구현 가능성 검토

### 시나리오 1: 런타임 Swagger JSON 접근

**구조:**
```
Gateway 시작 시
  ↓
각 서비스의 /api-json 엔드포인트 호출
  ↓
Swagger JSON 파싱
  ↓
x-public extension 추출
  ↓
Public 경로 맵 생성
```

**장점:**
- ✅ 서비스 재시작 시 자동 반영
- ✅ 동적 업데이트 가능

**단점:**
- ❌ Gateway 시작 시 서비스가 준비되어 있어야 함
- ❌ 서비스 재시작 시 Gateway도 재시작 필요
- ❌ 네트워크 의존성 (서비스 간 통신)
- ❌ 에러 처리 복잡 (서비스 다운 시)

### 시나리오 2: 빌드 타임 Swagger JSON 생성

**구조:**
```
빌드 시
  ↓
Swagger JSON 생성 (swagger-json.json)
  ↓
정적 파일로 저장
  ↓
Gateway 빌드 시 읽기
```

**장점:**
- ✅ 네트워크 의존성 없음
- ✅ 빠른 접근
- ✅ 안정적

**단점:**
- ❌ 서비스 코드 변경 시 Gateway 재빌드 필요
- ❌ 빌드 프로세스 복잡도 증가

### 시나리오 3: 하이브리드 (권장)

**구조:**
```
개발 환경: 런타임 접근
프로덕션: 빌드 타임 생성 + 정적 파일
```

## 구현 예시

### 1. Swagger 설정 추가

```typescript
// apps/place-api-service/src/main.ts
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // Swagger 설정
  const config = new DocumentBuilder()
    .setTitle('Place API Service')
    .setVersion('1.0')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);
  
  // Swagger JSON 엔드포인트
  app.getHttpAdapter().get('/api-json', (req, res) => {
    res.json(document);
  });
  
  await app.listen(3000);
}
```

### 2. Public 데코레이터 수정

```typescript
// apps/place-api-service/src/util/decorators.ts
import { applyDecorators, SetMetadata } from '@nestjs/common';
import { ApiExtension } from '@nestjs/swagger';

export const IS_PUBLIC_KEY = 'isPublic';
export const Public = () =>
  applyDecorators(
    SetMetadata(IS_PUBLIC_KEY, true),
    ApiExtension('x-public', true), // Swagger JSON에 추가
  );
```

### 3. Gateway에서 Swagger JSON 파싱

```typescript
// apps/api-gateway/src/config/swagger-public-paths.service.ts
import axios from 'axios';

interface SwaggerPath {
  [method: string]: {
    'x-public'?: boolean;
  };
}

interface SwaggerDocument {
  paths: {
    [path: string]: SwaggerPath;
  };
}

export class SwaggerPublicPathsService {
  private publicPaths = new Set<string>();

  async loadFromService(serviceUrl: string, serviceName: string) {
    try {
      const response = await axios.get<SwaggerDocument>(
        `${serviceUrl}/api-json`
      );
      
      const swaggerDoc = response.data;
      
      for (const [path, methods] of Object.entries(swaggerDoc.paths)) {
        for (const [method, operation] of Object.entries(methods)) {
          if (operation['x-public'] === true) {
            const normalizedPath = path.replace(/{(\w+)}/g, ':$1');
            this.publicPaths.add(`${method.toUpperCase()} ${normalizedPath}`);
          }
        }
      }
      
      console.log(`Loaded ${this.publicPaths.size} public paths from ${serviceName}`);
    } catch (error) {
      console.error(`Failed to load Swagger from ${serviceName}:`, error);
    }
  }

  isPublic(method: string, path: string): boolean {
    return this.publicPaths.has(`${method} ${path}`);
  }
}
```

### 4. Gateway 미들웨어 수정

```typescript
// apps/api-gateway/src/middleware/jwt-validation.middleware.ts
import { SwaggerPublicPathsService } from '../config/swagger-public-paths.service';

@Injectable()
export class JwtValidationMiddleware implements NestMiddleware {
  constructor(
    private readonly swaggerService: SwaggerPublicPathsService,
  ) {}

  use(req: Request, res: Response, next: NextFunction) {
    const method = req.method;
    const path = req.path;

    // Swagger JSON에서 Public 경로 확인
    if (this.swaggerService.isPublic(method, path)) {
      return next();
    }

    // 기존 JWT 검증 로직...
  }
}
```

## 장단점 비교

### 현재 방식 (설정 파일)

**장점:**
- ✅ 간단하고 명확
- ✅ 타입 안정성
- ✅ 빌드 타임 검증 가능
- ✅ 네트워크 의존성 없음

**단점:**
- ❌ 수동 관리 필요
- ❌ `@Public()` 데코레이터와 중복 관리

### OpenAPI Extension 방식

**장점:**
- ✅ 단일 소스 (코드 = 문서)
- ✅ Swagger UI에서도 확인 가능
- ✅ API 문서화 자동화
- ✅ Gateway가 NestJS를 몰라도 됨

**단점:**
- ❌ Swagger 설정 필요
- ❌ 런타임 접근 시 네트워크 의존성
- ❌ 빌드 타임 접근 시 빌드 프로세스 복잡
- ❌ 경로 정규화 필요 (`/users/:id` vs `/users/{id}`)
- ❌ HTTP Method 매칭 필요

## 결론 및 권장사항

### ✅ 구현 가능

기술적으로는 완전히 구현 가능합니다.

### ⚠️ 권장사항

**현재 방식 유지 + 개선**을 권장합니다:

1. **현재 방식의 장점 유지**
   - 간단하고 명확
   - 타입 안정성
   - 빠른 접근

2. **자동화 개선**
   ```typescript
   // 빌드 스크립트로 자동 추출
   // scripts/extract-public-paths.ts
   // @Public() 데코레이터를 찾아서 자동으로 설정 파일 생성
   ```

3. **Swagger는 별도 목적으로 사용**
   - API 문서화용으로만 사용
   - Public 경로는 설정 파일로 관리

### 대안: 하이브리드 접근

만약 Swagger를 이미 사용 중이거나 도입 예정이라면:

1. **개발 환경**: Swagger JSON 동적 로드
2. **프로덕션**: 빌드 타임에 Swagger JSON 생성 → 정적 파일
3. **Fallback**: 설정 파일 유지 (Swagger 실패 시)

## 구현 시 주의사항

1. **경로 정규화**
   - Swagger: `/users/{id}`
   - Express: `/users/:id`
   - 변환 로직 필요

2. **HTTP Method 매칭**
   - Swagger: `get`, `post`, `patch`, `delete`
   - Express: `GET`, `POST`, `PATCH`, `DELETE`
   - 대소문자 변환 필요

3. **경로 파라미터**
   - `/users/:id` vs `/users/123`
   - 정규식 매칭 필요

4. **에러 처리**
   - Swagger JSON 로드 실패 시
   - Fallback 메커니즘 필요



