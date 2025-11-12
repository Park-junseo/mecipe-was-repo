import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { KAFKA_BROKERS, KAFKA_CLIENT_ID, KAFKA_GROUP_ID } from './util/types';
import { ConfigService } from '@nestjs/config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  // Kafka 마이크로서비스 설정
  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.KAFKA,
    options: {
      client: {
        brokers: KAFKA_BROKERS(configService),
        clientId: KAFKA_CLIENT_ID(configService),
      },
      consumer: {
        groupId: KAFKA_GROUP_ID(configService),
        allowAutoTopicCreation: true, // 개발 환경에서 편리
      },
    },
  });

  await app.startAllMicroservices(); // 마이크로서비스 시작 (Kafka 컨슈밍 시작)
  await app.listen(3002); // HTTP 엔드포인트도 필요하다면 (health check 등)
  console.log(`Search Indexer Service is running on: ${await app.getUrl()}`);
}
bootstrap();
