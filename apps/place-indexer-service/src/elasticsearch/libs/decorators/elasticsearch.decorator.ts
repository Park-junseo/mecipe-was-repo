import 'reflect-metadata';
import { MappingProperty } from '@elastic/elasticsearch/lib/api/types';

// 메타데이터 키 정의
export const ELASTICSEARCH_INDEX_KEY = Symbol('elasticsearch:index');
export const ELASTICSEARCH_FIELDS_KEY = Symbol('elasticsearch:fields');
export const ELASTICSEARCH_NESTED_KEY = Symbol('elasticsearch:nested');

type Constructor = new (...args: any[]) => any;

/**
 * 클래스에 Elasticsearch 인덱스 이름을 지정하는 데코레이터
 * @param indexName Elasticsearch 인덱스 이름
 */
export function ElasticsearchIndex(indexName: string) {
  return function (target: Constructor) {
    Reflect.defineMetadata(ELASTICSEARCH_INDEX_KEY, indexName, target);
  };
}

/**
 * 필드에 Elasticsearch 매핑 속성을 지정하는 데코레이터
 * @param options Elasticsearch 필드 매핑 옵션
 */
export function ElasticsearchField(options: MappingProperty) {
  return function (target: object, propertyKey: string) {
    const constructor = target.constructor as Constructor;
    const existingFields =
      (Reflect.getMetadata(ELASTICSEARCH_FIELDS_KEY, constructor) as
        | Record<string, MappingProperty>
        | undefined) || {};
    existingFields[propertyKey] = options;
    Reflect.defineMetadata(
      ELASTICSEARCH_FIELDS_KEY,
      existingFields,
      constructor,
    );
  };
}

/**
 * 중첩 객체 필드를 지정하는 데코레이터
 * @param nestedClass 중첩된 클래스 타입 (선택적)
 */
export function ElasticsearchNested(nestedClass?: Constructor) {
  return function (target: object, propertyKey: string) {
    const constructor = target.constructor as Constructor;
    const existingNested =
      (Reflect.getMetadata(ELASTICSEARCH_NESTED_KEY, constructor) as
        | Record<string, Constructor | boolean>
        | undefined) || {};
    existingNested[propertyKey] = nestedClass || true;
    Reflect.defineMetadata(
      ELASTICSEARCH_NESTED_KEY,
      existingNested,
      constructor,
    );
  };
}
