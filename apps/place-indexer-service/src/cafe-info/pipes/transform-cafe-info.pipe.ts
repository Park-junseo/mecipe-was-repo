import { PipeTransform, Injectable, Logger } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { CafeInfo } from '../entity/cafe-info.entity';

/**
 * CafeInfo를 위한 커스텀 Transform 파이프
 * ValidationPipe가 @Transform 데코레이터를 제대로 처리하지 않을 수 있으므로
 * plainToInstance를 직접 호출하여 @Transform 데코레이터를 적용
 */
@Injectable()
export class TransformCafeInfoPipe implements PipeTransform {
  private readonly logger = new Logger(TransformCafeInfoPipe.name);

  transform(value: unknown): CafeInfo | null {
    if (value == null) {
      return null;
    }

    try {
      // plainToInstance를 직접 호출하여 @Transform 데코레이터를 적용
      // excludeExtraneousValues: false로 설정하여 Kafka 메타데이터 필드를 허용
      const transformed = plainToInstance(CafeInfo, value, {
        enableImplicitConversion: true,
        excludeExtraneousValues: false, // Kafka 메타데이터 필드를 허용
      });

      return transformed;
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
