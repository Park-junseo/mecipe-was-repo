// apps/place-indexer-service/src/elasticSearch/elasticsearch.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { IndexType, INDEX_TYPE_MAP, IndexDocument } from './libs';
import { ElasticsearchService as ESService } from '@nestjs/elasticsearch';

@Injectable()
export class ElasticsearchService {
  private readonly logger: Logger = new Logger(ElasticsearchService.name);
  constructor(private readonly elasticsearchService: ESService) {}

  async createIndexIfNotExist(indexName: IndexType) {
    const exists = await this.elasticsearchService.indices.exists({
      index: indexName,
    });
    if (!exists) {
      await this.elasticsearchService.indices.create({
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
    try {
      const result = await this.elasticsearchService.index({
        index,
        id,
        document,
      });
      this.logger.debug(
        `Document indexed successfully: index=${index}, id=${id}, result=${JSON.stringify(result)}`,
      );
      return result;
    } catch (error) {
      this.logger.error(
        `Failed to index document: index=${index}, id=${id}, error=${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }
  }

  async deleteDocument(index: IndexType, id: string) {
    return this.elasticsearchService.delete({
      index,
      id,
    });
  }
}
