import path from 'path';
import { defineConfig, mergeConfig, type Plugin } from 'vite';
import createConfig from '../../vite.config.default';

/**
 * Rollup plugin that redirects workspace package imports to their source entry
 * points during JS bundling. This lets Rollup see individual source modules
 * and tree-shake out replay-only code (rebuild.ts / postcss).
 *
 * Using resolveId (rather than resolve.alias) keeps the DTS plugin unaffected
 * — it continues to resolve against the published package types.
 */
function recordOnlyResolvePlugin(): Plugin {
  const aliases: Record<string, string> = {
    rrweb: path.resolve(__dirname, '../rrweb/src/entries/record.ts'),
    'rrweb-snapshot': path.resolve(
      __dirname,
      '../rrweb-snapshot/src/index.ts',
    ),
    rrdom: path.resolve(__dirname, '../rrdom/src/index.ts'),
  };

  return {
    name: 'record-only-resolve',
    enforce: 'pre',
    resolveId(source) {
      if (source in aliases) {
        return aliases[source];
      }
    },
  };
}

const baseConfigFn = createConfig(
  path.resolve(__dirname, 'src/index.ts'),
  'rrweb',
);

export default defineConfig((env) => {
  const baseConfig =
    typeof baseConfigFn === 'function' ? baseConfigFn(env) : baseConfigFn;
  return mergeConfig(baseConfig, {
    plugins: [recordOnlyResolvePlugin()],
    build: {
      rollupOptions: {
        treeshake: {
          // Allow Rollup to drop modules whose exports are unused, even
          // if they contain top-level code (e.g. rebuild.ts / postcss).
          moduleSideEffects: false,
        },
      },
    },
  });
});
