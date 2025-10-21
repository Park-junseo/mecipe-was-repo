# VirtualCafe WAS

NestJS 기반의 Virtual Cafe 백엔드 API 서버입니다.

## 주요 기능

- RESTful API
- WebSocket 지원
- JWT 인증
- PostgreSQL 데이터베이스 (Prisma ORM)
- 파일 업로드 및 관리
- 메타버스 뷰어 통합

## 기술 스택

- **Framework**: NestJS 8.x
- **Runtime**: Node.js 20.x
- **Database**: PostgreSQL 15
- **ORM**: Prisma 4.x
- **Authentication**: JWT, Passport
- **Container**: Docker & Docker Compose
- **Web Server**: Nginx
- **SSL**: Let's Encrypt (Certbot)
- **CI/CD**: GitHub Actions

## 시스템 아키텍처

```
Internet
   ↓
Nginx (SSL/TLS + Reverse Proxy)
   ↓
NestJS Application (Port 4000)
   ↓
PostgreSQL Database
```

## 빠른 시작

### 로컬 개발 환경

#### 사전 요구사항

- Node.js 20.x
- npm 8.x 이상
- PostgreSQL 15 (외부 서버 또는 Docker)

**참고**: 기본 설정은 외부 PostgreSQL 서버를 사용합니다. 로컬에서 Docker로 실행하려면 [EXTERNAL_DATABASE.md](EXTERNAL_DATABASE.md)를 참조하세요.

#### 설치 및 실행

```bash
# 의존성 설치
cd mecipe-was
npm install

# Prisma Client 생성
npx prisma generate

# 개발 모드 실행
npm run start:dev

# 빌드
npm run build

# 프로덕션 모드 실행
npm run start:prod
```

### Docker를 사용한 개발 환경

```bash
# 환경 변수 설정
cp env.example .env
# .env 파일 편집 (DOMAIN_NAME, DATABASE_URL 등)
# DATABASE_URL에 외부 PostgreSQL 서버 URL을 설정하세요

# Docker Compose로 애플리케이션 실행
docker compose up -d

# 로그 확인
docker compose logs -f

# 중지
docker compose down
```

**로컬 PostgreSQL을 Docker로 실행하려면:**
```bash
# docker-compose.with-db.yml 사용
docker compose -f docker-compose.yml -f docker-compose.with-db.yml up -d
```

자세한 내용은 [EXTERNAL_DATABASE.md](EXTERNAL_DATABASE.md)를 참조하세요.

## 프로덕션 배포

상세한 배포 가이드는 [DEPLOYMENT.md](DEPLOYMENT.md)를 참조하세요.

### 배포 요약

1. **환경 설정**
   ```bash
   cp env.example .env
   # .env 파일에서 DOMAIN_NAME, DATABASE_URL 등 설정
   ```

2. **SSL 인증서 발급**
   ```bash
   chmod +x scripts/init-ssl.sh
   ./scripts/init-ssl.sh
   ```

3. **GitHub Actions 자동 배포**
   - 배포 방식 선택: Self-Hosted Runner 또는 SSH
   - GitHub Secrets 설정 (DOMAIN_NAME, DATABASE_URL 등)
   - main 브랜치에 push
   - 자세한 내용은 [DEPLOYMENT_STRATEGY.md](DEPLOYMENT_STRATEGY.md) 참조

4. **수동 배포**
   ```bash
   chmod +x scripts/deploy.sh
   ./scripts/deploy.sh
   ```

## 환경 변수 관리

이 프로젝트는 **환경 변수를 통한 동적 설정**을 지원합니다:

- ✅ `DOMAIN_NAME`: Nginx가 자동으로 적용 (하드코딩 불필요)
- ✅ `DATABASE_URL`: PostgreSQL 연결 정보
- ✅ `JWT_SECRET`: 인증 시크릿 키
- ✅ GitHub Actions Secrets 지원

자세한 내용은 [ENVIRONMENT_VARIABLES.md](ENVIRONMENT_VARIABLES.md)를 참조하세요.

## API 문서

API 문서는 다음 위치에서 확인할 수 있습니다:
- [Meta Viewer API Documentation](mecipe-was/documents/META_VIEWER_API_DOCUMENTATION.md)

## 프로젝트 구조

```
mecipe-was/
├── src/
│   ├── auth/              # 인증 모듈
│   ├── boards/            # 게시판 모듈
│   ├── caferealimages/    # 카페 실제 이미지 모듈
│   ├── cafethumbnailimages/ # 카페 썸네일 이미지 모듈
│   ├── cafevirtualimages/ # 카페 가상 이미지 모듈
│   ├── cafevirtuallinks/  # 카페 가상 링크 모듈
│   ├── coupons/           # 쿠폰 모듈
│   ├── imageupload/       # 이미지 업로드 모듈
│   ├── meta-veiwers/      # 메타 뷰어 모듈
│   ├── meta-viewer-infos/ # 메타 뷰어 정보 모듈
│   ├── places/            # 장소 모듈
│   ├── products/          # 상품 모듈
│   ├── productcategories/ # 상품 카테고리 모듈
│   ├── regioncategories/  # 지역 카테고리 모듈
│   ├── users/             # 사용자 모듈
│   ├── util/              # 유틸리티 모듈
│   ├── global/            # 글로벌 설정
│   └── main.ts            # 엔트리 포인트
├── prisma/
│   ├── schema.prisma      # Prisma 스키마
│   └── migrations/        # 데이터베이스 마이그레이션
├── test/                  # 테스트 파일
├── docker-compose.yml     # Docker Compose 설정
├── nginx/                 # Nginx 설정
├── scripts/               # 배포 스크립트
└── Dockerfile             # Docker 이미지 설정
```

