# Route Policy 완전 가이드

이 문서는 Route Policy 시스템의 전체 사용 방법을 설명합니다. Route Policy는 컨트롤러의 `@Public()` 및 `@RequireRole()` 데코레이터를 수집하여 JSON 파일로 내보내고, API Gateway에서 이를 읽어 라우팅 정책으로 사용합니다.

## 목차

1. [개요](#개요)
2. [기본 사용법](#기본-사용법)
3. [API Gateway에서 사용](#api-gateway에서-사용)
4. [다중 서비스 관리](#다중-서비스-관리)
5. [파일 위치 및 배포](#파일-위치-및-배포)
6. [빌드 및 CI/CD](#빌드-및-cicd)
7. [트러블슈팅](#트러블슈팅)

---

## 개요

### Route Policy란?

Route Policy는 마이크로서비스 아키텍처에서 API Gateway가 각 라우트의 접근 권한을 결정하기 위해 사용하는 정책 시스템입니다.

- **Public 라우트**: 인증 없이 접근 가능한 라우트
- **Role 기반 라우트**: 특정 역할이 필요한 라우트

### 작동 방식

1. **정책 수집**: 컨트롤러의 데코레이터(`@Public()`, `@RequireRole()`)를 스캔
2. **JSON 생성**: 수집된 정책을 JSON 파일로 내보내기
3. **정책 적용**: API Gateway에서 JSON 파일을 읽어 라우팅 정책으로 사용

### 생성되는 JSON 구조

```json
{
  "GET /places/search": {
    "type": "public"
  },
  "PATCH /places/admin/update/:id": {
    "type": "role",
    "roles": ["ADMIN"]
  },
  "GET /products": {
    "type": "public"
  }
}
```

---

## 기본 사용법

### 1. 컨트롤러에서 데코레이터 사용

#### Public 라우트

```typescript
import { Public } from '@virtualcafe/common';

@Controller('places')
export class PlacesController {
  @Public()
  @Get('search')
  search() {
    // 인증 없이 접근 가능
  }
}
```

#### 역할 기반 라우트

```typescript
import { RequireRole } from '@virtualcafe/common';

@Controller('places')
export class PlacesController {
  @RequireRole('ADMIN')
  @Patch('admin/update/:id')
  update() {
    // ADMIN 역할만 접근 가능
  }

  @RequireRole('ADMIN', 'MANAGER')
  @Get('admin')
  getAdminData() {
    // ADMIN 또는 MANAGER 역할만 접근 가능
  }
}
```

### 2. 정책 파일 생성

#### 스크립트 실행

```bash
# 방법 1: npm 스크립트 사용 (권장)
npm run export:policy

# 방법 2: 직접 실행
ts-node scripts/export-route-policy.ts

# 방법 3: 출력 경로 지정
ts-node scripts/export-route-policy.ts dist/apps/api-gateway/route-policy.json
```

#### 코드에서 직접 사용

```typescript
import { exportPolicy } from '@virtualcafe/common';
import { AppModule } from './app.module';

// 정책 파일 생성
await exportPolicy(AppModule, 'dist/apps/api-gateway/route-policy.json');
```

### 3. 생성되는 파일 위치

기본 위치: `dist/apps/api-gateway/route-policy.json`

---

## API Gateway에서 사용

### RoutePolicyService 기본 사용

```typescript
import { RoutePolicyService } from './gateway/route-policy.service';

@Controller()
export class GatewayController {
  constructor(
    private readonly gatewayService: GatewayService,
    private readonly routePolicyService: RoutePolicyService,
  ) {}

  @All('*')
  async proxy(@Req() req: Request, @Res() res: Response) {
    const method = req.method;
    const path = req.path;
    const userRole = req.headers['x-user-role'] as string;

    // 1. Public 라우트 확인
    if (this.routePolicyService.isPublic(method, path)) {
      // Public 라우트는 인증 없이 접근 가능
      return this.forwardRequest(req, res);
    }

    // 2. 역할 기반 접근 제어
    const requiredRoles = this.routePolicyService.getRequiredRoles(method, path);
    if (requiredRoles) {
      if (!userRole || !requiredRoles.includes(userRole)) {
        throw new HttpException('Forbidden', HttpStatus.FORBIDDEN);
      }
    }

    // 3. 정책이 없는 라우트는 기본적으로 인증 필요
    const policy = this.routePolicyService.getPolicy(method, path);
    if (!policy) {
      if (!userRole) {
        throw new HttpException('Unauthorized', HttpStatus.UNAUTHORIZED);
      }
    }

    // 요청 전달
    return this.forwardRequest(req, res);
  }
}
```

### 간단한 사용 예제

```typescript
// Public 라우트인지 확인
if (this.routePolicyService.isPublic(method, path)) {
  // 인증 없이 접근 가능
}

// 필요한 역할 확인
const roles = this.routePolicyService.getRequiredRoles(method, path);
// roles: ['ADMIN', 'MANAGER'] 또는 null

// 사용자 접근 권한 확인
const hasAccess = this.routePolicyService.hasAccess(method, path, userRole);
// hasAccess: true 또는 false
```

### 환경 변수 설정

```env
# Route Policy 파일 경로 (선택사항)
# 기본값: dist/apps/api-gateway/route-policy.json
ROUTE_POLICY_FILE_PATH=dist/apps/api-gateway/route-policy.json
```

---

## 다중 서비스 관리

### 서비스 추가 방법

#### 1. `scripts/export-route-policy.ts` 파일 수정

`SERVICES` 배열에 새 서비스를 추가합니다:

```typescript
const SERVICES: ServiceConfig[] = [
  {
    name: 'place-api-service',
    modulePath: '../apps/place-api-service/src/app.module',
    displayName: 'Place API Service',
  },
  // 새 서비스 추가
  {
    name: 'user-api-service',
    modulePath: '../apps/user-api-service/src/app.module',
    displayName: 'User API Service',
  },
  {
    name: 'meta-viewer-service',
    modulePath: '../apps/meta-viewer-service/src/app.module',
    displayName: 'Meta Viewer Service',
  },
];
```

#### 2. 서비스 모듈 확인

새로 추가한 서비스의 `AppModule`이 올바른 경로에 있는지 확인:
- 경로: `apps/{service-name}/src/app.module.ts`
- export: `export class AppModule { ... }`

### 정책 생성 옵션

#### 1. 모든 서비스 통합 정책 생성 (기본)

```bash
npm run export:policy
# 또는
ts-node scripts/export-route-policy.ts
```

**결과**: `dist/apps/api-gateway/route-policy.json` 파일에 모든 서비스의 정책이 병합되어 저장됩니다.

**예시 출력**:
```json
{
  "GET /places/search": {
    "type": "public"
  },
  "GET /users/profile": {
    "type": "role",
    "roles": ["USER", "ADMIN"]
  },
  "POST /meta-viewer/create": {
    "type": "role",
    "roles": ["ADMIN"]
  }
}
```

#### 2. 서비스별 개별 파일 생성

```bash
npm run export:policy:separate
# 또는
ts-node scripts/export-route-policy.ts --separate
```

**결과**: 각 서비스별로 별도 파일이 생성됩니다:
- `dist/apps/api-gateway/route-policy-place-api-service.json`
- `dist/apps/api-gateway/route-policy-user-api-service.json`
- `dist/apps/api-gateway/route-policy-meta-viewer-service.json`

**장점**:
- 서비스별로 독립적으로 관리 가능
- 특정 서비스만 업데이트 가능
- 파일 크기가 작아 관리 용이

#### 3. 특정 서비스만 생성

```bash
ts-node scripts/export-route-policy.ts --service=place-api-service
```

**결과**: 지정한 서비스의 정책만 생성됩니다.

**사용 사례**:
- 특정 서비스만 테스트할 때
- 특정 서비스의 정책만 업데이트할 때

#### 4. 출력 경로 지정

```bash
ts-node scripts/export-route-policy.ts dist/custom-policy.json
ts-node scripts/export-route-policy.ts --separate dist/custom-dir/
```

### 서비스별 파일 사용 (고급)

여러 정책 파일을 로드하려면 `RoutePolicyService`를 수정:

```typescript
// route-policy.service.ts
private policyFiles: string[] = [
  'dist/apps/api-gateway/route-policy-place-api-service.json',
  'dist/apps/api-gateway/route-policy-user-api-service.json',
  'dist/apps/api-gateway/route-policy-meta-viewer-service.json',
];

private loadPolicies(): void {
  this.policyMap.clear();
  
  for (const filePath of this.policyFiles) {
    if (!existsSync(filePath)) {
      this.logger.warn(`Policy file not found: ${filePath}`);
      continue;
    }
    
    const content = readFileSync(filePath, 'utf-8');
    const policies = JSON.parse(content);
    
    Object.entries(policies).forEach(([key, value]) => {
      if (this.policyMap.has(key)) {
        this.logger.warn(`Route conflict: ${key} exists in multiple files`);
      }
      this.policyMap.set(key, value);
    });
  }
}
```

### 경로 충돌 처리

여러 서비스에서 동일한 경로를 사용하는 경우:

1. **경고 메시지**: 스크립트가 경로 충돌을 감지하고 경고를 출력합니다.
2. **첫 번째 우선**: 통합 시 첫 번째로 발견된 정책이 사용됩니다.
3. **해결 방법**:
   - 서비스별 prefix 사용 (예: `/api/v1/places`, `/api/v1/users`)
   - 서비스별 개별 파일 사용
   - 명시적으로 경로를 구분

---

## 파일 위치 및 배포

### 권장 위치: `dist/apps/api-gateway/route-policy.json`

#### 장점

1. **독립 배포**: API Gateway가 정책 파일을 포함하여 독립적으로 배포 가능
2. **빌드 자동 포함**: API Gateway 빌드 시 자동으로 포함됨
3. **경로 단순**: 상대 경로로 쉽게 접근 가능
4. **마이크로서비스 원칙**: 각 서비스가 독립적으로 관리됨

#### 파일 구조

```
project-root/
├── dist/
│   └── apps/
│       └── api-gateway/
│           ├── main.js
│           ├── route-policy.json  ← 여기!
│           └── ...
├── apps/
│   └── api-gateway/
│       └── src/
└── scripts/
    └── export-route-policy.ts
```

### 대안: 프로젝트 루트 `dist/route-policy.json`

프로젝트 루트에 생성하려면:

#### 스크립트 실행 시 경로 지정

```bash
ts-node scripts/export-route-policy.ts dist/route-policy.json
```

#### RoutePolicyService 수정

```typescript
this.policyFilePath =
  process.env.ROUTE_POLICY_FILE_PATH ||
  join(process.cwd(), 'dist', 'route-policy.json');
```

#### 장단점 비교

| 항목 | api-gateway 내부 | 프로젝트 루트 |
|------|-----------------|--------------|
| 독립 배포 | ✅ 쉬움 | ❌ 별도 복사 필요 |
| 빌드 포함 | ✅ 자동 | ❌ 수동 복사 |
| 경로 관리 | ✅ 단순 | ⚠️ 복잡 |
| 마이크로서비스 | ✅ 적합 | ⚠️ 부적합 |

### Docker 배포 시

#### api-gateway 내부 (권장)

```dockerfile
# Dockerfile
FROM node:20-slim
WORKDIR /app

# 빌드된 파일 복사 (route-policy.json 포함)
COPY dist/apps/api-gateway ./dist/apps/api-gateway

# 정책 파일이 자동으로 포함됨
CMD ["node", "dist/apps/api-gateway/main.js"]
```

#### 프로젝트 루트 사용 시

```dockerfile
# Dockerfile
FROM node:20-slim
WORKDIR /app

COPY dist/apps/api-gateway ./dist/apps/api-gateway
COPY dist/route-policy.json ./dist/route-policy.json  # 별도 복사 필요

CMD ["node", "dist/apps/api-gateway/main.js"]
```

### 개발 환경

#### 파일 감시 (개발 모드)

개발 환경에서는 정책 파일 변경을 자동으로 감지합니다:

```typescript
// route-policy.service.ts
private watchPolicyFile(): void {
  if (process.env.NODE_ENV === 'production') {
    return; // 프로덕션에서는 비활성화
  }
  // 파일 변경 감지 및 자동 리로드
}
```

#### 로컬 개발 시

```bash
# 1. 정책 파일 생성
npm run export:policy

# 2. API Gateway 실행 (파일 감시 활성화)
nx serve api-gateway

# 3. 정책 파일 수정 시 자동 리로드
```

---

## 빌드 및 CI/CD

### 자동 빌드 통합

정책 파일 생성은 **빌드 프로세스에 자동으로 통합**되어 있습니다:

1. **빌드 전**: `dependsOn`으로 정책 파일 생성 (`apps/api-gateway/route-policy.json`)
2. **빌드 시**: `assets` 설정으로 JSON 파일을 `dist/apps/api-gateway/`로 복사
3. **결과**: 배포 시 정책 파일이 자동으로 포함됨

### project.json 설정

```json
{
  "targets": {
    "export-policy": {
      "executor": "nx:run-commands",
      "options": {
        "command": "ts-node src/scripts/export-route-policy.ts",
        "cwd": "apps/api-gateway"
      }
    },
    "build": {
      "executor": "@nx/webpack:webpack",
      "dependsOn": [
        {
          "target": "export-policy",
          "projects": "self"
        }
      ],
      "options": {
        "assets": [
          {
            "glob": "route-policy.json",
            "input": "apps/api-gateway",
            "output": "."
          }
        ]
      }
    }
  }
}
```

### 수동 실행 (필요 시)

```bash
# 방법 1: Nx 명령어
nx run api-gateway:export-policy

# 방법 2: npm 스크립트
npm run export:policy

# 방법 3: 직접 실행
ts-node apps/api-gateway/src/scripts/export-route-policy.ts
```

### CI/CD 파이프라인

#### GitHub Actions 예시

```yaml
# .github/workflows/deploy.yml
steps:
  - name: Build API Gateway
    run: nx build api-gateway
    # → 정책 파일이 자동으로 생성되고 포함됨
    #   1. dependsOn으로 export-policy 실행
    #   2. apps/api-gateway/route-policy.json 생성
    #   3. assets로 dist/apps/api-gateway/route-policy.json 복사

  - name: Build Docker Image
    run: docker build -t api-gateway .
    # → 정책 파일이 이미지에 포함됨
```

#### 서비스별 파일 사용 시

```yaml
- name: Export Route Policies
  run: npm run export:policy:separate

- name: Build Applications
  run: npm run build

- name: Copy Policy Files
  run: |
    cp dist/apps/api-gateway/route-policy-*.json dist/apps/api-gateway/
```

### 빌드 순서

**중요**: 정책 파일 생성은 빌드 전에 실행해야 합니다.

```bash
# 올바른 순서
npm run export:policy  # 1. 정책 파일 생성
nx build api-gateway   # 2. 빌드 (정책 파일 포함)

# 잘못된 순서
nx build api-gateway   # 빌드 시 dist 폴더가 삭제될 수 있음
npm run export:policy  # 정책 파일이 삭제됨
```

---

## 트러블슈팅

### 정책 파일을 찾을 수 없음

```
Route policy file not found: dist/apps/api-gateway/route-policy.json
```

**해결 방법**:
1. `npm run export:policy` 실행 확인
2. 빌드 전에 정책 파일 생성 확인
3. 환경 변수 `ROUTE_POLICY_FILE_PATH` 확인
4. 파일 경로가 올바른지 확인

### 빌드 후 파일이 없음

**원인**: 빌드 시 파일이 삭제됨

**해결**: 빌드 후 정책 파일 생성 또는 빌드 스크립트에 포함:

```json
{
  "scripts": {
    "build:api-gateway": "npm run export:policy && nx build api-gateway"
  }
}
```

### 정책이 적용되지 않음

**확인 사항**:
1. 정책 파일이 최신인지 확인
2. 컨트롤러에 `@Public()` 또는 `@RequireRole()` 데코레이터가 있는지 확인
3. 경로가 정확한지 확인 (대소문자, 슬래시 등)
4. API Gateway가 정책 파일을 올바르게 로드했는지 확인

### 역할 체크가 작동하지 않음

**확인 사항**:
1. 사용자 역할이 헤더에 올바르게 전달되는지 확인 (`x-user-role`)
2. 역할 이름이 정확한지 확인 (대소문자 포함)
3. 정책 파일에 해당 라우트가 포함되어 있는지 확인

### 서비스를 찾을 수 없음

```
❌ Service not found: user-api-service
```

**해결**: `scripts/export-route-policy.ts`의 `SERVICES` 배열에 서비스가 올바르게 추가되었는지 확인

### 모듈을 로드할 수 없음

```
Failed to load module from ../apps/user-api-service/src/app.module
```

**해결**: 
1. 모듈 경로가 정확한지 확인
2. 서비스가 빌드되었는지 확인
3. `AppModule`이 올바르게 export되었는지 확인

### 경로 충돌

```
⚠️  Route conflict: GET /api/users exists in multiple services
```

**해결**: 
- 서비스별 prefix 사용 (예: `/api/v1/places`, `/api/v1/users`)
- 서비스별 개별 파일 사용
- 경로를 명시적으로 구분

### 주의사항

1. **정책이 없는 라우트**: 정책이 없는 라우트는 기본적으로 인증이 필요합니다 (보안을 위해).

2. **경로 정규화**: 경로는 자동으로 정규화됩니다 (`/places//search` → `/places/search`).

3. **대소문자 구분**: HTTP 메서드는 대소문자를 구분하지 않지만, 역할은 대소문자를 구분합니다.

4. **파일 경로**: 정책 파일은 빌드 후 `dist/apps/api-gateway` 디렉토리에 생성되므로, API Gateway가 이 파일에 접근할 수 있어야 합니다.

5. **모듈 경로**: 서비스 모듈 경로가 정확해야 합니다.

6. **빌드 순서**: 정책 파일 생성은 빌드 전에 실행해야 합니다.

7. **경로 충돌**: 여러 서비스에서 동일한 경로를 사용하지 않도록 주의합니다.

---

## 요약

### 빠른 시작

1. **컨트롤러에 데코레이터 추가**
   ```typescript
   @Public()
   @Get('search')
   ```

2. **정책 파일 생성**
   ```bash
   npm run export:policy
   ```

3. **API Gateway에서 사용**
   ```typescript
   if (this.routePolicyService.isPublic(method, path)) {
     // Public 라우트 처리
   }
   ```

### 주요 명령어

```bash
# 통합 정책 생성
npm run export:policy

# 서비스별 개별 파일 생성
npm run export:policy:separate

# 특정 서비스만
ts-node scripts/export-route-policy.ts --service=place-api-service
```

### 파일 위치

- **기본**: `dist/apps/api-gateway/route-policy.json`
- **환경 변수**: `ROUTE_POLICY_FILE_PATH`로 변경 가능

