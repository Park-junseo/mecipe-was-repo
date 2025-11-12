// apps/place-indexer-service/src/regionCategories/region-cagetories.service.ts
import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { isAxiosError } from 'axios';
import { firstValueFrom } from 'rxjs';
import { map } from 'rxjs/operators';
import { IRegionCategory } from 'src/util/dtos/region-category/region-category.interface';
import { REGION_CATEGORIES_BASE_URL } from 'src/util/types';

@Injectable()
export class RegionCategoriesService {
  private readonly logger = new Logger(RegionCategoriesService.name);
  private readonly regionServiceBaseUrl: string;

  constructor(
    private readonly httpService: HttpService, // @nestjs/axios 필요
    private readonly configService: ConfigService,
  ) {
    this.regionServiceBaseUrl = REGION_CATEGORIES_BASE_URL(this.configService);
  }

  async getRegionCategoryById(id: number): Promise<IRegionCategory | null> {
    try {
      // 예시: region-service의 REST API 호출
      const response = await firstValueFrom<IRegionCategory>(
        this.httpService
          .get<IRegionCategory>(
            `${this.regionServiceBaseUrl}/region-categories/${id}`,
          )
          .pipe(map((resp) => resp.data)),
      );
      return response;
    } catch (error: unknown) {
      const errorMessage = isAxiosError(error)
        ? `Axios error ${error.response?.status ?? ''} ${error.message}`
        : error instanceof Error
          ? error.message
          : 'Unknown error';
      this.logger.error(
        `Failed to fetch RegionCategory ${id}: ${errorMessage}`,
      );
      return null; // 조회 실패 시 null 반환 또는 에러 처리
    }
  }
}
