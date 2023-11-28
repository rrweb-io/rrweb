/** @type {import('ts-jest/dist/types').InitialOptionsTsJest} */
export default {
  preset: 'ts-jest',
  testEnvironment: 'node',
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
