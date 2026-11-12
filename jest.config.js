module.exports = {
  preset: '@react-native/jest-preset',
  testMatch: ['**/*.tests.ts', '**/*.tests.tsx'],
  testPathIgnorePatterns: ['/node_modules/', '/android/'],
  moduleNameMapper: {
    '^@app/(.*)$': '<rootDir>/src/app/$1',
    '^@core/(.*)$': '<rootDir>/src/core/$1',
    '^@shared/(.*)$': '<rootDir>/src/shared/$1',
    '^@features/(.*)$': '<rootDir>/src/features/$1',
    '^@assets/(.*)$': '<rootDir>/src/assets/$1',
  },
};
