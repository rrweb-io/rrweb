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
    'rrweb-snapshot': path.resolve(__dirname, '../rrweb-snapshot/src/index.ts'),
  };

  return {
    name: 'record-only-resolve',
    enforce: 'pre',
    resolveId(source) {
      if (source in aliases) {
        return aliases[source];
      }
      // rrdom is replay-only; stub it out so none of its code is bundled.
      if (source === 'rrdom') {
        return '\0rrdom-stub';
      }
    },
    load(id) {
      if (id === '\0rrdom-stub') {
        return 'export class BaseRRNode {}; export class RRNode {}; export class RRIFrameElement {};';
      }
    },
  };
}

const baseConfigFn = createConfig(
  path.resolve(__dirname, 'src/index.ts'),
  'rrwebRecord',
);

export default defineConfig((env) => {
  const baseConfig =
    typeof baseConfigFn === 'function' ? baseConfigFn(env) : baseConfigFn;
  return mergeConfig(baseConfig, {
    plugins: [recordOnlyResolvePlugin()],
    /*
     * this moduleSideEffects: false has been moved to packages/rrweb-snapshot/package.json (as `"sideEffects": false,` there)
     * in case there might be other unintended consequences in future. However it might still be desirable to turn on the aggressive
     * tree-shaking here to ensure nothing extra gets included in build outputs.  Moving this to the top level (vite.config.default.ts)
     * would negatively impact import of Sveldt from rrweb-player, which _does_ need to use the side effect of Sveldt window registration
     * for the player to work
    build: {
      rollupOptions: {
        treeshake: {
          // Allow Rollup to drop modules whose exports are unused, even
          // if they contain top-level code (e.g. rebuild.ts / postcss).
          moduleSideEffects: false,
        },
      },
    },
    */
  });
});
