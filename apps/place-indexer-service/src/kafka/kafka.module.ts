import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HttpModule } from '@nestjs/axios';
import { KafkaEventHandler } from './kafka.handler';
import { CafeInfoChangeProcessor } from './processor';
import { RegionCategoriesService } from 'src/regionCategories/region-cagetories.service';

/**
 * KafkaModule
 *
 * 주의: 이 모듈은 Kafka Consumer만 처리합니다.
 * - Consumer 설정은 main.ts의 connectMicroservice()에서 처리됩니다
 * - @EventPattern 데코레이터가 작동하려면 main.ts에서 connectMicroservice()가 필요합니다
 *
 * 만약 나중에 Kafka Producer가 필요하다면:
 * - ClientsModule.registerAsync()를 다시 추가하고
 * - ClientKafka를 주입받아 메시지를 보낼 수 있습니다
 */
@Global() // 다른 모듈에서 별도 export 없이 바로 사용 가능
@Module({
  imports: [
    ConfigModule, // ConfigService 사용을 위해 임포트
    HttpModule, // RegionCategoriesService에서 HttpService 사용
  ],
  controllers: [
    KafkaEventHandler, // @Controller() 데코레이터가 있는 클래스는 controllers에 등록해야 함
  ],
  providers: [CafeInfoChangeProcessor, RegionCategoriesService],
  // Consumer는 main.ts의 connectMicroservice()로 처리되므로
  // ClientsModule은 필요 없습니다 (Producer가 필요할 때만 추가)
})
export class KafkaModule {}
