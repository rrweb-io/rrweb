/// <reference types="vitest" />
import { defineProject, mergeConfig } from 'vitest/config';
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
