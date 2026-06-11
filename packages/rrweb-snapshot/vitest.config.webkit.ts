/// <reference types="vitest" />
import { defineProject, mergeConfig } from 'vite-plus/test';
import configShared from '../../vitest.config.ts';

export default mergeConfig(
  configShared,
  defineProject({
    test: {
      globals: true,
      include: ['test/monkey-patched.test.ts'],
    },
  }),
);
