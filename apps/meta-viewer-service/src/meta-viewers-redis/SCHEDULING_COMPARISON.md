# setInterval vs NestJS Task Scheduling 비교

## 현재 사용 중인 setInterval

1. **30초 간격** - `meta-viewers-redis.service.ts`: 연결 상태 확인 및 정리
2. **60초 간격** - `redis-room.service.ts`: 비활성 클라이언트 정리
3. **12ms 간격** - `redis-broadcast-scheduler.service.ts`: 브로드캐스트 처리

## 비교 분석

### NestJS Task Scheduling (@nestjs/schedule) 장점

✅ **NestJS 생명주기 통합**
- 모듈 초기화/종료 시 자동 관리
- `onModuleInit`, `onModuleDestroy`와 자연스럽게 통합

✅ **데코레이터 기반 선언적 코드**
```typescript
@Cron('*/30 * * * * *') // 30초마다
async cleanupClients() {
  // ...
}
```

✅ **테스트 용이성**
- 스케줄러를 쉽게 모킹/비활성화 가능
- 단위 테스트에서 스케줄러 제어 가능

✅ **에러 핸들링 개선**
- NestJS 예외 필터와 통합
- 에러 발생 시 자동 재시도 가능

✅ **동적 스케줄링**
- 런타임에 스케줄 변경 가능
- 환경 변수 기반 크론 표현식

✅ **크론 표현식 지원**
- 복잡한 스케줄링 패턴 지원
- 시간대 설정 가능

### setInterval 장점

✅ **밀리초 단위 정밀도**
- 12ms 같은 매우 짧은 간격 지원
- 크론 표현식은 초 단위 최소값

✅ **낮은 오버헤드**
- 네이티브 JavaScript API
- 추가 의존성 불필요

✅ **실시간 처리에 적합**
- 게임/실시간 애플리케이션에 적합
- 지연 시간 최소화

## 권장 사항

### ✅ NestJS Task Scheduling 사용 권장

#### 1. 30초 간격 - 클라이언트 정리
```typescript
// meta-viewers-redis.service.ts
@Injectable()
export class MetaViewersRedisService {
  @Cron('*/30 * * * * *') // 30초마다
  async cleanupDisconnectedClients() {
    // ...
  }
}
```

**이유:**
- 충분히 긴 간격 (30초)
- 정리 작업은 정확한 타이밍보다 안정성이 중요
- NestJS 생명주기와 통합되어 관리 용이

#### 2. 60초 간격 - 비활성 클라이언트 정리
```typescript
// redis-room.service.ts
@Injectable()
export class RedisRoomService {
  @Cron('*/60 * * * * *') // 60초마다
  async cleanupInactiveClients() {
    // ...
  }
}
```

**이유:**
- 충분히 긴 간격 (60초)
- 정리 작업은 정확한 타이밍보다 안정성이 중요
- 에러 핸들링이 더 나음

### ⚠️ setInterval 유지 권장

#### 3. 12ms 간격 - 브로드캐스트 스케줄러
```typescript
// redis-broadcast-scheduler.service.ts
// setInterval 유지
this.broadcastInterval = setInterval(() => {
  // ...
}, 12); // 12ms
```

**이유:**
- **매우 짧은 간격**: 크론 표현식은 초 단위 최소값 (1초)
- **실시간 처리 필요**: 게임/실시간 애플리케이션은 지연 시간이 중요
- **성능**: 추가 레이어 없이 직접 실행
- **정밀도**: 밀리초 단위 정확한 타이밍 필요

## 마이그레이션 가이드

### 1. 패키지 설치

```bash
pnpm add @nestjs/schedule
```

### 2. 모듈에 ScheduleModule 추가

```typescript
// meta-viewers-redis.module.ts
import { ScheduleModule } from '@nestjs/schedule';

@Module({
  imports: [
    ScheduleModule.forRoot(), // 전역 모듈
    // ...
  ],
  // ...
})
export class MetaViewersRedisModule {}
```

### 3. 서비스에 데코레이터 추가

```typescript
// meta-viewers-redis.service.ts
import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';

@Injectable()
export class MetaViewersRedisService {
  private server: Server | null = null;

  afterInit(server: Server) {
    this.server = server;
    // setInterval 제거, @Cron 데코레이터 사용
  }

  @Cron('*/30 * * * * *') // 30초마다
  async cleanupDisconnectedClients() {
    if (!this.server) return;
    
    let cleanedCount = 0;
    for (const [clientId, client] of this.connectedClients.entries()) {
      const socket = this.server.sockets.sockets.get(clientId);
      if (!socket || !socket.connected || !client.connected) {
        this.connectedClients.delete(clientId);
        cleanedCount++;
      }
    }
    if (cleanedCount > 0) {
      this.logger.log(
        `[Meta Viewers Redis] Cleaned up ${cleanedCount} disconnected clients`,
      );
    }
  }

  // cleanupInterval 변수 및 clearInterval 제거
  // onModuleDestroy에서도 clearInterval 제거
}
```

```typescript
// redis-room.service.ts
import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';

@Injectable()
export class RedisRoomService {
  @Cron('*/60 * * * * *') // 60초마다
  async cleanupInactiveClients() {
    // 기존 cleanupInactiveClients 로직
  }

  // onModuleInit에서 setInterval 제거
  // cleanupInterval 변수 및 clearInterval 제거
  // onModuleDestroy에서도 clearInterval 제거
}
```

## 최종 권장 사항

| 작업 | 간격 | 권장 방법 | 이유 |
|------|------|----------|------|
| 클라이언트 정리 | 30초 | ✅ NestJS Schedule | 충분히 긴 간격, 안정성 중요 |
| 비활성 클라이언트 정리 | 60초 | ✅ NestJS Schedule | 충분히 긴 간격, 안정성 중요 |
| 브로드캐스트 스케줄러 | 12ms | ⚠️ setInterval 유지 | 매우 짧은 간격, 실시간 처리 필요 |

## 결론

**30초, 60초 간격 작업은 NestJS Task Scheduling으로 마이그레이션 권장**
- NestJS 생명주기와 통합
- 테스트 용이성
- 에러 핸들링 개선
- 코드 가독성 향상

**12ms 간격 브로드캐스트는 setInterval 유지**
- 크론 표현식은 초 단위 최소값
- 실시간 처리에 적합
- 성능 오버헤드 최소화
