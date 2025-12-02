// apps/search-indexer-service/src/kafka/kafka.config.ts
import { KafkaOptions, Transport } from '@nestjs/microservices';
import { KAFKA_BROKERS, KAFKA_CLIENT_ID, KAFKA_GROUP_ID } from '../util/config';
import { ConfigService } from '@nestjs/config';

export const getKafkaConfig = (configService: ConfigService): KafkaOptions => ({
  transport: Transport.KAFKA,
  options: {
    client: {
      clientId: KAFKA_CLIENT_ID(configService),
      brokers: KAFKA_BROKERS(configService),
    },
    consumer: {
      groupId: KAFKA_GROUP_ID(configService),
      allowAutoTopicCreation: true, // 개발 환경에서 편리
    },
  },
});
