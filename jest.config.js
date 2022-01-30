module.exports = {
  clearMocks: true,
  moduleFileExtensions: ['js', 'ts'],
  testEnvironment: 'node',
  testMatch: ['**/*.test.ts'],
  testRunner: 'jest-circus/runner',
  transform: {
    '^.+\\.ts$': 'ts-jest'
  },
  reporters: [
    'default',
    './lib/blinka-json-reporter.js',
    ['jest-junit', {suiteName: 'jest tests'}]
  ],
  verbose: true
}
