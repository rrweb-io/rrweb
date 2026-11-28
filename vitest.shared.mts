import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    /**
     * Keeps old (pre-jest 29) snapshot format
     * its a bit ugly and harder to read than the new format,
     * so we might want to remove this in its own PR
     */
    snapshotFormat: {
      escapeString: true,
      printBasicPrototype: true,
    },
    // Keep browser fixtures isolated in worker processes.
    pool: 'forks',
  },
});
