import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { MetaViewersRedisService } from './meta-viewers-redis.service';
import { MetaViewersRedisGateway } from './meta-viewers-redis.gateway';
import { RedisBroadcastSchedulerService } from './services/redis-broadcast-scheduler.service';
import { RedisRoomService } from './services/redis-room.service';
import { RedisQueueService } from './services/redis-queue.service';
import { RedisCacheService } from './services/redis-cache.service';

/**
 * Redis 기반 Meta Viewers 모듈
 * 레플리카셋 환경에서 일관된 소켓 통신 제공
 */
@Module({
  imports: [ScheduleModule.forRoot()],
  providers: [
    MetaViewersRedisGateway,
    MetaViewersRedisService,
    RedisRoomService,
    RedisQueueService,
    RedisBroadcastSchedulerService,
    RedisCacheService,
  ],
  exports: [MetaViewersRedisService],
})
export class MetaViewersRedisModule {}


