import { Controller, Logger } from '@nestjs/common';
import { CafeInfoService } from './cafe-info.service';
import {
  Ctx,
  EventPattern,
  KafkaContext,
  Payload,
} from '@nestjs/microservices';
import { CafeInfo } from './entity/cafe-info.entity';
import { CAFEINFO_WITH_REGIONCATEGORY_TOPIC } from 'src/kafka/topics';
import { TransformMessagePipe } from 'src/util/pipes/transform-message.pipe';

@Controller()
export class CafeInfoController {
  private readonly logger = new Logger(CafeInfoController.name);

  constructor(private readonly cafeInfoService: CafeInfoService) {}

  @EventPattern(CAFEINFO_WITH_REGIONCATEGORY_TOPIC)
  async handleCafeInfoIndexed(
    @Payload(new TransformMessagePipe(CafeInfo)) payload: CafeInfo | null,
    @Ctx() context: KafkaContext,
  ) {
    const originalMessage = context.getMessage(); // 오리지널 Kafka 메시지 객체

    // KafkaMessage 구조: { key, value, headers, partition, offset, timestamp, topic }
    const docId = originalMessage.key?.toString(); // Kafka Key를 Elasticsearch _id로 사용 (STRING 타입이라고 가정)

    if (!docId) {
      throw new Error('Kafka key is required');
    }

    if (payload == null) {
      await this.cafeInfoService.deleteCafeInfo(docId);
    } else {
      await this.cafeInfoService.indexCafeInfo(payload, docId);
    }
  }
}
