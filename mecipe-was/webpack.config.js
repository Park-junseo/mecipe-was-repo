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
    // 선택적 Apollo 의존성
    '@as-integrations/fastify': 'commonjs @as-integrations/fastify',
    '@apollo/subgraph': 'commonjs @apollo/subgraph',
    '@apollo/gateway': 'commonjs @apollo/gateway',
    // 선택적 GraphQL 의존성
    'ts-morph': 'commonjs ts-morph',
    '@fastify/static': 'commonjs @fastify/static',
    'class-transformer/storage': 'commonjs class-transformer/storage',
    // 실제 사용하는 의존성 (런타임에 로드)
    'socket.io': 'commonjs socket.io',
    'express': 'commonjs express',
    'multer': 'commonjs multer',
  });

  // 선택적 의존성에 대한 alias 설정 (빈 모듈로 대체)
  config.resolve = config.resolve || {};
  config.resolve.alias = config.resolve.alias || {};
  
  // @apollo/subgraph 관련 모듈을 빈 모듈로 대체
  const emptyModule = path.resolve(__dirname, 'webpack-empty-module.js');
  config.resolve.alias['@apollo/subgraph/package.json'] = emptyModule;
  config.resolve.alias['@apollo/subgraph/dist/directives'] = emptyModule;
  config.resolve.alias['@apollo/subgraph'] = emptyModule;

  // 선택적 의존성 경고 무시
  config.ignoreWarnings = config.ignoreWarnings || [];
  config.ignoreWarnings.push(
    /Critical dependency: the request of a dependency is an expression/,
    /Module not found: Error: Can't resolve/
  );

  return config;
});

