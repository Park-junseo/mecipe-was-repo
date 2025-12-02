import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ElasticsearchService } from 'src/elasticsearch';
import { IndexDocument } from 'src/elasticsearch/libs';
import { CAFEINFO_INDEX_NAME } from 'src/elasticsearch/libs/indices';
import { ICafeInfo } from './entity';

@Injectable()
export class CafeInfoService implements OnModuleInit {
  private readonly logger = new Logger(CafeInfoService.name);
  constructor(private readonly elasticSearchService: ElasticsearchService) {}
  async onModuleInit() {
    await this.elasticSearchService.createIndexIfNotExist(CAFEINFO_INDEX_NAME);
  }

  indexCafeInfo(cafeInfo: ICafeInfo, id: string) {
    this.logger.log(`indexCafeInfo: ${JSON.stringify(cafeInfo)}`);
    return this.elasticSearchService.indexDocument(
      CAFEINFO_INDEX_NAME,
      cafeInfo as unknown as IndexDocument<CAFEINFO_INDEX_NAME>,
      id,
    );
  }

  deleteCafeInfo(id: string) {
    this.logger.log(`deleteCafeInfo: ${id}`);
    return this.elasticSearchService.deleteDocument(CAFEINFO_INDEX_NAME, id);
  }
}
