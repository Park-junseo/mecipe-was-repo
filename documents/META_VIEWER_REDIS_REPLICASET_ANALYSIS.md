# Meta-Viewers 모듈 Redis 레플리카셋 운영 분석

## 목차
1. [현재 구조 분석](#현재-구조-분석)
2. [주요 기능 설명](#주요-기능-설명)
3. [레플리카셋 운영 시 고려사항](#레플리카셋-운영-시-고려사항)
4. [Redis 도입 전략](#redis-도입-전략)
5. [도입 가능한 기술](#도입-가능한-기술)
6. [구현 전략 및 설계 고민](#구현-전략-및-설계-고민)

---

## 현재 구조 분석

### 1. 모듈 개요

`meta-veiwers` 모듈은 Socket.IO 기반의 실시간 소켓 통신 서버로, 다음과 같은 구조를 가지고 있습니다:

```
meta-veiwers/
├── meta-veiwers.gateway.ts          # WebSocket Gateway (Socket.IO)
├── meta-veiwers.service.ts          # 메인 서비스 로직
├── meta-veiwers.module.ts           # NestJS 모듈 정의
├── services/
│   ├── broadcast-scheduler.service.ts    # 브로드캐스트 스케줄러 (12ms 간격)
│   ├── room-data-queue.service.ts        # 인메모리 메시지 큐 (현재 사용)
│   ├── redis-room-data-queue.service.ts  # Redis 기반 메시지 큐 (구현됨, 미사용)
│   ├── room-manager.service.ts           # 룸 관리 (클라이언트-룸 매핑)
│   └── message-cache.service.ts          # 메시지 캐시 관리
├── interface/
│   ├── broadcast-data-type.ts            # 브로드캐스트 데이터 타입 정의
│   ├── socket-event-type.ts              # Socket 이벤트 타입 정의
│   └── socket-data-queue.ts              # 큐 데이터 구조
└── utils/
    ├── message-cache.ts                  # 메시지 캐시 유틸리티
    └── socket-logger.ts                  # 소켓 로거
```

### 2. 주요 컴포넌트 역할

#### 2.1 MetaVeiwersGateway
- **역할**: Socket.IO Gateway, 클라이언트 연결 관리
- **기능**:
  - WebSocket 연결 수락 및 관리
  - 이벤트 구독 및 라우팅
  - 현재 포트: `4100` (환경변수 `SOCKET_PORT`로 설정 가능)
  - 경로: `/meta-viewers`

#### 2.2 MetaVeiwersService
- **역할**: 핵심 비즈니스 로직 처리
- **주요 기능**:
  - 클라이언트 연결/해제 처리
  - 룸 입장/퇴장 관리
  - 실시간 데이터 수신 및 큐잉
  - 메시지 캐시 관리

#### 2.3 BroadcastSchedulerService
- **역할**: 주기적 브로드캐스트 스케줄링
- **동작**:
  - 12ms 간격 (약 83fps)으로 실행
  - 활성 룸별로 큐에 쌓인 메시지를 브로드캐스트
  - 통계 정보 수집 (총 브로드캐스트 수, 전송된 데이터 양 등)

#### 2.4 RoomDataQueueService (현재 사용 중)
- **역할**: 인메모리 메시지 큐 관리
- **구조**:
  ```typescript
  private roomQueues: RoomDataQueue = {}; // { roomId: ClientMessage[] }
  ```
- **문제점**:
  - 인메모리 저장소로 레플리카 간 공유 불가
  - 서버 재시작 시 데이터 손실
  - 레플리카셋 환경에서 각 인스턴스가 독립적인 큐를 가짐

#### 2.5 RedisRoomDataQueueService (구현됨, 미사용)
- **역할**: Redis Stream 기반 메시지 큐
- **현재 상태**: 구현되어 있으나 실제 사용되지 않음
- **구현 방식**: Redis Stream + Consumer Group
- **주요 기능**:
  - 방별 Stream 키: `room:{roomId}:queue`
  - Consumer Group: `broadcast-group`
  - Consumer 이름: `instance-{INSTANCE_ID || PID}`

#### 2.6 RoomManagerService
- **역할**: 룸 및 클라이언트 관리
- **저장소**:
  ```typescript
  private rooms = new Map<string, Set<string>>();        // roomId -> Set<socketId>
  private clientRooms = new Map<string, string>();       // socketId -> roomId
  private roomInfo = new Map<string, RoomInfo>();        // roomId -> RoomInfo
  ```
- **문제점**: 인메모리 저장소로 레플리카 간 공유 불가

#### 2.7 MessageCacheService
- **역할**: 메시지 캐시 관리 (메시지 타입별 캐싱 정책 적용)
- **저장소**:
  ```typescript
  private readonly roomMessageCache = new Map<string, MessageCache>(); // roomId -> MessageCache
  ```
- **캐시 타입 플래그**:
  - `JOIN_EVENT`: 방 입장 시 캐시된 메시지 전송
  - `LEAVE_EVENT`: 방 퇴장 시 캐시된 메시지 전송
  - `RECORD_EVERY`: 모든 레코드 기록 모드 (덮어쓰기 비활성화)
  - `NON_VOLATILE`: 비휘발성 모드 (삭제하지 않음)
- **문제점**: 인메모리 저장소로 레플리카 간 공유 불가

---

## 주요 기능 설명

### 1. 메시지 큐 및 브로드캐스트 플로우

```
클라이언트 → Socket.IO Gateway
            ↓
       handleRoomData()
            ↓
    RoomDataQueueService.enqueueData()
    (방별 큐에 메시지 저장)
            ↓
    MessageCacheService.setMessageCache()
    (메시지 타입별 캐시 저장)
            ↓
    BroadcastSchedulerService (12ms마다 실행)
            ↓
    RoomDataQueueService.dequeueAllData()
    (큐에서 모든 메시지 가져오기)
            ↓
    Socket.IO server.to(roomId).emit()
    (같은 룸의 모든 클라이언트에게 브로드캐스트)
```

### 2. 메시지 캐시 시스템

메시지 타입별로 캐싱 정책을 설정할 수 있습니다:

```typescript
// 예시: PLAYER_TRANSFORM 메시지는 입장 시 캐시 전송
messageCacheService.declareCacheType(
  RoomDataMessageType.PLAYER_TRANSFORM,
  CacheTypeFlag.JOIN_EVENT
);
```

**캐시 동작 시나리오**:

1. **JOIN_EVENT**: 
   - 사용자가 룸에 입장 시, 해당 타입의 캐시된 모든 메시지를 초기화 데이터로 전송
   - 예: 플레이어 위치/변환 정보

2. **LEAVE_EVENT**:
   - 사용자가 룸에서 퇴장 시, 해당 사용자의 캐시된 메시지를 전송
   - 전송 후 캐시 정리 (NON_VOLATILE이 아닌 경우)

3. **RECORD_EVERY**:
   - 모든 메시지를 기록 (덮어쓰기 비활성화)
   - 최대 캐시 크기: 1000개 (초과 시 오래된 메시지 삭제)

4. **NON_VOLATILE**:
   - 비휘발성 모드 (사용자 퇴장 시에도 캐시 유지)

### 3. 룸 관리 시스템

- 클라이언트는 하나의 룸에만 속할 수 있음
- 룸 입장 시 기존 룸에서 자동으로 제거
- 빈 룸은 자동으로 정리
- 룸별 클라이언트 목록 및 메타데이터 관리

---

## 레플리카셋 운영 시 고려사항

### 1. 현재 구조의 문제점

#### 1.1 인메모리 데이터 저장소
현재 시스템은 모든 상태를 인메모리에 저장하고 있어 레플리카셋 환경에서 다음과 같은 문제가 발생합니다:

- **RoomDataQueueService**: 각 레플리카가 독립적인 메시지 큐를 가짐
- **RoomManagerService**: 각 레플리카가 독립적인 룸 정보를 가짐
- **MessageCacheService**: 각 레플리카가 독립적인 캐시를 가짐

#### 1.2 소켓 연결 분산 문제
```
클라이언트 A → 레플리카 1 (룸: room-1)
클라이언트 B → 레플리카 2 (룸: room-1)
클라이언트 C → 레플리카 1 (룸: room-1)
```

위와 같은 상황에서:
- 레플리카 1은 클라이언트 A, C의 메시지만 큐에 저장
- 레플리카 2는 클라이언트 B의 메시지만 큐에 저장
- 브로드캐스트 시 각 레플리카가 자신의 큐만 처리
- 결과: 클라이언트 B는 클라이언트 A, C의 메시지를 받지 못함

#### 1.3 메시지 캐시 일관성 문제
- 레플리카 1에서 캐시된 메시지가 레플리카 2에는 없음
- 사용자가 레플리카 2로 연결되면 캐시된 메시지를 받을 수 없음

#### 1.4 룸 정보 불일치
- 각 레플리카가 독립적인 룸 정보를 가짐
- 레플리카 간 룸 목록 및 클라이언트 목록이 일치하지 않음

### 2. 레플리카셋 운영을 위한 요구사항

#### 2.1 공유 메시지 큐
- 모든 레플리카가 동일한 메시지 큐에 접근
- 메시지 중복 처리 방지 (Consumer Group 활용)
- 메시지 순서 보장

#### 2.2 공유 상태 관리
- 룸 정보 공유 (어떤 클라이언트가 어떤 룸에 있는지)
- 메시지 캐시 공유 (레플리카 간 캐시 일관성)
- 활성 룸 목록 공유

#### 2.3 Socket.IO Redis Adapter
- 레플리카 간 Socket.IO 이벤트 브로드캐스트
- 이미 `redis-adapter.config.ts`에 구현됨 (미사용)

#### 2.4 Sticky Session 또는 Redis Adapter
- WebSocket 연결은 Stateful이므로 Sticky Session 필요
- 또는 Redis Adapter를 사용하여 레플리카 간 브로드캐스트

---

## Redis 도입 전략

### 1. Redis 사용 영역

#### 1.1 메시지 큐 (Redis Streams) ✅
- **현재 상태**: `RedisRoomDataQueueService` 구현됨
- **도입 전략**: `RoomDataQueueService`를 `RedisRoomDataQueueService`로 교체
- **장점**:
  - Redis Streams의 Consumer Group을 활용한 메시지 중복 처리 방지
  - 메시지 순서 보장
  - 레플리카 간 공유 큐

#### 1.2 Socket.IO Adapter (Redis Pub/Sub) ✅
- **현재 상태**: `redis-adapter.config.ts` 구현됨
- **도입 전략**: Gateway에 Redis Adapter 적용
- **장점**:
  - 레플리카 간 Socket.IO 이벤트 자동 브로드캐스트
  - Sticky Session 없이도 동작 가능

#### 1.3 메시지 캐시 (Redis Hash/String) ⚠️
- **현재 상태**: 인메모리 Map 사용
- **도입 전략**: Redis Hash 또는 String 구조로 마이그레이션
- **고려사항**:
  - 캐시 읽기/쓰기 성능 (네트워크 지연)
  - TTL 설정 (메모리 관리)
  - 캐시 타입별 저장 전략

#### 1.4 룸 관리 정보 (Redis Hash/Set) ⚠️
- **현재 상태**: 인메모리 Map/Set 사용
- **도입 전략**: Redis Hash/Set으로 마이그레이션
- **고려사항**:
  - 실시간 업데이트 (연결/해제 시)
  - 성능 (자주 조회되는 정보)

### 2. Redis 데이터 구조 설계

#### 2.1 메시지 큐 (Redis Streams)
```
Stream Key: room:{roomId}:queue
Consumer Group: broadcast-group
Consumer: instance-{INSTANCE_ID}
```

**구조**:
```
XADD room:room-1:queue * data {JSON} timestamp {timestamp} clientId {clientId} type {type}
XREADGROUP broadcast-group instance-1 > COUNT 100
XACK room:room-1:queue broadcast-group {message-id}
```

#### 2.2 메시지 캐시 (Redis Hash)
```
Hash Key: cache:room:{roomId}:client:{clientId}:type:{type}
Field: message (JSON 배열 또는 단일 객체)
TTL: 메시지 타입별 설정 (예: 1시간)
```

**또는 Sorted Set 사용** (RECORD_EVERY 모드):
```
Sorted Set Key: cache:room:{roomId}:client:{clientId}:type:{type}
Score: timestamp
Member: JSON(message)
Max Length: 1000
```

#### 2.3 룸 정보 (Redis Hash + Set)
```
Hash Key: room:{roomId}:info
Fields:
  - createdAt: timestamp
  - lastActivity: timestamp

Set Key: room:{roomId}:clients
Members: socketId 리스트

Hash Key: client:{socketId}:room
Field: roomId
```

#### 2.4 활성 룸 목록 (Redis Set)
```
Set Key: rooms:active
Members: roomId 리스트
```

---

## 도입 가능한 기술

### 1. Redis 기능 활용

#### 1.1 Redis Streams
- **용도**: 메시지 큐
- **장점**:
  - Consumer Group으로 중복 처리 방지
  - 메시지 순서 보장
  - 블로킹 읽기 지원
- **단점**:
  - 메모리 사용량 (오래된 메시지 정리 필요)
  - TTL 설정 불가 (수동 정리 필요)

#### 1.2 Redis Pub/Sub
- **용도**: Socket.IO Adapter (레플리카 간 이벤트 브로드캐스트)
- **장점**:
  - 실시간 브로드캐스트
  - Socket.IO 공식 지원
- **단점**:
  - 메시지 유지 불가 (구독자가 없으면 메시지 손실)

#### 1.3 Redis Hash
- **용도**: 메시지 캐시, 룸 정보
- **장점**:
  - 구조화된 데이터 저장
  - 필드별 조회/업데이트
- **단점**:
  - 큰 해시는 성능 저하 (필드 수가 많을 때)

#### 1.4 Redis Sorted Set
- **용도**: 타임스탬프 기반 메시지 캐시 (RECORD_EVERY 모드)
- **장점**:
  - 정렬된 데이터
  - 범위 쿼리 (최근 N개 메시지)
  - Max Length 설정 가능 (오래된 데이터 자동 삭제)
- **단점**:
  - 메모리 사용량 (중복 멤버 불가)

#### 1.5 Redis Set
- **용도**: 룸별 클라이언트 목록, 활성 룸 목록
- **장점**:
  - 중복 제거
  - 집합 연산 (교집합, 합집합 등)
- **단점**:
  - 큰 Set은 성능 저하

### 2. Redis 모듈/기능

#### 2.1 RedisJSON (선택사항)
- **용도**: 복잡한 JSON 데이터 저장
- **장점**:
  - JSON 경로 기반 조회/업데이트
  - 타입 검증
- **단점**:
  - 추가 모듈 설치 필요
  - 모든 Redis 호스팅 서비스에서 지원하지 않음

#### 2.2 Redis Search (선택사항)
- **용도**: 메시지 검색 (필요 시)
- **장점**:
  - 풀텍스트 검색
  - 복잡한 쿼리
- **단점**:
  - 추가 모듈 설치 필요
  - 현재 요구사항과 맞지 않을 수 있음

### 3. Redis 클라이언트 라이브러리

#### 3.1 redis (node-redis) ✅
- **현재 사용**: `redis-room-data-queue.service.ts`에서 사용
- **버전**: v4.x
- **장점**:
  - 최신 Redis 기능 지원
  - TypeScript 지원
  - Promise 기반 API

#### 3.2 ioredis (대안)
- **장점**:
  - 클러스터/센티널 지원
  - 자동 재연결
  - 트랜잭션 지원
- **단점**:
  - 현재 코드베이스와 다른 API

### 4. Socket.IO Redis Adapter

#### 4.1 @socket.io/redis-adapter ✅
- **현재 상태**: `redis-adapter.config.ts`에 구현됨
- **용도**: 레플리카 간 Socket.IO 이벤트 브로드캐스트
- **동작 방식**:
  ```
  레플리카 1: server.to(roomId).emit(...)
    ↓
  Redis Pub/Sub
    ↓
  레플리카 2, 3: 이벤트 수신 후 로컬 클라이언트에게 브로드캐스트
  ```

---

## 구현 전략 및 설계 고민

### 1. 단계별 마이그레이션 전략

#### Phase 1: Socket.IO Redis Adapter 도입 (우선순위: 높음)
- **목표**: 레플리카 간 Socket.IO 이벤트 브로드캐스트
- **작업**:
  1. `meta-veiwers.gateway.ts`에 Redis Adapter 적용
  2. Gateway 초기화 시 `createRedisAdapter()` 호출
  3. 테스트: 레플리카 간 브로드캐스트 확인

**장점**:
- 빠른 구현 (이미 코드 존재)
- 즉시 레플리카 간 통신 가능
- Sticky Session 요구사항 완화

**고민사항**:
- Redis Adapter는 Pub/Sub 기반이므로 메시지 유지 불가
- 각 레플리카는 자신의 클라이언트에게만 직접 브로드캐스트
- 다른 레플리카의 클라이언트는 Redis Adapter를 통해 브로드캐스트

#### Phase 2: 메시지 큐 Redis Streams 전환 (우선순위: 높음)
- **목표**: 공유 메시지 큐로 레플리카 간 메시지 공유
- **작업**:
  1. `RoomDataQueueService`를 `RedisRoomDataQueueService`로 교체
  2. `BroadcastSchedulerService`가 비동기 메서드 사용하도록 수정
  3. Consumer Group 설정 및 관리
  4. 메시지 ACK 처리

**고민사항**:
- **성능**: Redis 네트워크 지연 (12ms 간격 브로드캐스트에 영향)
- **중복 처리**: Consumer Group으로 해결하지만, 여러 레플리카가 동시에 읽을 수 있음
- **메시지 순서**: Stream은 순서 보장, 하지만 여러 Consumer가 처리할 때 순서 보장 필요 여부
- **메모리 관리**: 오래된 메시지 정리 전략 (XTRIM 또는 TTL)

**최적화 방안**:
- 배치 읽기 (COUNT 옵션 활용)
- 비동기 처리 (Promise.all 활용)
- 레디스 연결 풀링
- 로컬 캐시와 Redis 조합 (Hot Path 최적화)

#### Phase 3: 메시지 캐시 Redis 전환 (우선순위: 중간)
- **목표**: 레플리카 간 메시지 캐시 공유
- **작업**:
  1. `MessageCacheService`에 Redis 저장소 추가
  2. 캐시 타입별 저장 전략 구현
  3. TTL 설정 및 관리

**고민사항**:
- **성능**: JOIN_EVENT/LEAVE_EVENT 시 캐시 조회 빈도
- **데이터 구조**: Hash vs Sorted Set vs String (JSON)
- **캐시 전략**: Write-Through vs Write-Back
- **일관성**: 레플리카 간 캐시 일관성 (최종 일관성 vs 강한 일관성)

**제안 구조**:
```
# 단일 메시지 (덮어쓰기 모드)
cache:room:{roomId}:client:{clientId}:type:{type} -> JSON(message)
TTL: 1시간

# 다중 메시지 (RECORD_EVERY 모드)
cache:room:{roomId}:client:{clientId}:type:{type}:messages -> Sorted Set
Score: timestamp
Member: JSON(message)
Max Length: 1000
```

#### Phase 4: 룸 정보 Redis 전환 (우선순위: 낮음)
- **목표**: 레플리카 간 룸 정보 공유
- **작업**:
  1. `RoomManagerService`에 Redis 저장소 추가
  2. 룸 생성/삭제 시 Redis 업데이트
  3. 클라이언트 입장/퇴장 시 Redis 업데이트

**고민사항**:
- **성능**: 룸 정보 조회 빈도 (매 브로드캐스트마다?)
- **일관성**: 실시간 업데이트 필요성
- **복잡도**: 인메모리 + Redis 하이브리드 전략?

**제안 구조**:
```
# 룸 정보
room:{roomId}:info -> Hash
  - createdAt: timestamp
  - lastActivity: timestamp

# 룸별 클라이언트 목록
room:{roomId}:clients -> Set
Members: socketId 리스트

# 클라이언트가 속한 룸
client:{socketId}:room -> String (roomId)
```

### 2. 성능 고려사항

#### 2.1 네트워크 지연
- Redis 호출 시 네트워크 지연 발생 (로컬: ~0.1ms, 원격: ~1-5ms)
- 12ms 간격 브로드캐스트에 영향
- **해결책**:
  - 비동기 처리 (Promise.all)
  - 배치 작업
  - Redis 연결 풀링
  - 로컬 캐시와 조합

#### 2.2 Redis 메모리 관리
- Stream 메시지 누적 방지 (XTRIM)
- 캐시 TTL 설정
- 큰 Hash/Set 성능 저하 방지
- **해결책**:
  - 주기적 정리 작업 (Cron)
  - TTL 적극 활용
  - Max Length 설정 (Sorted Set)

#### 2.3 동시성 처리
- 여러 레플리카가 동시에 큐에서 읽기
- Consumer Group으로 중복 처리 방지
- **고민사항**:
  - 동일 메시지를 여러 레플리카가 처리할 수 있음
  - 하지만 각 레플리카는 자신의 클라이언트에게만 브로드캐스트
  - 실제로는 중복이 아닐 수 있음 (레플리카별 클라이언트가 다름)

### 3. 장애 대응 및 고가용성

#### 3.1 Redis 장애 시나리오
- **Redis 연결 실패**: 메시지 큐에 추가 불가
- **Redis 메모리 부족**: OOM 에러
- **Redis 네트워크 지연**: 브로드캐스트 지연

**대응 방안**:
- Fallback: 로컬 큐로 전환 (일시적)
- Circuit Breaker 패턴
- Redis Sentinel/Cluster 구성 (고가용성)
- 모니터링 및 알림

#### 3.2 데이터 일관성
- 레플리카 간 캐시 불일치 (최종 일관성)
- 메시지 순서 보장 (Stream 사용 시 해결)
- **전략**:
  - 최종 일관성 수용 (실시간 시스템 특성상)
  - 중요 데이터만 강한 일관성 요구
  - 버전 관리 (캐시 버전 체크)

### 4. 모니터링 및 관찰 가능성

#### 4.1 모니터링 지표
- Redis 메모리 사용량
- Stream 길이 (큐 크기)
- Consumer Group 지연 (PENDING 메시지)
- 브로드캐스트 지연 시간
- Redis 연결 상태
- 캐시 Hit/Miss 비율

#### 4.2 로깅
- Redis 작업 로그 (성능 측정)
- 에러 로그 (연결 실패, 타임아웃)
- Consumer Group 상태 로그

### 5. 테스트 전략

#### 5.1 단위 테스트
- Redis Mock 사용 (ioredis-mock 또는 jest-redis)
- 서비스별 독립 테스트

#### 5.2 통합 테스트
- Docker Compose로 Redis 환경 구성
- 레플리카 시뮬레이션 (여러 프로세스)
- 부하 테스트 (메시지 큐 성능)

#### 5.3 스테이징 환경 테스트
- 실제 레플리카셋 환경에서 테스트
- 장애 시나리오 테스트 (Redis 다운)
- 성능 테스트 (지연 시간, 처리량)

---

## 결론 및 권장사항

### 즉시 도입 가능 (Phase 1)
1. **Socket.IO Redis Adapter**: 이미 구현되어 있으므로 즉시 적용 가능
2. **메시지 큐 Redis Streams**: `RedisRoomDataQueueService` 구현되어 있으므로 교체 가능

### 단계별 도입 (Phase 2-4)
1. **메시지 캐시 Redis**: 성능 영향 분석 후 도입
2. **룸 정보 Redis**: 필요성 검토 후 도입

### 고려해야 할 주요 사항
1. **성능**: Redis 네트워크 지연이 12ms 간격 브로드캐스트에 미치는 영향
2. **일관성**: 레플리카 간 데이터 일관성 요구사항 (최종 일관성 vs 강한 일관성)
3. **복잡도**: 인메모리 → Redis 전환 시 코드 복잡도 증가
4. **장애 대응**: Redis 장애 시 Fallback 전략
5. **모니터링**: Redis 상태 및 성능 모니터링 체계 구축

### 추천 아키텍처
```
레플리카 1, 2, 3...
    ↓
Socket.IO Redis Adapter (Pub/Sub)
    ↓
Redis
    ├─ Streams (메시지 큐)
    ├─ Hash (메시지 캐시, 룸 정보)
    └─ Set (룸별 클라이언트 목록)
```

각 레플리카는:
1. 메시지를 Redis Stream에 추가
2. 주기적으로 Stream에서 메시지 읽기 (Consumer Group)
3. 자신의 클라이언트에게 브로드캐스트
4. Redis Adapter를 통해 다른 레플리카의 클라이언트에게도 브로드캐스트

