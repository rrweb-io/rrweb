/** @type {import('ts-jest/dist/types').JestConfigWithTsJest} */
export default {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/**.test.ts'],
  setupFiles: ['./jest.setup.ts'],
  /**
   * Keeps old (pre-jest 29) snapshot format
   * its a bit ugly and harder to read than the new format,
   * so we might want to remove this in its own PR
   */
  snapshotFormat: {
    escapeString: true,
    printBasicPrototype: true,
  },
};
