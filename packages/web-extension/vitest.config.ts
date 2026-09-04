/// <reference types="vitest" />
import { resolve } from 'node:path';
import { defineProject, mergeConfig } from 'vitest/config';
import configShared from '../../vitest.config';

export default mergeConfig(
  configShared,
  defineProject({
    resolve: {
      alias: {
        '~': resolve(__dirname, './src'),
      },
    },
    test: {
      environment: 'happy-dom',
      globals: true,
      setupFiles: ['./test/setup.ts'],
    },
  }),
);
