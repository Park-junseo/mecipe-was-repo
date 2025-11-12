import { MappingTypeMapping } from '@elastic/elasticsearch/lib/api/types';

export const CAFEINFO_INDEX_NAME = 'cafe-info-index';
export type CAFEINFO_INDEX_NAME = typeof CAFEINFO_INDEX_NAME;

export const cafeInfoMapping: MappingTypeMapping = {
  properties: {
    name: { type: 'text' },
    code: { type: 'keyword' },
    regionCategoryId: { type: 'integer' },
    address: { type: 'text' },
    directions: { type: 'text' },
    businessNumber: { type: 'keyword' },
    ceoName: { type: 'keyword' },
    isDisable: { type: 'boolean' },
    createdAt: { type: 'date' },
    RegionCategory: {
      type: 'nested',
      properties: {
        id: { type: 'integer' },
        name: { type: 'text' },
        isDisable: { type: 'boolean' },
        govermentType: { type: 'keyword' },
      },
    },
  },
};
