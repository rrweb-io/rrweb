/// <reference types="vitest" />
import { defineProject, mergeConfig } from 'vitest/config';
import configShared from '../../vitest.shared.mts';
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
