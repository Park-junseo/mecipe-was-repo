import { Module, OnModuleInit, Global } from '@nestjs/common';
import { ClientsModule, ClientKafka } from '@nestjs/microservices';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { KafkaEventHandler } from './event.handler';
import { CafeInfoChangeProcessor } from './processor';
import { getKafkaConfig } from './kafka.config';

export const KAFKA_CLIENT_TOKEN = 'PLACE_SEARCH_INDEXER_KAFKA'; // 이 토큰으로 Kafka 클라이언트를 주입받을 수 있음

@Global() // 다른 모듈에서 별도 export 없이 바로 ClientKafka 주입 가능
@Module({
  imports: [
    ClientsModule.registerAsync([
      {
        name: KAFKA_CLIENT_TOKEN, // Kafka 클라이언트의 고유한 이름
        imports: [ConfigModule],
        useFactory: (configService: ConfigService) =>
          getKafkaConfig(configService),
        inject: [ConfigService],
      },
    ]),
    ConfigModule, // ConfigService 사용을 위해 임포트
  ],
  providers: [KafkaEventHandler, CafeInfoChangeProcessor],
  exports: [KAFKA_CLIENT_TOKEN], // ClientKafka 인스턴스를 다른 모듈에서 사용 가능하게 export
})
export class KafkaModule implements OnModuleInit {
  constructor(private readonly kafkaClient: ClientKafka) {}

  async onModuleInit() {
    // 앱 시작 시 Kafka 브로커에 연결
    // 필요에 따라 subscribeBy와 같은 메서드로 토픽을 등록할 수 있음.
    // 하지만 @EventPattern 데코레이터가 내부적으로 구독을 처리하므로 명시적으로 필요 없을 수 있음.
    //await this.kafkaClient.connect(); // 마이크로서비스 설정에서 자동으로 연결되는 경우가 많음
  }
}
