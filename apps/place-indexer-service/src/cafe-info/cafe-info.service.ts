import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ElasticsearchService } from '../elasticsearch';
import { IndexDocument } from '../elasticsearch/libs/utils';
import { CAFEINFO_INDEX_NAME } from '../elasticsearch/libs/indices';
import { ICafeInfo } from './entity';

@Injectable()
export class CafeInfoService implements OnModuleInit {
  private readonly logger = new Logger(CafeInfoService.name);
  constructor(private readonly elasticSearchService: ElasticsearchService) {}
  async onModuleInit() {
    console.log('onModuleInit: CafeInfoService', CAFEINFO_INDEX_NAME);
    try {
      await this.elasticSearchService.createIndexIfNotExist(CAFEINFO_INDEX_NAME);
    } catch (error) {
      console.error('onModuleInit: CafeInfoService', error);
      throw error;
    }
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
