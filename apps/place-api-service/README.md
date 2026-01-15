# Place API Service

Place API Service는 카페 정보, 사용자, 상품, 쿠폰 등 다양한 도메인 데이터를 관리하는 GraphQL 및 REST API 서비스입니다. Prisma ORM을 사용하여 PostgreSQL 데이터베이스와 통합하며, GraphQL 쿼리를 Prisma Select로 자동 변환하는 기능을 제공합니다.

## 개요

이 서비스는 다음과 같은 주요 기능을 제공합니다:

1. **GraphQL API**: Apollo Server를 사용한 GraphQL 엔드포인트
2. **REST API**: NestJS를 기반으로 한 RESTful 엔드포인트
3. **Prisma 통합**: Prisma ORM을 통한 타입 안전한 데이터베이스 접근
4. **인증 및 권한**: JWT 기반 인증 및 API Key 인증
5. **이미지 업로드**: 카페 썸네일, 가상 이미지, 실제 이미지 등 다양한 이미지 관리

## 아키텍처

### 서비스 구조

```
Client (GraphQL/REST)
    ↓
Place API Service
    ├── GraphQL API (Apollo Server)
    ├── REST API (NestJS)
    └── 인증/권한 (JWT, API Key)
    ↓
Prisma ORM
    ↓
PostgreSQL Database
```

### 데이터 흐름

1. **클라이언트 요청**: GraphQL 또는 REST API를 통해 요청
2. **인증/권한 검증**: JWT 또는 API Key를 통한 인증
3. **GraphQL 쿼리 최적화**: GraphQL 쿼리를 Prisma Select로 변환
4. **데이터베이스 조회**: Prisma ORM을 통한 타입 안전한 쿼리 실행
5. **응답 반환**: 클라이언트에 결과 반환

## 주요 기능

1. **GraphQL 쿼리 최적화**: GraphQL 쿼리를 Prisma Select로 자동 변환하여 필요한 필드만 조회
2. **타입 안전성**: Prisma와 TypeScript를 통한 완전한 타입 안전성
3. **자동 타입 생성**: Prisma 스키마 변경 시 타입 매핑 자동 생성
4. **인증 및 권한 관리**: JWT 및 API Key 기반 인증 시스템
5. **이미지 관리**: 다양한 이미지 타입(썸네일, 가상, 실제) 관리 및 업로드

## 실행 방법

### 기본 실행 (개발 모드)

```bash
pnpm start:dev
```

개발 모드로 서비스를 실행합니다. 파일 변경 시 자동으로 재시작됩니다.

### 테스트 데이터베이스 실행

```bash
pnpm start:test
```

테스트 환경을 위한 데이터베이스 컨테이너를 실행하고 애플리케이션을 시작합니다.

### PM2를 사용한 프로덕션 실행

```bash
pnpm daemon
```

PM2를 사용하여 프로덕션 모드로 서비스를 실행합니다. 빌드 후 PM2로 프로세스를 시작합니다 (인스턴스 수: 2).

#### PM2 관련 명령어

- **재시작**: `pnpm daemon:re` - 서비스를 중지하고 다시 시작합니다.
- **중지**: `pnpm daemon:stop` - PM2로 실행 중인 서비스를 중지합니다.
- **로그 확인**: `pnpm daemon:log` - 최근 1000줄의 로그를 확인합니다.

### Prisma 관련 명령어

- **Prisma 클라이언트 생성**: `pnpm prisma` - Prisma 클라이언트를 생성합니다.
- **마이그레이션**: `pnpm prisma:migrate` - 데이터베이스 마이그레이션을 실행합니다.
- **타입 생성**: `pnpm prisma:generate-types` - Prisma 스키마에서 타입 매핑을 자동 생성합니다.
- **시드 데이터**: `pnpm db:seed` - 데이터베이스에 시드 데이터를 삽입합니다.

## 모듈 구조

### 1. App Module (`app.module.ts`)

애플리케이션의 루트 모듈입니다. 다음 모듈들을 통합합니다:
- `ConfigModule`: 환경 변수 및 설정 관리
- `GraphQLModule`: Apollo Server 설정
- `GlobalModule`: 전역 Prisma 서비스
- `CommonAuthModule`: 공통 인증 모듈
- 각 도메인 모듈들 (Places, Users, Products 등)

**주요 기능:**
- GraphQL 및 REST 엔드포인트 제공
- 전역 가드 및 인터셉터 설정
- 정적 파일 서빙 (미디어 파일)

