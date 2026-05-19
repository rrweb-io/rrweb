import path from 'path';
import type { Plugin } from 'vite';
import config from '../../vite.config.default';

const sourceEntryByPackageName = new Map([
  ['rrweb', path.resolve(__dirname, '../rrweb/src/entries/record.ts')],
  [
    'rrweb-snapshot',
    path.resolve(__dirname, '../rrweb-snapshot/src/index.ts'),
  ],
  ['rrdom', path.resolve(__dirname, '../rrdom/src/index.ts')],
]);

function resolveLocalSourceEntries(): Plugin {
  return {
    name: 'resolve-local-source-entries',
    enforce: 'pre',
    resolveId(source) {
      return sourceEntryByPackageName.get(source) || null;
    },
  };
}

export default config(path.resolve(__dirname, 'src/index.ts'), 'rrwebRecord', {
  plugins: [resolveLocalSourceEntries()],
});
