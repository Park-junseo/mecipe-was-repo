# Meta Viewer Service

Meta Viewer Service는 Redis를 중개로 사용하는 다중 소켓 서버입니다. Socket.IO와 Redis를 활용하여 레플리카셋 환경에서 일관된 실시간 통신을 제공하며, 분산 락을 통한 리더 선별 및 메시지 큐 기반 브로드캐스트 트래픽 관리를 지원합니다.

## 개요

이 서비스는 다음과 같은 주요 기능을 제공합니다:

1. **다중 소켓 서버 지원**: Redis Adapter를 통한 레플리카셋 간 소켓 통신 동기화
2. **분산 브로드캐스트**: Redis 락을 통한 리더 선별 및 일괄 브로드캐스트
3. **메시지 큐 관리**: Redis Streams를 활용한 메시지 큐 및 트래픽 관리
4. **세션 관리**: 클라이언트 세션 발급 및 재연결 지원
5. **룸 관리**: 방(Room) 기반 클라이언트 그룹 관리
6. **메시지 캐시**: Stateful 통신을 위한 메시지 캐시 시스템

## 아키텍처

### Redis 중개 소켓 서버 아키텍처 다이어그램

![Redis Socket Server Architecture](../../images/meta-viewer-serivce.by-redis%20socket%20server.png)

### 서비스 구조

```
Client (Socket.IO)
    ↓
Meta Viewer Service (Multiple Replicas)
    ├── Socket.IO Gateway
    ├── Redis Adapter (Pub/Sub)
    ├── Redis Queue Service (Streams)
    ├── Redis Broadcast Scheduler (Leader Election)
    ├── Redis Room Service (Session Management)
    └── Redis Cache Service
    ↓
Redis Server
    ├── Pub/Sub (Socket.IO Adapter)
    ├── Streams (Message Queue)
    ├── Hash/Set (Room & Session Data)
    └── Distributed Lock (Leader Election)
```

### 데이터 흐름

1. **클라이언트 연결**: Socket.IO를 통한 WebSocket 연결
2. **세션 발급**: 클라이언트에게 세션 토큰 발급 (재연결 지원)
3. **방 입장**: 클라이언트가 특정 방(Room)에 입장
4. **메시지 수신**: 클라이언트로부터 실시간 데이터 수신
5. **메시지 큐 삽입**: Redis Streams에 메시지 추가
6. **리더 선별**: Redis 분산 락을 통한 리더 소켓 선별
7. **일괄 브로드캐스트**: 리더 소켓이 12ms 간격으로 일괄 브로드캐스트
8. **메시지 캐시**: Stateful 메시지는 Redis에 캐시 저장

## 주요 기능

1. **분산 락 기반 리더 선별**: Redis 분산 락을 통해 하나의 레플리카만 브로드캐스트 스케줄러 실행
2. **메시지 큐 기반 트래픽 관리**: Redis Streams를 활용한 메시지 큐 및 일괄 처리
3. **세션 기반 재연결**: 세션 토큰을 통한 연결 끊김 후 자동 재연결 및 상태 복원
4. **레플리카셋 지원**: Redis Adapter를 통한 다중 서버 간 소켓 통신 동기화
5. **고성능 브로드캐스트**: 12ms 간격(~83fps)의 고주파 브로드캐스트 지원
6. **Stateful 메시지 캐시**: 방 입장 시 이전 메시지 복원을 위한 캐시 시스템

## 실행 방법

### 기본 실행 (개발 모드)

```bash
pnpm start:dev
```

개발 모드로 서비스를 실행합니다. 파일 변경 시 자동으로 재시작됩니다.

### 인프라 포함 개발 실행

```bash
pnpm start:dev:infra
```

Redis 등 필요한 인프라를 포함하여 개발 환경을 실행합니다.

### PM2를 사용한 프로덕션 실행

```bash
pnpm daemon
```

PM2를 사용하여 프로덕션 모드로 서비스를 실행합니다. 빌드 후 PM2로 프로세스를 시작합니다 (인스턴스 수: 2).

#### PM2 관련 명령어

- **재시작**: `pnpm daemon:re` - 서비스를 중지하고 다시 시작합니다.
- **중지**: `pnpm daemon:stop` - PM2로 실행 중인 서비스를 중지합니다.
- **로그 확인**: `pnpm daemon:log` - 최근 1000줄의 로그를 확인합니다.

## 모듈 구조

### 1. App Module (`app.module.ts`)

애플리케이션의 루트 모듈입니다. 다음 모듈들을 통합합니다:
- `ConfigModule`: 환경 변수 및 설정 관리
- `CommonAuthModule`: 공통 인증 모듈
- `MetaViewersRedisModule`: Redis 기반 Meta Viewers 모듈

