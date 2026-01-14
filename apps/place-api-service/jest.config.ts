export default {
  displayName: 'place-api-service',
  preset: '../../jest.preset.js',
  globals: {},
  testEnvironment: 'node',
  setupFiles: ['<rootDir>/src/test-setup.ts'],
  transform: {
    '^.+\\.[tj]s$': [
      'ts-jest',
      {
        tsconfig: '<rootDir>/tsconfig.spec.json',
      },
    ],
  },
  moduleFileExtensions: ['ts', 'js', 'html'],
  coverageDirectory: '../coverage/apps/place-api-service',
  transformIgnorePatterns: [
    'node_modules/(?!(.*\\.mjs$))',
  ],
  testPathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '/prisma/',
  ],
};