### 2. Global Module (`global/`)

전역으로 사용되는 서비스를 제공합니다.

#### PrismaService (`global/prisma.service.ts`)
- Prisma Client를 확장한 서비스
- 데이터베이스 연결 관리 (`onModuleInit`, `onModuleDestroy`)
- 쿼리 로깅 및 에러 핸들링
- 타임존 변환 기능

### 3. Prisma 통합 (`util/prisma/`)

Prisma와 GraphQL을 통합하여 사용하기 위한 유틸리티 모듈입니다.

#### Generate Prisma Types (`scripts/prisma/generate-prisma-types.ts`)

Prisma 스키마에서 모델을 추출하여 타입 매핑을 자동 생성하는 스크립트입니다.

**주요 기능:**
- Prisma 스키마 파일에서 모든 모델명 추출
- 각 모델에 대한 타입 매핑 생성:
  - `PrismaModelSelect`: Select 타입 매핑
  - `PrismaModelDelegate`: Delegate 타입 매핑
  - `PrismaModelGetPayload`: GetPayload 타입 매핑
  - `PrismaModelWhereInput`: WhereInput 타입 매핑
  - `PrismaModelOrderByWithRelationInput`: OrderBy 타입 매핑
  - `PrismaModelTypeName`: 모델 이름 타입 매핑
  - `PrismaModelType`: 모델 타입 매핑

**사용 목적:**
- GraphQL 쿼리 파싱 시 Prisma Select 타입을 동적으로 추론
- 타입 안전한 Prisma 쿼리 작성
- 모델 이름으로부터 해당 모델의 Prisma 타입을 자동으로 추출

**생성 파일 위치:**
- `src/util/prisma/generated/`: 자동 생성된 타입 매핑 파일들

#### GraphQL Query Parser (`util/graphql/graphql-query-parser.util.ts`)
- GraphQL ResolveInfo를 Prisma Select로 변환
- 중첩된 관계 필드 처리
- 타입 안전한 Select 쿼리 생성

### 4. Places Module (`places/`)

카페 정보를 관리하는 모듈입니다.

**주요 기능:**
- 카페 정보 CRUD 작업
- GraphQL 및 REST 엔드포인트 제공

### 5. Users Module (`users/`)

사용자 정보를 관리하는 모듈입니다.

**주요 기능:**
- 사용자 인증 및 관리
- 사용자 프로필 관리

### 6. Products Module (`products/`)

상품 정보를 관리하는 모듈입니다.

**주요 기능:**
- 상품 CRUD 작업
- 상품 카테고리 관리

### 7. Image Upload Modules

다양한 이미지 타입을 관리하는 모듈들입니다.

#### CafethumbnailimagesModule (`cafethumbnailimages/`)
- 카페 썸네일 이미지 관리

#### CafevirtualimagesModule (`cafevirtualimages/`)
- 카페 가상 이미지 관리

#### CaferealimagesModule (`caferealimages/`)
- 카페 실제 이미지 관리

#### RawimageuploadModule (`rawimageupload/`)
- 원본 이미지 업로드 처리

### 8. Coupons Module (`coupons/`)

쿠폰 정보를 관리하는 모듈입니다.

**주요 기능:**
- 쿠폰 생성 및 관리
- 쿠폰 사용 이력 추적
- QR 코드 생성

### 9. Boards Module (`boards/`)

게시판 기능을 제공하는 모듈입니다.

**주요 기능:**
- 게시글 CRUD 작업
- 댓글 관리
- 이미지 첨부

### 10. Regioncategories Module (`regioncategories/`)

지역 카테고리를 관리하는 모듈입니다.

**주요 기능:**
- 지역 카테고리 정보 조회 및 관리

### 11. Auth Module (`auth/`)

인증 및 권한 관리를 담당하는 모듈입니다.

#### AuthService (`auth.service.ts`)
- JWT 토큰 생성 및 검증
- 사용자 인증 로직

#### ApiKeyGuard (`api-key.guard.ts`)
- API Key 기반 인증 가드

### 12. Common Module (`common/`)

공통 유틸리티 및 GraphQL 관련 기능을 제공합니다.

#### GraphQL (`common/graphql/`)
- GraphQL 스칼라 타입 (JSON 등)
- GraphQL 스키마 정의

### 13. Util Module (`util/`)

다양한 유틸리티 함수들을 제공합니다.