**주요 기능:**
- HTTP 엔드포인트 제공 (Health Check)
- 정적 파일 서빙 (미디어 파일)
- 전역 가드 및 인터셉터 설정

### 2. Meta Viewers Redis Module (`meta-viewers-redis/`)

Redis를 활용한 Meta Viewers 소켓 서버의 핵심 모듈입니다.

#### MetaViewersRedisGateway (`meta-viewers-redis.gateway.ts`)
- Socket.IO WebSocket Gateway
- Redis Adapter를 통한 레플리카셋 간 통신
- 클라이언트 연결/해제 처리
- 방 입장/퇴장 이벤트 처리
- 실시간 데이터 수신 및 브로드캐스트

**주요 이벤트:**
- `ROOM_BROADCAST`: 클라이언트로부터 실시간 데이터 수신
- `USER_JOINED`: 방 입장
- `USER_LEFT`: 방 퇴장
- `HEALTH_CHECK`: 클라이언트 헬스체크 (30초마다)

#### MetaViewersRedisService (`meta-viewers-redis.service.ts`)
- 소켓 서비스의 핵심 비즈니스 로직
- 클라이언트 연결/해제 관리
- 세션 토큰 생성 및 복원
- 방 관리 및 메시지 처리
- 메시지 캐시 관리

**주요 기능:**
- 세션 토큰 기반 재연결 지원
- 방 입장 시 캐시된 메시지 전송
- 고아 클라이언트 정리

#### RedisBroadcastSchedulerService (`services/redis-broadcast-scheduler.service.ts`)

**분산 락 기반 리더 선별 및 브로드캐스트 스케줄러**

- Redis 분산 락을 통한 리더 선별
- 12ms 간격으로 활성 방의 메시지를 일괄 브로드캐스트
- 하나의 레플리카만 스케줄러 실행 (Redis 부하 감소)
- 리더 장애 시 자동으로 다른 레플리카가 리더 역할 수행

**작동 방식:**
1. 각 레플리카가 Redis 분산 락 획득 시도
2. 락을 획득한 레플리카가 리더가 되어 브로드캐스트 스케줄러 실행
3. 12ms마다 Redis Streams에서 메시지를 읽어 모든 레플리카에 브로드캐스트
4. 리더가 장애 시 락 TTL(30초) 만료 후 다른 레플리카가 리더 역할 수행

#### RedisQueueService (`services/redis-queue.service.ts`)

**Redis Streams 기반 메시지 큐 서비스**

- Redis Streams를 활용한 메시지 큐 관리
- Consumer Group을 통한 중복 처리 방지
- 메시지 순서 보장
- 레플리카셋 환경에서 공유 메시지 큐 제공

**주요 기능:**
- 방별 메시지 큐에 데이터 추가 (`enqueueData`)
- Consumer Group을 통한 메시지 읽기
- Stream 최대 길이 관리 (메모리 관리)

#### RedisRoomService (`services/redis-room.service.ts`)

**Redis 기반 룸 및 세션 관리 서비스**

- Redis Hash와 Set을 활용한 룸 정보 관리
- 세션 토큰 기반 세션 관리
- 클라이언트-방 매핑 관리
- 헬스체크 기반 클라이언트 생명주기 관리

**주요 기능:**
- 방 생성 및 관리
- 클라이언트 방 입장/퇴장
- 세션 토큰 생성 및 복원
- 헬스체크 처리 (30초마다 TTL 갱신)
- 비활성 클라이언트 정리 (60초마다)

**세션 관리:**
- 세션 토큰 TTL: 10분 (재연결 시 복원 가능 시간)
- 방 TTL: 3분 (헬스체크로 갱신)
- 헬스체크 타임아웃: 60초

#### RedisCacheService (`services/redis-cache.service.ts`)

**Redis 기반 메시지 캐시 서비스**

- Stateful 통신을 위한 메시지 캐시
- 캐시 타입별 저장 전략:
  - 단일 메시지 (덮어쓰기): Redis String
  - 다중 메시지 (RECORD_EVERY): Redis Sorted Set
- 방 입장 시 캐시된 메시지 전송

**캐시 타입 플래그:**
- `JOIN_EVENT`: 방 입장 시 전송될 이벤트
- `LEAVE_EVENT`: 방 퇴장 시 전송될 이벤트
- `RECORD_EVERY`: 모든 레코드 기록 모드
- `NON_VOLATILE`: 비휘발성 모드

#### Redis Adapter Config (`redis-adapter.config.ts`)
- Socket.IO Redis Adapter 설정
- Redis Pub/Sub 클라이언트 생성
- 레플리카셋 간 Socket.IO 이벤트 브로드캐스트

### 3. Util Module (`util/`)

