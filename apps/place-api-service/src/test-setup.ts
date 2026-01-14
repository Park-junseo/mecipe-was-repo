// Jest test setup file
// 테스트 실행 시 환경 변수를 자동으로 설정합니다.

process.env.JWT_SECRET = process.env.JWT_SECRET || Buffer.from('test-jwt-secret-for-ci-and-local-development-only-do-not-use-in-production').toString('base64');
process.env.SECRET_LOGIN_CRYPTO = process.env.SECRET_LOGIN_CRYPTO || 'test-crypto-secret-for-development-only';
process.env.NODE_ENV = process.env.NODE_ENV || 'test';
