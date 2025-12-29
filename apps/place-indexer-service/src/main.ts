import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { KAFKA_BROKERS, KAFKA_CLIENT_ID, KAFKA_GROUP_ID } from './util/config';
import { ConfigService } from '@nestjs/config';

async function bootstrap() {
  try {
    const app = await NestFactory.create(AppModule);
    const configService = app.get(ConfigService);

    // Kafka 브로커 주소 확인
    const brokers = KAFKA_BROKERS(configService);
    const rawBrokersEnv = configService.get<string>('KAFKA_BROKERS');

    console.log(`Raw KAFKA_BROKERS env: ${rawBrokersEnv || 'NOT SET'}`);
    console.log(`Parsed KAFKA_BROKERS: ${JSON.stringify(brokers)}`);

    if (!brokers || brokers.length === 0) {
      throw new Error(
        'KAFKA_BROKERS environment variable is not set or invalid. Please set KAFKA_BROKERS (e.g., "localhost:9092")',
      );
    }

    // Kafka 마이크로서비스 설정
    // @EventPattern 데코레이터가 작동하려면 connectMicroservice가 필요합니다
    app.connectMicroservice<MicroserviceOptions>({
      transport: Transport.KAFKA,
      options: {
        client: {
          brokers: brokers,
          clientId: KAFKA_CLIENT_ID(configService),
          // 연결 타임아웃 및 재시도 설정 (Docker 환경 고려하여 증가)
          connectionTimeout: 30000, // 30초 (기본값: 1000ms) - Docker 환경에서 브로커 준비 시간 고려
          requestTimeout: 30000, // 30초 (기본값: 30000ms)
          retry: {
            retries: 8,
            initialRetryTime: 100,
            multiplier: 2,
            maxRetryTime: 30000,
          },
        },
        consumer: {
          groupId: KAFKA_GROUP_ID(configService),
          allowAutoTopicCreation: true, // 개발 환경에서 편리
          sessionTimeout: 30000, // 30초
          heartbeatInterval: 3000, // 3초
        },
        // subscribe 옵션: consumer group offset이 없을 때 토픽의 처음부터 읽기
        // 참고: 이미 consumer group offset이 있으면 무시되고 기존 offset부터 읽습니다
        subscribe: {
          fromBeginning: true, // offset이 없을 때 earliest부터 읽기 (기본값: false = latest)
        },
      },
    });

    // Kafka 마이크로서비스 시작 (에러 핸들링 추가)
    try {
      await app.startAllMicroservices();
      console.log(`Kafka consumer connected to brokers: ${brokers.join(', ')}`);
      console.log(`Kafka consumer group ID: ${KAFKA_GROUP_ID(configService)}`);
      console.log(`Kafka client ID: ${KAFKA_CLIENT_ID(configService)}`);
    } catch (error) {
      console.error('Failed to start Kafka microservice:', error);
      throw new Error(
        `Kafka connection failed. Please check if Kafka brokers are running and accessible at: ${brokers.join(', ')}. Error: ${error.message}`,
      );
    }

    const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
    await app.listen(port); // HTTP 엔드포인트도 필요하다면 (health check 등)
    console.log(`Search Indexer Service is running on: ${await app.getUrl()}`);
  } catch (error) {
    console.error('Failed to start application:', error);
    process.exit(1);
  }
}
void bootstrap();