다양한 유틸리티 함수들을 제공합니다.

- `decorators/`: 커스텀 데코레이터
- `getAppDirectory.ts`: 애플리케이션 디렉토리 경로 유틸리티
- `isPrimitive.ts`: 원시 타입 체크 유틸리티
- `types.ts`: 공통 타입 정의

## 브로드캐스트 트래픽 관리 상세 설명

### 메시지 흐름

1. **클라이언트 메시지 수신**: Gateway가 클라이언트로부터 실시간 데이터 수신
2. **메시지 큐 삽입**: Redis Streams에 방별로 메시지 추가
3. **메시지 캐시 저장**: Stateful 메시지는 Redis에 캐시 저장
4. **리더 선별**: Redis 분산 락을 통해 하나의 레플리카가 리더로 선별
5. **일괄 브로드캐스트**: 리더가 12ms마다 Redis Streams에서 메시지를 읽어 모든 레플리카에 브로드캐스트
6. **클라이언트 전송**: 각 레플리카의 Socket.IO 서버가 연결된 클라이언트에게 메시지 전송

### 분산 락 기반 리더 선별

```
Replica 1 ──┐
Replica 2 ──┼──> Redis Lock ──> Leader (Replica 1)
Replica 3 ──┘
                ↓
         Broadcast Scheduler (12ms interval)
                ↓
         Redis Streams (Message Queue)
                ↓
         All Replicas Broadcast
```

**장점:**
- Redis 부하 감소: 하나의 레플리카만 스케줄러 실행
- 자동 장애 복구: 리더 장애 시 다른 레플리카가 자동으로 리더 역할 수행
- 일관된 브로드캐스트: 모든 레플리카가 동일한 메시지를 브로드캐스트

### 세션 기반 재연결

1. **초기 연결**: 클라이언트 연결 시 세션 토큰 발급
2. **세션 저장**: Redis에 세션 정보 저장 (소켓 ID, 방 정보 등)
3. **연결 끊김**: 네트워크 문제 등으로 연결 끊김
4. **재연결 시도**: 클라이언트가 세션 토큰과 함께 재연결
5. **세션 복원**: 서버가 세션 토큰을 확인하여 이전 방 정보 복원
6. **캐시된 메시지 전송**: 방 입장 시 캐시된 메시지 전송

## 환경 변수

다음 환경 변수를 설정해야 합니다:

### Redis 설정

- `REDIS_URL`: Redis 서버 연결 문자열 (예: `redis://localhost:6379` 또는 `redis://user:password@host:6379`)

### 소켓 서버 설정

- `SOCKET_PORT`: Socket.IO 서버 포트 (기본값: `3000`)

### 인스턴스 설정

- `INSTANCE_ID`: 인스턴스 식별자 (기본값: `process.pid`)
- `NODE_ENV`: 실행 환경 (`development`, `production`)

## 의존성

### 주요 의존성

- `@nestjs/core`, `@nestjs/common`: NestJS 프레임워크
- `@nestjs/websockets`, `@nestjs/platform-socket.io`: WebSocket 지원
- `socket.io`: Socket.IO 서버
- `@socket.io/redis-adapter`: Socket.IO Redis Adapter
- `redis`: Redis 클라이언트
- `@nestjs/config`: 환경 변수 관리
- `@nestjs/jwt`, `passport-jwt`: JWT 인증

### 개발 의존성

- `jest`, `ts-jest`: 테스트 프레임워크
- `pm2`: 프로세스 관리
- `tsx`: TypeScript 실행

## 개발 가이드

### 새로운 이벤트 타입 추가하기

1. `meta-viewers-redis/interface/socket-event-type.ts`에 이벤트 타입 정의
2. Gateway에 이벤트 핸들러 추가
3. Service에 비즈니스 로직 구현

### 메시지 캐시 타입 추가하기

1. `meta-viewers-redis/services/redis-cache.service.ts`에서 캐시 타입 선언
2. `CacheTypeFlag`에 새로운 플래그 추가 (필요한 경우)
3. Service 초기화 시 캐시 타입 등록

### 테스트 실행

```bash
# 단위 테스트
pnpm test

```

## 성능 최적화

### 브로드캐스트 주기

- 기본 브로드캐스트 주기: 12ms (~83fps)
- `RedisBroadcastSchedulerService`의 `broadcastIntervalMs`로 조정 가능

### 메시지 큐 관리

- Stream 최대 길이: 1000 (메모리 관리)
- 배치 크기: 100 (한 번에 읽을 최대 메시지 수)

### 세션 관리

- 세션 토큰 TTL: 10분
- 방 TTL: 3분 (헬스체크로 갱신)
- 헬스체크 주기: 30초
- 정리 작업 주기: 60초

## 라이선스

UNLICENSED