## 개발 스크립트

```bash
# 개발 서버 실행 (watch mode)
npm run start:dev

# 빌드
npm run build

# 프로덕션 실행
npm run start:prod

# 테스트
npm run test
npm run test:watch
npm run test:e2e

# 린트
npm run lint

# Prisma
npm run prisma              # Prisma Client 생성
npm run prisma:migrate      # 마이그레이션 실행
```

## 환경 변수

주요 환경 변수는 `env.example` 파일을 참조하세요:

```env
# 애플리케이션
NODE_ENV=production
PORT=4000

# 도메인 (Nginx가 자동으로 적용)
DOMAIN_NAME=your-domain.com
SSL_EMAIL=your-email@example.com

# 데이터베이스
DATABASE_URL="postgresql://user:pass@host:5432/db?schema=public"

# JWT
JWT_SECRET=your_secret_key
```

**💡 팁**: `DOMAIN_NAME`은 Nginx 설정에 자동으로 적용됩니다. 설정 파일을 수동으로 수정할 필요가 없습니다!

## 데이터베이스 마이그레이션

```bash
# 마이그레이션 생성
npx prisma migrate dev --name migration_name

# 프로덕션 마이그레이션 적용
npx prisma migrate deploy

# Prisma Studio (DB GUI)
npx prisma studio
```

## 테스트

```bash
# 단위 테스트
npm run test

# E2E 테스트
npm run test:e2e

# 테스트 커버리지
npm run test:cov
```

테스트 관련 자세한 내용은 [test/README_TESTING.md](mecipe-was/test/README_TESTING.md)를 참조하세요.

## 주요 기능

### 인증 및 권한

- JWT 기반 인증
- API Key 인증
- 역할 기반 접근 제어 (RBAC)

### 파일 업로드

- 이미지 업로드 및 처리
- 썸네일 자동 생성
- 미디어 파일 관리

### WebSocket

- 실시간 통신
- Socket.io 통합

### 메타버스 통합

- 메타 뷰어 API
- 가상 공간 관리
- 3D 콘텐츠 연동

## 보안

- HTTPS/TLS 1.2+
- CORS 설정
- Rate Limiting
- SQL Injection 방지 (Prisma ORM)
- XSS 방지 헤더
- CSRF 보호

## 모니터링 및 로그

```bash
# 애플리케이션 로그
docker compose logs -f app

# Nginx 로그
docker compose logs -f nginx

# 데이터베이스 로그
docker compose logs -f db

# 전체 로그
docker compose logs -f
```

## 백업

데이터베이스 백업:

```bash
# 백업 실행
./scripts/backup-db.sh

# 백업 파일 위치
ls -lh backups/

# 복원
gunzip backups/db_backup_YYYYMMDD_HHMMSS.sql.gz
docker compose exec -T db psql -U $POSTGRES_USER -d $POSTGRES_DB < backups/db_backup_YYYYMMDD_HHMMSS.sql
```

## 트러블슈팅

자주 발생하는 문제와 해결 방법은 [DEPLOYMENT.md](DEPLOYMENT.md#트러블슈팅)의 트러블슈팅 섹션을 참조하세요.

## 기여하기

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 라이선스

이 프로젝트는 비공개 라이선스입니다.

## 연락처

프로젝트 관련 문의: [GitHub Issues](https://github.com/Park-junseo/virtualcafe-was-repo/issues)

## 참고 자료

- [NestJS Documentation](https://nestjs.com/)
- [Prisma Documentation](https://www.prisma.io/docs/)
- [Docker Documentation](https://docs.docker.com/)
- [Nginx Documentation](https://nginx.org/en/docs/)
- [Let's Encrypt Documentation](https://letsencrypt.org/docs/)

## 추가 문서

- 📚 **배포 가이드**: [DEPLOYMENT.md](DEPLOYMENT.md) - 자세한 배포 방법
- 🚀 **빠른 시작**: [QUICK_START.md](QUICK_START.md) - 5단계로 배포하기
- 🏗️ **아키텍처**: [ARCHITECTURE.md](ARCHITECTURE.md) - 시스템 구조 이해
- 🔧 **환경 변수**: [ENVIRONMENT_VARIABLES.md](ENVIRONMENT_VARIABLES.md) - 환경 변수 완벽 가이드
- 📍 **.env 위치**: [ENV_FILE_LOCATION.md](ENV_FILE_LOCATION.md) - .env 파일 위치 및 사용법
- 💡 **환경 변수 사용**: [ENV_USAGE_GUIDE.md](ENV_USAGE_GUIDE.md) - NestJS에서 환경 변수 사용하기
- 🔌 **Nginx 포트**: [NGINX_PORT_CONFIGURATION.md](NGINX_PORT_CONFIGURATION.md) - Nginx 포트 환경 변수 관리
- 🐘 **PostgreSQL**: [POSTGRESQL_MIGRATION.md](POSTGRESQL_MIGRATION.md) - PostgreSQL 마이그레이션
- 🔗 **외부 DB**: [EXTERNAL_DATABASE.md](EXTERNAL_DATABASE.md) - 외부 데이터베이스 연결 가이드
- 🚢 **배포 전략**: [DEPLOYMENT_STRATEGY.md](DEPLOYMENT_STRATEGY.md) - Self-Hosted vs SSH 배포
