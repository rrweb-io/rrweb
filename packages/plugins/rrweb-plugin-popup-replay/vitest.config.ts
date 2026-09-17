/// <reference types="vitest" />
import { defineProject, mergeConfig } from 'vitest/config';
import { resolve } from 'node:path';
import configShared from '../../../vitest.config.ts';

export default mergeConfig(
  configShared,
  defineProject({
    resolve: {
      alias: {
        '@rrweb/rrweb-plugin-popup-record': resolve(
          __dirname,
          '../rrweb-plugin-popup-record/src',
        ),
        '@rrweb/types': resolve(__dirname, '../../types/src'),
        '@rrweb/utils': resolve(__dirname, '../../utils/src'),
      },
    },
  }),
);
