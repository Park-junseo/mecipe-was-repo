const { composePlugins, withNx } = require('@nx/webpack');
const path = require('path');

module.exports = composePlugins(withNx(), (config) => {
  // Webpack이 모듈을 찾을 경로를 명시적으로 알려줍니다.
  config.resolve = config.resolve || {};
  config.resolve.modules = [
    'node_modules',
    path.resolve(__dirname, '../../node_modules'),
    '/app/node_modules'
  ];

  return config;
});




