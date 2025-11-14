// apps/search-indexer-service/src/kafka/event.handler.ts
import { Controller, Logger, OnModuleInit } from '@nestjs/common';
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
export class KafkaEventHandler implements OnModuleInit {
  private readonly logger = new Logger(KafkaEventHandler.name);

  constructor(
    private readonly cafeInfoChangeProcessor: CafeInfoChangeProcessor,
  ) {}

  onModuleInit() {
    console.log('KafkaEventHandler initialized');
  }

  @EventPattern(CAFEINFO_DEBEZIUM_TOPIC)
  async handleCafeInfoChange(
    @Payload()
    message: unknown, // Debezium 이벤트 메시지 (Envelope 포함)
    @Ctx() context: KafkaContext,
  ) {
    const { op, after, before } = DebeziumUtil.unwrap<ICafeInfo>(message); // Debezium Envelope 해제
    const topic = context.getTopic();

    this.logger.debug(`Received message from topic ${topic}, operation: ${op}`);

    try {
      if (op === 'c' || op === 'u' || op === 'r') {
        // Create, Update, or Read (snapshot)
        // 'r' (read)는 초기 스냅샷 데이터를 의미합니다
        if (after) {
          // 'after' 필드에 실제 변경된 데이터가 있음
          // createdAt이 정수 타임스탬프(밀리초)로 오는 경우 Date로 변환
          const normalizedAfter = this.normalizeCafeInfo(after);
          await this.cafeInfoChangeProcessor.processCafeInfoUpsert(
            normalizedAfter,
          );
        }
      } else if (op === 'd') {
        // Delete
        if (before) {
          // 'before' 필드에 삭제된 데이터의 정보가 있음
          // createdAt이 정수 타임스탬프(밀리초)로 오는 경우 Date로 변환
          const normalizedBefore = this.normalizeCafeInfo(before);
          await this.cafeInfoChangeProcessor.processCafeInfoDelete(
            normalizedBefore,
          );
        }
      } else if (op === null) {
        // Debezium heartbeat 또는 다른 구조의 메시지 (무시)
        this.logger.debug(
          `Skipping message with null operation from topic ${topic}: ${JSON.stringify(message)}`,
        );
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

  /**
   * Debezium에서 받은 데이터를 정규화
   * - createdAt이 정수 타임스탬프(밀리초)인 경우 Date 객체로 변환
   */
  private normalizeCafeInfo(cafeInfo: ICafeInfo): ICafeInfo {
    if (cafeInfo.createdAt && typeof cafeInfo.createdAt === 'number') {
      // 정수 타임스탬프를 Date 객체로 변환
      return {
        ...cafeInfo,
        createdAt: new Date(cafeInfo.createdAt),
      };
    }
    // 이미 Date 객체이거나 다른 형식인 경우 그대로 반환
    return cafeInfo;
  }

  // 다른 CDC 토픽 (예: user 테이블 변경) 또는 다른 비동기 이벤트도 @EventPattern으로 핸들링 가능
  // @EventPattern('dbserver1.public.users')
  // async handleUserChange(@Payload() message: any, @Ctx() context: KafkaContext) { /* ... */ }
}
