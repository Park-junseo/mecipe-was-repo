import { SetMetadata } from '@nestjs/common';
import { BUILD_API_KEY_META } from './api-key.guard';

/**
 * 빌드 전용 API Key 인증을 요구하는 데코레이터
 * @Public과 함께 사용하여 일반 JWT 인증은 건너뛰되, API Key는 확인합니다
 */
export const RequireBuildApiKey = () => SetMetadata(BUILD_API_KEY_META, true);

