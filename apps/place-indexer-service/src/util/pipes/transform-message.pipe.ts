import { PipeTransform, Injectable, Logger } from '@nestjs/common';
import { ClassConstructor, plainToInstance } from 'class-transformer';
import { extractEntityFields } from 'src/elasticsearch/libs';

/**
 * 범용 Transform 파이프
 * ValidationPipe가 @Transform 데코레이터를 제대로 처리하지 않을 수 있으므로
 * plainToInstance를 직접 호출하여 @Transform 데코레이터를 적용
 *
 * 사용 예시:
 * ```typescript
 * @Payload(new TransformMessagePipe(CafeInfo))
 * ```
 */
@Injectable()
export class TransformMessagePipe<T extends Record<string, any>>
  implements PipeTransform
{
  private readonly logger = new Logger(TransformMessagePipe.name);

  constructor(private readonly classType: ClassConstructor<T>) {}

  transform(value: unknown): T | null {
    if (value == null) {
      return null;
    }

    try {
      // plainToInstance를 직접 호출하여 @Transform 데코레이터를 적용
      // excludeExtraneousValues: false로 설정하여 Kafka 메타데이터 필드를 허용
      const transformed = plainToInstance(this.classType, value, {
        enableImplicitConversion: true,
        excludeExtraneousValues: false, // Kafka 메타데이터 필드를 허용
      });

      return extractEntityFields(transformed);
    } catch (error) {
      this.logger.error(
        `Transform failed: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack : undefined,
      );
      this.logger.error(`Failed value: ${JSON.stringify(value)}`);
      throw error;
    }
  }
}
