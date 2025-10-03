module.exports = {
  projects: [
    '<rootDir>/apps/api/jest.config.js',
    '<rootDir>/apps/web/jest.config.js'
  ],
  collectCoverageFrom: [
    'apps/*/src/**/*.{ts,tsx}',
    '!apps/*/src/**/*.d.ts',
    '!apps/*/src/**/*.spec.ts',
    '!apps/*/src/**/*.test.ts',
    '!apps/*/src/**/*.test.tsx',
    '!apps/*/src/test/**/*',
    '!apps/*/src/**/__mocks__/**/*'
  ],
  coverageDirectory: '<rootDir>/coverage',
  coverageReporters: ['text', 'lcov', 'html', 'json-summary'],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  }
}