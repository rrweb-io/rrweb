/// <reference types="vitest" />
import { defineProject, mergeConfig } from 'vitest/config';
import configShared from '../../vitest.config.ts';

export default mergeConfig(
  configShared,
  defineProject({
    test: {
      globals: true,
      env: { BROWSER: 'webkit' },
      include: [
        'test/record/monkey-patched.test.ts',
        'test/record/observer-document-cleanup.browser.test.ts',
      ],
    },
  }),
);
