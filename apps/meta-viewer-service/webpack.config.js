const { composePlugins, withNx } = require('@nx/webpack');
const path = require('path');

module.exports = composePlugins(withNx(), (config) => {
  // 선택적 의존성들을 externals로 설정 (빌드 시 포함하지 않음)
  // 실제 사용하는 의존성도 externals로 설정 (런타임에 node_modules에서 로드)
  config.externals = config.externals || [];
  config.externals.push({
    // 선택적 microservices 의존성
    'mqtt': 'commonjs mqtt',
    'nats': 'commonjs nats',
    'ioredis': 'commonjs ioredis',
    'amqplib': 'commonjs amqplib',
    'amqp-connection-manager': 'commonjs amqp-connection-manager',
    'bufferutil': 'commonjs bufferutil',
    'utf-8-validate': 'commonjs utf-8-validate',

    // 선택적 GraphQL 의존성
    'ts-morph': 'commonjs ts-morph',
    '@fastify/static': 'commonjs @fastify/static',
    'class-transformer/storage': 'commonjs class-transformer/storage'
  });

  // 선택적 의존성에 대한 alias 설정 (빈 모듈로 대체)
  config.resolve = config.resolve || {};
  config.resolve.alias = config.resolve.alias || {};

  // 선택적 의존성 경고 무시
  config.ignoreWarnings = config.ignoreWarnings || [];
  config.ignoreWarnings.push(
    /Critical dependency: the request of a dependency is an expression/,
    /Module not found: Error: Can't resolve/
  );

  // Webpack이 모듈을 찾을 경로를 명시적으로 알려줍니다.
  // pnpm 모노레포에서는 node_modules가 워크스페이스 루트에 위치하므로
  // 이곳에서도 찾도록 설정하는 것이 중요합니다.
  config.resolve.modules = [
    'node_modules',                                  // 현재 프로젝트 내 node_modules (존재한다면)
    path.resolve(__dirname, '../../node_modules'),   // 워크스페이스 루트의 node_modules
    '/app/node_modules'                              // Docker 컨테이너 안에서의 워크스페이스 루트 node_modules 절대 경로
  ];

  return config;
});

