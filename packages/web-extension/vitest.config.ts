import { defineConfig } from 'vitest/config';
import * as path from 'path';

export default defineConfig({
  resolve: { alias: { '~': path.resolve(__dirname, './src') } },
  test: { include: ['src/**/*.test.ts'] },
});
