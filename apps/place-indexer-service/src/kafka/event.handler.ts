// apps/search-indexer-service/src/kafka/event.handler.ts
import { Controller, Logger } from '@nestjs/common';
import {
  EventPattern,
  KafkaContext,
  Payload,
  Ctx,
} from '@nestjs/microservices';
import { CafeInfoChangeProcessor } from './processor';
import { DebeziumUtil } from '../common/debezium.util'; // Debezium Envelope 해제 유틸
import { CAFEINFO_DEBEZIUM_TOPIC } from 'src/util/types';
import { ICafeInfo } from 'src/util/dtos';

@Controller()
export class KafkaEventHandler {
  private readonly logger = new Logger(KafkaEventHandler.name);

  constructor(
    private readonly cafeInfoChangeProcessor: CafeInfoChangeProcessor,
  ) {}

  @EventPattern(CAFEINFO_DEBEZIUM_TOPIC)
  async handleCafeInfoChange(
    @Payload()
    message: {
      value: { payload: unknown };
    }, // Debezium 이벤트 메시지 (Envelope 포함)
    @Ctx() context: KafkaContext,
  ) {
    const originalMessage = message.value;
    const { op, after, before } =
      DebeziumUtil.unwrap<ICafeInfo>(originalMessage); // Debezium Envelope 해제
    const topic = context.getTopic();

    this.logger.debug(`Received message from topic ${topic}, operation: ${op}`);

    try {
      if (op === 'c' || op === 'u') {
        // Create or Update
        if (after) {
          // 'after' 필드에 실제 변경된 데이터가 있음
          await this.cafeInfoChangeProcessor.processCafeInfoUpsert(after);
        }
      } else if (op === 'd') {
        // Delete
        if (before) {
          // 'before' 필드에 삭제된 데이터의 정보가 있음
          await this.cafeInfoChangeProcessor.processCafeInfoDelete(before);
        }
      }
      // TODO: offset 커밋 로직 (NestJS Kafka microservice는 기본적으로 Auto-commit)
    } catch (error: unknown) {
      this.logger.error(
        `Error processing cafe info change event: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error.stack : undefined,
      );
      // TODO: 에러 발생 시 재처리 큐(DLQ: Dead Letter Queue) 또는 경고 로직 구현
      throw error; // Re-throw for Kafka to handle retries if configured
    }
  }

  // 다른 CDC 토픽 (예: user 테이블 변경) 또는 다른 비동기 이벤트도 @EventPattern으로 핸들링 가능
  // @EventPattern('dbserver1.public.users')
  // async handleUserChange(@Payload() message: any, @Ctx() context: KafkaContext) { /* ... */ }
}
