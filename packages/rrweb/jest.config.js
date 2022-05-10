/** @type {import('ts-jest/dist/types').InitialOptionsTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/**.test.ts'],
  moduleNameMapper: {
    '\\.css$': 'identity-obj-proxy',
  },
};
