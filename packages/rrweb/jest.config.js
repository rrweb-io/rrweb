/** @type {import('ts-jest/dist/types').InitialOptionsTsJest} */
export default {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/**.test.ts'],
  moduleNameMapper: {
    '\\.css$': 'identity-obj-proxy',
  },
  snapshotFormat: {
    escapeString: true,
    printBasicPrototype: true,
  },
};
