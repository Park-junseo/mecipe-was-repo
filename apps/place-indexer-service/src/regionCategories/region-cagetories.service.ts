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
    const baseUrl = REGION_CATEGORIES_BASE_URL(this.configService);
    // URL 정규화: 끝 슬래시 제거, 공백 제거
    this.regionServiceBaseUrl = baseUrl.trim().replace(/\/+$/, '');

    if (!this.regionServiceBaseUrl) {
      this.logger.warn(
        'REGION_CATEGORIES_BASE_URL is not set. RegionCategory lookups will fail.',
      );
    } else {
      this.logger.log(
        `RegionCategoriesService initialized with base URL: ${this.regionServiceBaseUrl}`,
      );
    }
  }

  async getRegionCategoryById(id: number): Promise<IRegionCategory | null> {
    if (!this.regionServiceBaseUrl) {
      this.logger.error(
        'Cannot fetch RegionCategory: REGION_CATEGORIES_BASE_URL is not set',
      );
      return null;
    }

    try {
      // URL 구성: baseUrl/id (슬래시 중복 방지)
      const url = `${this.regionServiceBaseUrl}/${id}`;
      this.logger.debug(`Fetching RegionCategory from URL: ${url}`);

      // 예시: region-service의 REST API 호출
      // HTTP 응답은 JSON이므로 createdAt이 Date 문자열("2025-11-14T02:24:25.732Z")로 옴
      const response = await firstValueFrom(
        this.httpService
          .get<IRegionCategory>(url)
          .pipe(map((resp) => resp.data)),
      );

      // Date 문자열을 Date 객체로 변환하여 IRegionCategory 타입에 맞춤
      return {
        ...response,
        createdAt: new Date(response.createdAt),
      } as IRegionCategory;
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
