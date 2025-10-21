# 시스템 아키텍처

이 문서는 VirtualCafe WAS의 전체 시스템 아키텍처를 설명합니다.

## 전체 아키텍처 다이어그램

```
┌─────────────────────────────────────────────────────────────┐
│                        Internet                              │
└────────────────────────┬────────────────────────────────────┘
                         │ HTTPS (443)
                         │ HTTP (80)
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                    Load Balancer (Optional)                  │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                    Nginx (Reverse Proxy)                     │
│  ┌────────────────────────────────────────────────────┐     │
│  │  - SSL/TLS Termination (Let's Encrypt)             │     │
│  │  - Request Routing                                 │     │
│  │  - Static File Serving                             │     │
│  │  - WebSocket Upgrade                               │     │
│  │  - Security Headers                                │     │
│  │  - Gzip Compression                                │     │
│  └────────────────────────────────────────────────────┘     │
└────────────────────────┬────────────────────────────────────┘
                         │ Port 4000
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                   NestJS Application                         │
│  ┌────────────────────────────────────────────────────┐     │
│  │  Controllers                                       │     │
│  │  ├── Auth Controller                               │     │
│  │  ├── Board Controller                              │     │
│  │  ├── Product Controller                            │     │
│  │  ├── Meta Viewer Controller                        │     │
│  │  └── ...                                           │     │
│  └───────────────────┬────────────────────────────────┘     │
│                      │                                       │
│  ┌───────────────────▼────────────────────────────────┐     │
│  │  Services                                          │     │
│  │  ├── Business Logic                                │     │
│  │  ├── Data Validation                               │     │
│  │  └── External API Integration                      │     │
│  └───────────────────┬────────────────────────────────┘     │
│                      │                                       │
│  ┌───────────────────▼────────────────────────────────┐     │
│  │  Prisma ORM                                        │     │
│  │  ├── Type-safe Database Client                     │     │
│  │  ├── Migration Management                          │     │
│  │  └── Query Builder                                 │     │
│  └───────────────────┬────────────────────────────────┘     │
└────────────────────────┼────────────────────────────────────┘
                         │ Port 5432
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                    PostgreSQL Database                       │
│  ┌────────────────────────────────────────────────────┐     │
│  │  - User Data                                       │     │
│  │  - Product Catalog                                 │     │
│  │  - Board Content                                   │     │
│  │  - Meta Viewer Data                                │     │
│  │  - Transaction Logs                                │     │
│  └────────────────────────────────────────────────────┘     │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                    Certbot (Let's Encrypt)                   │
│  - SSL Certificate Issuance                                  │
│  - Automatic Renewal (every 12 hours check)                  │
└─────────────────────────────────────────────────────────────┘
```

## 컴포넌트 상세

### 1. Nginx (리버스 프록시)

**역할:**
- HTTPS 요청 처리 및 SSL/TLS 종료
- 요청 라우팅 (API, WebSocket, Static Files)
- 보안 헤더 추가
- Gzip 압축
- Rate Limiting (선택사항)

**포트:**
- 80 (HTTP) → HTTPS로 리다이렉트
- 443 (HTTPS) → NestJS로 프록시

**주요 설정:**
```nginx
# API 요청
location /api → http://app:4000

# WebSocket
location /socket.io → http://app:4000 (with upgrade)

# 정적 파일
location /media → /var/www/media

# Let's Encrypt
location /.well-known/acme-challenge/ → /var/www/certbot
```

### 2. NestJS Application

**역할:**
- RESTful API 제공
- WebSocket 실시간 통신
- 비즈니스 로직 처리
- 인증 및 권한 관리
- 파일 업로드 처리

**포트:**
- 4000 (내부)

**주요 모듈:**

```typescript
AppModule
├── AuthModule (JWT, API Key 인증)
├── UsersModule (사용자 관리)
├── BoardsModule (게시판)
├── ProductsModule (상품)
├── MetaViewerModule (메타버스)
├── CouponModule (쿠폰)
├── ImageUploadModule (이미지 처리)
└── ... (기타 모듈)
```

**데이터 플로우:**
```
Request → Guard (인증) → Controller → Service → Prisma → Database
                                         ↓
Response ← Controller ← Service ← Prisma ← Database
```

### 3. PostgreSQL Database

**역할:**
- 영구 데이터 저장
- 트랜잭션 관리
- 데이터 무결성 보장
- ACID 준수

