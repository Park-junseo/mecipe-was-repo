import { ConfigService } from '@nestjs/config';

export const KAFKA_GROUP_ID = (configService: ConfigService) => {
  return configService.get<string>('KAFKA_GROUP_ID') || 'place-indexer-service';
};
export const KAFKA_BROKERS = (configService: ConfigService) => {
  const brokers = configService.get<string>('KAFKA_BROKERS');
  if (!brokers) {
    return ['localhost:9092'];
  }
  // PLAINTEXT:// 프리픽스 제거 (예: PLAINTEXT://localhost:9092 -> localhost:9092)
  return brokers
    .split(',')
    .map((broker) => broker.trim().replace(/^PLAINTEXT:\/\//, ''));
};
export const KAFKA_CLIENT_ID = (configService: ConfigService) => {
  return configService.get<string>('KAFKA_CLIENT_ID') || 'place-indexer-client';
};
export const CAFEINFO_DEBEZIUM_TOPIC = 'dbserver.public.CafeInfo';
export const REGION_CATEGORIES_BASE_URL = (configService: ConfigService) => {
  return (
    configService.get<string>('REGION_CATEGORIES_BASE_URL') ||
    'http://localhost:4000/regioncategories'
  );
};
export const ELASTICSEARCH_HOSTS = (configService: ConfigService) => {
  return (
    configService.get<string>('ELASTICSEARCH_HOSTS') || 'http://localhost:9200'
  );
};
export const ELASTICSEARCH_USERNAME = (configService: ConfigService) => {
  return configService.get<string>('ELASTICSEARCH_USERNAME') || '';
};
export const ELASTICSEARCH_PASSWORD = (configService: ConfigService) => {
  return configService.get<string>('ELASTICSEARCH_PASSWORD') || '';
};
