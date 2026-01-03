import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

/**
 * Public 데코레이터
 * 이 데코레이터가 적용된 엔드포인트는 인증이 필요 없음
 * Gateway와 내부 서비스 모두에서 사용
 */
export const LegacyPublic = () => SetMetadata(IS_PUBLIC_KEY, true);