- `graphql/`: GraphQL 쿼리 파싱 유틸리티
- `prisma/`: Prisma 타입 매핑 및 유틸리티
- `decorators/`: 커스텀 데코레이터
- `models/`: 모델 타입 정의
- `multer.ts`: 파일 업로드 설정
- `qrcode.ts`: QR 코드 생성 유틸리티

## Prisma 통합 상세 설명

### 타입 생성 프로세스

1. **Prisma 스키마 분석**: `prisma/basic/schema.prisma` 파일에서 모든 모델 추출
2. **타입 매핑 생성**: 각 모델에 대해 Prisma 타입 매핑 생성
3. **파일 생성**: `src/util/prisma/generated/` 디렉토리에 타입 파일 생성
4. **인덱스 파일 생성**: 모든 타입을 export하는 인덱스 파일 생성

### 사용 예시

```typescript
import { PrismaModelSelect, PrismaModelType } from './util/prisma/generated';

// 모델 이름으로부터 Select 타입 추출
type CafeInfoSelect = PrismaModelSelect<'CafeInfo'>;

// 모델 이름으로부터 모델 타입 추출
type CafeInfo = PrismaModelType<'CafeInfo'>;
```

### GraphQL과의 통합

GraphQL 쿼리에서 요청된 필드만 Prisma Select로 변환하여 데이터베이스 쿼리를 최적화합니다:

```typescript
// GraphQL 쿼리
query {
  cafeInfo(id: "1") {
    name
    address
    regionCategory {
      name
    }
  }
}

// 자동으로 변환되는 Prisma Select
{
  name: true,
  address: true,
  regionCategory: {
    select: {
      name: true
    }
  }
}
```

## 환경 변수

다음 환경 변수를 설정해야 합니다:

### 데이터베이스 설정

- `DATABASE_URL`: PostgreSQL 데이터베이스 연결 문자열

### 인증 설정

- `JWT_SECRET`: JWT 토큰 서명에 사용되는 시크릿 키
- `API_KEY`: API Key 인증에 사용되는 키

### 기타 설정

- `PORT`: HTTP 서버 포트 (기본값: `3000`)
- `NODE_ENV`: 실행 환경 (`development`, `production`)

## 의존성

### 주요 의존성

- `@nestjs/core`, `@nestjs/common`: NestJS 프레임워크
- `@nestjs/graphql`, `@nestjs/apollo`: GraphQL 지원
- `@prisma/client`: Prisma ORM 클라이언트
- `prisma`: Prisma CLI
- `graphql`: GraphQL 라이브러리
- `@nestjs/jwt`, `passport-jwt`: JWT 인증
- `multer`: 파일 업로드
- `qrcode`: QR 코드 생성

### 개발 의존성

- `@testcontainers/postgresql`: 테스트 컨테이너
- `jest`, `ts-jest`: 테스트 프레임워크
- `pm2`: 프로세스 관리
- `tsx`: TypeScript 실행

## 개발 가이드

### Prisma 스키마 변경 후 타입 재생성

Prisma 스키마를 변경한 후 다음 명령어를 실행하여 타입을 재생성합니다:

```bash
# 1. Prisma 클라이언트 생성
pnpm prisma

# 2. 타입 매핑 생성
pnpm prisma:generate-types
```

### 새로운 모듈 추가하기

1. `src/` 디렉토리에 새 모듈 디렉토리 생성
2. 모듈, 컨트롤러, 서비스 파일 생성
3. `app.module.ts`에 모듈 등록
4. Prisma 스키마에 모델 추가 (필요한 경우)
5. 타입 재생성 (`pnpm prisma:generate-types`)

### GraphQL Resolver 작성하기

```typescript
import { Resolver, Query, Args } from '@nestjs/graphql';
import { PrismaService } from '../global/prisma.service';
import { parseGraphQLInfo } from '../util/graphql';

@Resolver()
export class CafeInfoResolver {
  constructor(private prisma: PrismaService) {}

  @Query(() => CafeInfo)
  async cafeInfo(
    @Args('id') id: string,
    @Info() info: GraphQLResolveInfo,
  ) {
    const select = parseGraphQLInfo(info, 'CafeInfo');
    return this.prisma.cafeInfo.findUnique({
      where: { id },
      select,
    });
  }
}
```

### 테스트 실행

```bash
# 단위 테스트
pnpm test

```

## 라이선스

UNLICENSED
