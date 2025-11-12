// apps/place-indexer-service/src/elasticSearch/elasticsearch.service.ts
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Client } from '@elastic/elasticsearch';
import { ELASTICSEARCH_HOSTS } from 'src/util/types';
import {
  CAFEINFO_INDEX_NAME,
  IndexType,
  INDEX_TYPE_MAP,
  IndexDocument,
} from './libs';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class ElasticsearchService implements OnModuleInit {
  private readonly logger = new Logger(ElasticsearchService.name);
  private esClient: Client;

  constructor(private readonly configService: ConfigService) {
    try {
      this.esClient = new Client({
        node: ELASTICSEARCH_HOSTS(this.configService),
        // auth: {
        //   username: process.env.ELASTICSEARCH_USERNAME || '',
        //   password: process.env.ELASTICSEARCH_PASSWORD || '',
        // },
      });
    } catch (error) {
      this.logger.error('Failed to connect to Elasticsearch', error);
      throw error;
    }
  }

  async onModuleInit() {
    // 앱 시작 시 인덱스가 존재하는지 확인하고 없으면 생성
    await this.createIndexIfNotExist(CAFEINFO_INDEX_NAME);
  }

  async createIndexIfNotExist(indexName: IndexType) {
    const exists = await this.esClient.indices.exists({ index: indexName });
    if (!exists) {
      await this.esClient.indices.create({
        index: indexName,
        mappings: INDEX_TYPE_MAP[indexName],
      });
      this.logger.log(`Elasticsearch index '${indexName}' created.`);
    } else {
      this.logger.log(`Elasticsearch index '${indexName}' already exists.`);
    }
  }

  async indexDocument<TIndexType extends IndexType>(
    index: TIndexType,
    document: IndexDocument<TIndexType>,
    id?: string,
  ) {
    return this.esClient.index({
      index,
      id,
      document,
    });
  }

  async deleteDocument(index: IndexType, id: string) {
    return this.esClient.delete({
      index,
      id,
    });
  }
}
