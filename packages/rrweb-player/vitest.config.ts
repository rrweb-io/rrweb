import { defineConfig, mergeConfig } from 'vitest/config';
import viteConfig from './vite.config';
import shared from '../../vitest.shared.mts';

export default defineConfig((env) =>
  mergeConfig(
    mergeConfig(viteConfig(env), shared),
    defineConfig({
      test: {
        environmentOptions: {
          happyDOM: {
            settings: {
              // Replayer needs a live about:blank iframe document.
              enableIframePageLoading: true,
            },
          },
        },
      },
    }),
  ),
);
