import { Transform, Type } from 'class-transformer';
import { CAFEINFO_INDEX_NAME } from 'src/elasticsearch/libs/indices';
import {
  ElasticsearchIndex,
  ElasticsearchField,
  ElasticsearchNested,
} from 'src/elasticsearch/libs/decorators';
import {
  GovermentType,
  ICafeInfo,
  IRegionCategory,
} from './cafe-info.interface';

/**
 * 타임스탬프(숫자)를 Date 객체로 변환하는 Transform 함수
 */
const transformTimestamp = ({ value }: { value: unknown }) => {
  if (typeof value === 'number') {
    return new Date(value);
  }
  if (value instanceof Date) {
    return value;
  }
  if (typeof value === 'string') {
    return new Date(value);
  }
  return value;
};

export class RegionCategory implements IRegionCategory {
  @ElasticsearchField({ type: 'integer' })
  id: number;

  @ElasticsearchField({ type: 'date' })
  @Transform(transformTimestamp)
  createdAt: Date;

  @ElasticsearchField({ type: 'text' })
  name: string;

  @ElasticsearchField({ type: 'boolean' })
  isDisable: boolean;

  @ElasticsearchField({ type: 'keyword' })
  govermentType: GovermentType;
}

@ElasticsearchIndex(CAFEINFO_INDEX_NAME)
export class CafeInfo implements ICafeInfo {
  @ElasticsearchField({ type: 'text' })
  name: string;

  @ElasticsearchField({ type: 'keyword' })
  code: string | null;

  @ElasticsearchField({ type: 'integer' })
  regionCategoryId: number;

  @ElasticsearchField({ type: 'text' })
  address: string;

  @ElasticsearchField({ type: 'text' })
  directions: string;

  @ElasticsearchField({ type: 'keyword' })
  businessNumber: string;

  @ElasticsearchField({ type: 'keyword' })
  ceoName: string;

  @ElasticsearchField({ type: 'boolean' })
  isDisable: boolean;

  @ElasticsearchField({ type: 'date' })
  @Transform(transformTimestamp)
  createdAt: Date;

  @ElasticsearchNested(RegionCategory)
  @Type(() => RegionCategory)
  RegionCategory: IRegionCategory;
}
