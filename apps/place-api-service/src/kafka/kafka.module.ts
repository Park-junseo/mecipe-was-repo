import { Module } from '@nestjs/common';
import { CafeInfoProducer } from './cafe-info.producer';
import { KafkaModule as CommonKafkaModule } from '@virtualcafe/common';

/**
 * Kafka module for publishing events to other services
 */
@Module({
  imports: [
    CommonKafkaModule.forRoot({
      brokers: process.env.KAFKA_BROKERS?.split(',') || ['localhost:9092'],
      clientId: 'place-api-service',
      groupId: 'place-api-service-group',
    }),
  ],
  providers: [CafeInfoProducer],
  exports: [CafeInfoProducer],
})
export class KafkaProducerModule {}