**포트:**
- 5432 (내부)

**주요 테이블:**
- User (사용자)
- Board (게시판)
- Product (상품)
- CafeInfo (카페 정보)
- MetaViewerMap (메타버스 맵)
- ... (기타 테이블)

### 4. Certbot (Let's Encrypt)

**역할:**
- SSL/TLS 인증서 자동 발급
- 인증서 자동 갱신 (90일마다)

**동작 방식:**
1. ACME Challenge를 통한 도메인 소유권 확인
2. Let's Encrypt CA에서 인증서 발급
3. 12시간마다 갱신 체크
4. 만료 30일 전 자동 갱신

## 네트워크 아키텍처

### Docker Network

```
┌─────────────────────────────────────────────┐
│          app-network (bridge)                │
│                                              │
│  ┌──────────┐   ┌──────────┐   ┌─────────┐ │
│  │  nginx   │   │   app    │   │   db    │ │
│  │          │───│          │───│         │ │
│  └──────────┘   └──────────┘   └─────────┘ │
│       │                                      │
│  ┌────▼─────┐                                │
│  │ certbot  │                                │
│  └──────────┘                                │
└─────────────────────────────────────────────┘
```

**네트워크 격리:**
- 모든 컨테이너는 `app-network`에 연결
- 외부에서는 Nginx(80, 443)만 접근 가능
- NestJS와 PostgreSQL은 내부 네트워크로만 통신

### 보안 계층

```
Internet
   │
   ├─ Layer 1: Firewall (UFW)
   │   └─ 80, 443만 허용
   │
   ├─ Layer 2: Nginx
   │   ├─ SSL/TLS 1.2+
   │   ├─ Security Headers
   │   └─ Rate Limiting
   │
   ├─ Layer 3: NestJS
   │   ├─ JWT Authentication
   │   ├─ API Key Validation
   │   ├─ CORS Policy
   │   └─ Input Validation
   │
   └─ Layer 4: Database
       ├─ Internal Network Only
       └─ Strong Password
```

## 데이터 플로우

### 일반 API 요청

```
1. Client → HTTPS Request → Nginx:443
2. Nginx → SSL Termination
3. Nginx → Proxy to app:4000
4. NestJS → JWT Guard (인증)
5. NestJS → Controller → Service
6. Service → Prisma → PostgreSQL
7. PostgreSQL → Data → Prisma
8. Prisma → Service → Controller
9. Controller → JSON Response → Nginx
10. Nginx → HTTPS Response → Client
```

### WebSocket 연결

```
1. Client → WebSocket Upgrade Request → Nginx:443
2. Nginx → Detect Upgrade header
3. Nginx → Proxy with upgrade to app:4000
4. NestJS → WebSocket Gateway
5. NestJS → Establish WebSocket connection
6. Bidirectional real-time communication
```

### 파일 업로드

```
1. Client → Multipart/form-data → Nginx:443
2. Nginx → Proxy to app:4000
3. NestJS → Multer middleware
4. NestJS → Save to /app/media
5. NestJS → Create thumbnail
6. NestJS → Store metadata in PostgreSQL
7. NestJS → Return file URL
8. Client → Access file via /media/filename
9. Nginx → Serve static file directly
```

## CI/CD 파이프라인

```
Developer
   │
   ├─ git push origin main
   │
   ▼
GitHub Actions
   │
   ├─ 1. Test & Build
   │   ├─ npm ci
   │   ├─ npm run lint
   │   ├─ npm test
   │   └─ npm run build
   │
   ├─ 2. Docker Build
   │   └─ docker compose build
   │
   └─ 3. Deploy
       ├─ SSH to server
       ├─ docker compose down
       ├─ docker compose up -d
       └─ Health check
```

### GitHub Actions Workflow

```yaml
Trigger: push to main
  ↓
Job 1: Test
  - Install dependencies
  - Generate Prisma Client
  - Run linter
  - Run tests
  - Build application
  ↓
Job 2: Deploy (if Job 1 success)
  - Build Docker images
  - Copy files to server
  - SSH to server
  - Stop old containers
  - Start new containers
  - Health check
```

## 스케일링 전략

### 수평 스케일링 (Horizontal Scaling)

