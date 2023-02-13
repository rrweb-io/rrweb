/** @type {import('ts-jest/dist/types').InitialOptionsTsJest} */
export default {
  preset: 'ts-jest',
  testEnvironment: 'node',
  moduleNameMapper: {
    'rrweb/test/utils': '<rootDir>/../rrweb/test/utils',
  },
};
