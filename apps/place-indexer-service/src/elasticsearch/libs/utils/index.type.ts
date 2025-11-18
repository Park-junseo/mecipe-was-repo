import { CAFEINFO_INDEX_NAME } from '../indices';
import { cafeInfoMapping } from '../mappings';
import { InferMappingDocument } from './convert-document';

// 지연 평가를 위한 getter 함수
function getIndexTypeMap() {
  return {
    [CAFEINFO_INDEX_NAME]: cafeInfoMapping,
  };
}

// 지연 평가를 위한 export
export const INDEX_TYPE_MAP = getIndexTypeMap();

export type IndexDocument<TIndexType extends IndexType> = InferMappingDocument<
  (typeof INDEX_TYPE_MAP)[TIndexType]
>;

export type IndexType = keyof typeof INDEX_TYPE_MAP;
