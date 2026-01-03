import { Injectable, Logger, Inject } from '@nestjs/common';
import { ClientKafka } from '@nestjs/microservices';
import {
  CafeInfoCreatedEvent,
  CafeInfoUpdatedEvent,
  CafeInfoDeletedEvent,
  KAFKA_TOPICS,
} from '@virtualcafe/common';

/**
 * Kafka Producer for CafeInfo events
 * Publishes events when CafeInfo is created, updated, or deleted
 */
@Injectable()
export class CafeInfoProducer {
  private readonly logger = new Logger(CafeInfoProducer.name);

  constructor(
    @Inject('KAFKA_SERVICE') private readonly kafkaClient: ClientKafka,
  ) {}

  async publishCafeInfoCreated(event: CafeInfoCreatedEvent) {
    try {
      await this.kafkaClient.emit(KAFKA_TOPICS.CAFE_INFO_CREATED, event);
      this.logger.log(`Published CafeInfo created event: ${event.id}`);
    } catch (error) {
      this.logger.error(
        `Failed to publish CafeInfo created event: ${event.id}`,
        error,
      );
      throw error;
    }
  }

  async publishCafeInfoUpdated(event: CafeInfoUpdatedEvent) {
    try {
      await this.kafkaClient.emit(KAFKA_TOPICS.CAFE_INFO_UPDATED, event);
      this.logger.log(`Published CafeInfo updated event: ${event.id}`);
    } catch (error) {
      this.logger.error(
        `Failed to publish CafeInfo updated event: ${event.id}`,
        error,
      );
      throw error;
    }
  }

  async publishCafeInfoDeleted(event: CafeInfoDeletedEvent) {
    try {
      await this.kafkaClient.emit(KAFKA_TOPICS.CAFE_INFO_DELETED, event);
      this.logger.log(`Published CafeInfo deleted event: ${event.id}`);
    } catch (error) {
      this.logger.error(
        `Failed to publish CafeInfo deleted event: ${event.id}`,
        error,
      );
      throw error;
    }
  }
}





