import { Module } from '@nestjs/common';
import { MetaVeiwersService } from './meta-veiwers.service';
import { MetaVeiwersGateway } from './meta-veiwers.gateway';
import { BroadcastSchedulerService } from './services/broadcast-scheduler.service';
import { RoomManagerService } from './services/room-manager.service';
import { RoomDataQueueService } from './services/room-data-queue.service';
import SocketLogger from './utils/socket-logger';
import { MessageCacheService } from './services/message-cache.service';

@Module({
  providers: [
    MetaVeiwersGateway, 
    MetaVeiwersService, 
    RoomManagerService, 
    RoomDataQueueService,
    BroadcastSchedulerService,
    SocketLogger,
    MessageCacheService,
  ]
})
export class MetaVeiwersModule {}
