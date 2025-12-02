import 'reflect-metadata';
import {
  ELASTICSEARCH_FIELDS_KEY,
  ELASTICSEARCH_NESTED_KEY,
} from '../decorators/elasticsearch.decorator';

type Constructor = new (...args: any[]) => any;

/**
 * 엔티티 인스턴스에서 Elasticsearch에 정의된 필드만 추출
 * @param entityInstance 엔티티 인스턴스
 * @returns 엔티티에 정의된 필드만 포함하는 plain object
 */
export function extractEntityFields<T extends Record<string, any>>(
  entityInstance: T,
): T {
  if (!entityInstance || typeof entityInstance !== 'object') {
    return entityInstance;
  }

  const entityClass = entityInstance.constructor as Constructor;
  const definedFields =
    (Reflect.getMetadata(ELASTICSEARCH_FIELDS_KEY, entityClass) as
      | Record<string, any>
      | undefined) || {};
  const nestedFields =
    (Reflect.getMetadata(ELASTICSEARCH_NESTED_KEY, entityClass) as
      | Record<string, Constructor | boolean>
      | undefined) || {};

  // 엔티티에 정의된 필드만 추출
  const result: Record<string, any> = {};

  // 모든 필드 (definedFields + nestedFields)를 합쳐서 처리
  const allFields = new Set([
    ...Object.keys(definedFields),
    ...Object.keys(nestedFields),
  ]);

  for (const fieldName of allFields) {
    if (fieldName in entityInstance) {
      const value = entityInstance[fieldName] as unknown;

      // 중첩 필드인 경우 재귀적으로 처리
      if (fieldName in nestedFields && value) {
        if (typeof value === 'object' && !Array.isArray(value)) {
          // Date 객체는 그대로 유지
          if (value instanceof Date) {
            result[fieldName] = value;
          } else {
            // 중첩 객체도 재귀적으로 처리
            result[fieldName] = extractEntityFields(value);
          }
        } else {
          result[fieldName] = value;
        }
      } else if (fieldName in definedFields) {
        // 일반 필드는 그대로 복사
        result[fieldName] = value;
      }
    }
  }

  return result as T;
}
