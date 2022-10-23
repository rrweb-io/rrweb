import dts from 'vite-plugin-dts';
import { defineConfig, LibraryOptions } from 'vite';
import type { ModuleFormat } from 'rollup';
export default function (
  entry: LibraryOptions['entry'],
  name: LibraryOptions['name'],
  fileName?: LibraryOptions['fileName'],
) {
  return defineConfig({
    build: {
      // See https://vitejs.dev/guide/build.html#library-mode
      lib: {
        entry,
        name,
        fileName,
        // TODO: turn on `umd` when https://github.com/schummar/vite/tree/feature/libMultiEntryUMD gets merged
        // More info: https://github.com/vitejs/vite/pull/7047#issuecomment-1288080855
        // formats: ['es', 'umd', 'cjs'],
        formats: ['es', 'cjs'],
      },

      // Leaving this unminified so you can see what exactly gets included in
      // the bundles
      minify: false,

      sourcemap: true,
    },
    plugins: [dts({ insertTypesEntry: true })],
  });
}
