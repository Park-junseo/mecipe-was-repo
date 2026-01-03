/**
 * 서비스 간 통신용 토큰 설정
 * Gateway 방식에서는 JWT 검증은 Gateway에서 수행
 */
export const serviceTokenConfig = {
  serviceToken: process.env['SERVICE_TOKEN'] || 'default-service-token',
};

