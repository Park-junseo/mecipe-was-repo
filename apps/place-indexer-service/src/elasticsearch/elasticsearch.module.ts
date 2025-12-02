import { Module, Global } from '@nestjs/common';
import { ElasticsearchService } from './elasticsearch.service';
import { ElasticsearchModule as ESModule } from '@nestjs/elasticsearch';
import { ConfigModule, ConfigService } from '@nestjs/config';
import {
  ELASTICSEARCH_HOSTS,
  ELASTICSEARCH_PASSWORD,
  ELASTICSEARCH_USERNAME,
} from 'src/util/config';

@Global() // 다른 모듈에서 별도 export 없이 바로 ElasticsearchService 주입 가능
@Module({
  imports: [
    ESModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        node: ELASTICSEARCH_HOSTS(configService),
        auth: {
          username: ELASTICSEARCH_USERNAME(configService),
          password: ELASTICSEARCH_PASSWORD(configService),
        },
        // headers: {
        //   Accept: 'application/vnd.elasticsearch+json; compatible-with=8',
        //   'Content-Type':
        //     'application/vnd.elasticsearch+json; compatible-with=8',
        // },
        // enableMetaHeader: true,
      }),
      inject: [ConfigService],
    }),
  ], // ConfigService 사용을 위해 임포트
  providers: [ElasticsearchService],
  exports: [ElasticsearchService], // ElasticsearchService를 다른 모듈에서 사용 가능하게 export
})
export class ElasticsearchModule {}
