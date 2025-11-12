import { ConfigService } from '@nestjs/config';

export const KAFKA_GROUP_ID = (configService: ConfigService) => {
  return configService.get<string>('KAFKA_GROUP_ID') || 'place-indexer-service';
};
export const KAFKA_BROKERS = (configService: ConfigService) => {
  return configService.get<string>('KAFKA_BROKERS')?.split(',') || [];
};
export const KAFKA_CLIENT_ID = (configService: ConfigService) => {
  return configService.get<string>('KAFKA_CLIENT_ID') || 'place-indexer-client';
};
export const CAFEINFO_DEBEZIUM_TOPIC = 'dbserver.public.cafe_infos';
export const REGION_CATEGORIES_BASE_URL = (configService: ConfigService) => {
  return configService.get<string>('REGION_CATEGORIES_BASE_URL') || '';
};
export const ELASTICSEARCH_HOSTS = (configService: ConfigService) => {
  return (
    configService.get<string>('ELASTICSEARCH_HOSTS') || 'http://localhost:9200'
  );
};
