// apps/place-indexer-service/src/kafka/place-change.processor.ts
import { Injectable, Logger } from '@nestjs/common';
import { ElasticsearchService } from '../../elasticsearch/elasticsearch.service';
import { CAFEINFO_INDEX_NAME, IndexDocument } from '../../elasticsearch/libs';
import { RegionCategoriesService } from 'src/regionCategories/region-cagetories.service';
import { ICafeInfo } from 'src/util/dtos';

@Injectable()
export class CafeInfoChangeProcessor {
  private readonly logger = new Logger(CafeInfoChangeProcessor.name);

  constructor(
    private readonly elasticsearchService: ElasticsearchService,
    private readonly regionCategoriesService: RegionCategoriesService,
  ) {}

  async processCafeInfoUpsert(cafeInfoData: ICafeInfo) {
    this.logger.log(`Processing upsert for CafeInfo ID: ${cafeInfoData.id}`);

    // 1. RegionCategory 데이터 조회 (JOIN 역할)
    // regionsService는 다른 마이크로서비스(region-service)의 API를 호출하거나
    // region_categories_index 같은 Elasticsearch 보조 인덱스에서 조회할 수 있음.
    const regionCategory =
      await this.regionCategoriesService.getRegionCategoryById(
        cafeInfoData.regionCategoryId,
      );

    if (!regionCategory) {
      this.logger.error(
        `RegionCategory not found for CafeInfo ID: ${cafeInfoData.id}, regionCategoryId: ${cafeInfoData.regionCategoryId}. Skipping Elasticsearch indexing.`,
      );
      // RegionCategory가 없어도 Elasticsearch에 인덱싱할지 결정
      // 현재는 스킵하지만, 필요시 RegionCategory 없이도 인덱싱하도록 수정 가능
      return;
    }

    this.logger.log(
      `RegionCategory found: ID ${regionCategory.id}, Name: ${regionCategory.name}`,
    );

    // 2. Elasticsearch에 저장할 문서 구성
    this.logger.debug(
      `Constructing Elasticsearch document for CafeInfo ID: ${cafeInfoData.id}`,
    );
    const elasticsearchDoc: IndexDocument<CAFEINFO_INDEX_NAME> = {
      name: cafeInfoData.name,
      code: cafeInfoData.code,
      regionCategoryId: cafeInfoData.regionCategoryId,
      address: cafeInfoData.address,
      directions: cafeInfoData.directions,
      businessNumber: cafeInfoData.businessNumber,
      ceoName: cafeInfoData.ceoName,
      isDisable: cafeInfoData.isDisable,
      RegionCategory: {
        id: regionCategory.id,
        name: regionCategory.name,
        isDisable: regionCategory.isDisable,
        govermentType: regionCategory.govermentType,
      },
    };

    // 3. Elasticsearch에 색인 (id 기준으로 Upsert)
    this.logger.log(
      `Attempting to index CafeInfo ID: ${cafeInfoData.id} to Elasticsearch index: ${CAFEINFO_INDEX_NAME}`,
    );
    try {
      const result = await this.elasticsearchService.indexDocument(
        CAFEINFO_INDEX_NAME,
        elasticsearchDoc,
        cafeInfoData.id.toString(),
      );

      this.logger.log(`CafeInfo ID: ${cafeInfoData.id} indexed successfully.`);
      return result;
    } catch (error) {
      this.logger.error(
        `Failed to index CafeInfo ID: ${cafeInfoData.id} to Elasticsearch: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }
  }

  async processCafeInfoDelete(cafeInfoData: ICafeInfo) {
    this.logger.log(`Processing delete for CafeInfo ID: ${cafeInfoData.id}`);
    const result = await this.elasticsearchService.deleteDocument(
      CAFEINFO_INDEX_NAME,
      cafeInfoData.id.toString(),
    );
    this.logger.log(`CafeInfo ID: ${cafeInfoData.id} deleted successfully.`);

    return result;
  }
}
