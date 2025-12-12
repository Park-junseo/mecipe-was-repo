const { composePlugins, withNx } = require('@nx/webpack');

module.exports = composePlugins(withNx(), (config) => {
  // 선택적 의존성들을 externals로 설정 (빌드 시 포함하지 않음)
  config.externals = config.externals || [];
  config.externals.push({
    'mqtt': 'commonjs mqtt',
    'nats': 'commonjs nats',
    'ioredis': 'commonjs ioredis',
    'amqplib': 'commonjs amqplib',
    'amqp-connection-manager': 'commonjs amqp-connection-manager',
    'bufferutil': 'commonjs bufferutil',
    'utf-8-validate': 'commonjs utf-8-validate',
  });

  // 선택적 의존성 경고 무시
  config.ignoreWarnings = config.ignoreWarnings || [];
  config.ignoreWarnings.push(
    /Critical dependency: the request of a dependency is an expression/,
    /Module not found: Error: Can't resolve/
  );

  return config;
});

