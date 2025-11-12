import {
  CAFEINFO_INDEX_NAME,
  cafeInfoMapping,
} from '../mappings/cafe-info.mapping';
import { InferMappingDocument } from './convert-document';

export const INDEX_TYPE_MAP = {
  [CAFEINFO_INDEX_NAME]: cafeInfoMapping,
};

export type IndexDocument<TIndexType extends IndexType> = InferMappingDocument<
  (typeof INDEX_TYPE_MAP)[TIndexType]
>;

export type IndexType = keyof typeof INDEX_TYPE_MAP;
