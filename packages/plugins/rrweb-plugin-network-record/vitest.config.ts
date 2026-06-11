/// <reference types="vitest" />
import { defineProject, mergeConfig } from 'vite-plus/test';
import { resolve } from 'node:path';
import configShared from '../../../vitest.config.ts';

export default mergeConfig(
  configShared,
  defineProject({
    resolve: {
      alias: {
        '@rrweb/utils': resolve(__dirname, '../../utils/src'),
      },
    },
  }),
);
