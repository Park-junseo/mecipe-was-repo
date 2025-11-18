import { MappingTypeMapping } from '@elastic/elasticsearch/lib/api/types';
import { generateMappingFromEntity } from '../utils/generate-mapping.util';
import { CafeInfo } from 'src/cafe-info/entity/cafe-info.entity';

// 엔티티 클래스에서 자동으로 매핑 생성 (지연 평가)
// 순환 참조 문제를 피하기 위해 지연 평가 사용
let _cafeInfoMapping: MappingTypeMapping | null = null;

function getCafeInfoMapping(): MappingTypeMapping {
  if (!_cafeInfoMapping) {
    _cafeInfoMapping = generateMappingFromEntity(CafeInfo);
  }
  return _cafeInfoMapping;
}

// 지연 평가를 위한 getter
export const cafeInfoMapping: MappingTypeMapping = (() => {
  // 모듈 로드 시점에 실행되지만, 실제로는 getter를 통해 지연 평가됨
  // 하지만 여전히 모듈 로드 시점에 접근하면 문제가 발생할 수 있음
  // 따라서 함수로 export하는 것이 더 안전함
  return getCafeInfoMapping();
})();
