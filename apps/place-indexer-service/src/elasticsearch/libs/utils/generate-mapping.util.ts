import 'reflect-metadata';
import {
  MappingTypeMapping,
  MappingProperty,
} from '@elastic/elasticsearch/lib/api/types';
import {
  ELASTICSEARCH_FIELDS_KEY,
  ELASTICSEARCH_NESTED_KEY,
} from '../decorators/elasticsearch.decorator';

type Constructor = new (...args: any[]) => any;

/**
 * 엔티티 클래스에서 Elasticsearch 매핑을 자동 생성
 * @param entityClass 엔티티 클래스 생성자
 * @returns Elasticsearch 매핑 객체
 */
export function generateMappingFromEntity(
  entityClass: Constructor,
): MappingTypeMapping {
  const fields =
    (Reflect.getMetadata(ELASTICSEARCH_FIELDS_KEY, entityClass) as
      | Record<string, MappingProperty>
      | undefined) || {};
  const nestedFields =
    (Reflect.getMetadata(ELASTICSEARCH_NESTED_KEY, entityClass) as
      | Record<string, Constructor | boolean>
      | undefined) || {};

  const properties: Record<string, MappingProperty> = {};

  // 일반 필드 처리
  for (const [fieldName, mappingOptions] of Object.entries(fields)) {
    properties[fieldName] = mappingOptions;
  }

  // 중첩 필드 처리
  for (const [fieldName, nestedClass] of Object.entries(nestedFields)) {
    if (nestedClass === true) {
      // 중첩 클래스가 지정되지 않은 경우 기본 nested 타입 사용
      properties[fieldName] = {
        type: 'nested',
        properties: {},
      };
    } else if (nestedClass && typeof nestedClass === 'function') {
      // 중첩 클래스가 지정된 경우 재귀적으로 매핑 생성
      const nestedMapping = generateMappingFromEntity(nestedClass);
      properties[fieldName] = {
        type: 'nested',
        properties: nestedMapping.properties || {},
      };
    }
  }

  return {
    properties,
  };
}
