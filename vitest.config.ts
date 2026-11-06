import { defineConfig, mergeConfig } from 'vitest/config';
import shared from './vitest.shared.mts';

export default mergeConfig(
  shared,
  defineConfig({
    test: {
      projects: ['packages/**/vitest.config.ts', 'packages/packer'],
    },
  }),
);