```
           Load Balancer
                 │
        ┌────────┼────────┐
        ▼        ▼        ▼
     Server1  Server2  Server3
     (Nginx)  (Nginx)  (Nginx)
        │        │        │
        ▼        ▼        ▼
     NestJS   NestJS   NestJS
        │        │        │
        └────────┼────────┘
                 ▼
        PostgreSQL Master
                 │
        ┌────────┼────────┐
        ▼        ▼        ▼
     Slave1   Slave2   Slave3
```

### 수직 스케일링 (Vertical Scaling)

Docker Compose에서 리소스 제한 설정:

```yaml
services:
  app:
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 4G
        reservations:
          memory: 2G
```

## 모니터링 아키텍처 (권장)

```
Application Logs
   │
   ├─ Docker Logs
   │   └─ docker compose logs
   │
   ├─ File Logs
   │   └─ /var/log/app/*.log
   │
   └─ Monitoring Stack (Optional)
       ├─ Prometheus (메트릭 수집)
       ├─ Grafana (시각화)
       ├─ Loki (로그 수집)
       └─ AlertManager (알림)
```

## 백업 전략

```
Database Backup
   │
   ├─ Daily Backup (자동)
   │   └─ ./scripts/backup-db.sh
   │   └─ Cron: 0 2 * * *
   │
   ├─ Backup Storage
   │   └─ /app/mecipe-was/backups/
   │   └─ Retention: 30 days
   │
   └─ Offsite Backup (권장)
       └─ AWS S3 / Azure Blob / Google Cloud Storage
```

## 재해 복구 (Disaster Recovery)

### RTO (Recovery Time Objective)
- 목표: 1시간 이내

### RPO (Recovery Point Objective)
- 목표: 24시간 이내 (일일 백업 기준)

### 복구 절차

```
1. 새 서버 프로비저닝
2. Docker 및 Docker Compose 설치
3. 저장소 클론
4. 환경 변수 복원
5. 데이터베이스 백업 복원
6. SSL 인증서 재발급
7. 컨테이너 시작
8. DNS 업데이트
9. Health check
```

## 성능 최적화

### 캐싱 전략

```
Layer 1: Nginx (정적 파일 캐싱)
   ↓
Layer 2: Application (Redis - 선택사항)
   ↓
Layer 3: Database (Query 결과 캐싱)
   ↓
Layer 4: Database (인덱스 최적화)
```

### 데이터베이스 최적화

1. **인덱스**: 자주 조회되는 컬럼에 인덱스 추가
2. **Connection Pool**: Prisma connection limit 설정
3. **Query 최적화**: N+1 문제 해결
4. **파티셔닝**: 대용량 테이블 분할 (필요시)

## 보안 아키텍처

### Defense in Depth (다층 방어)

```
Layer 1: Network (방화벽, DDoS 보호)
Layer 2: Transport (SSL/TLS)
Layer 3: Application (인증, 권한, 입력 검증)
Layer 4: Data (암호화, 접근 제어)
Layer 5: Monitoring (로그, 알림)
```

### 인증 플로우

```
Client → Request with JWT
   ↓
Nginx → Proxy
   ↓
NestJS → JWT Guard
   ↓
Verify JWT Signature
   ↓
Extract User Info
   ↓
Check Permissions
   ↓
Allow/Deny Request
```

## 환경별 설정

### Development
- Node.js 직접 실행
- Hot reload 활성화
- 로그 레벨: DEBUG

### Production
- Docker 컨테이너
- 최적화된 빌드
- 로그 레벨: INFO/WARN/ERROR
- SSL/TLS 필수

## 기술 스택 요약

| 계층 | 기술 | 버전 | 역할 |
|------|------|------|------|
| Proxy | Nginx | latest | 리버스 프록시, SSL |
| Runtime | Node.js | 20.x | 런타임 환경 |
| Framework | NestJS | 8.x | 백엔드 프레임워크 |
| ORM | Prisma | 4.x | 데이터베이스 ORM |
| Database | PostgreSQL | 15 | 데이터 저장 |
| SSL | Let's Encrypt | - | 무료 SSL 인증서 |
| Container | Docker | 20.10+ | 컨테이너화 |
| Orchestration | Docker Compose | 2.0+ | 다중 컨테이너 관리 |
| CI/CD | GitHub Actions | - | 자동 배포 |
| Auth | JWT | - | 인증 토큰 |

---

이 아키텍처는 확장 가능하고, 안전하며, 유지보수가 용이한 시스템을 제공합니다.

