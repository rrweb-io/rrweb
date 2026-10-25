/// <reference types="vitest" />
import { defineProject, mergeConfig } from 'vitest/config';
import configShared from '../../vitest.config';
import { browserClientBuildDefines } from './buildMetadata';

export default mergeConfig(
  configShared,
  defineProject({
    define: browserClientBuildDefines(),
    test: {
      globals: true,
    },
  }),
);
