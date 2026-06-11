/// <reference types="vitest" />
import { defineProject, mergeConfig } from 'vite-plus/test';
import configShared from '../../vitest.config';

export default mergeConfig(
  configShared,
  defineProject({
    test: {
      globals: true,
      exclude: ['test/record/monkey-patched.test.ts'],
    },
  }),
);
