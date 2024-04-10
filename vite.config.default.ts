/// <reference types="vite/client" />
import dts from 'vite-plugin-dts';
import { copyFileSync } from 'node:fs';
import { defineConfig, LibraryOptions } from 'vite';
import glob from 'fast-glob';

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
        // TODO: turn on `umd` for rrweb when https://github.com/schummar/vite/tree/feature/libMultiEntryUMD gets merged
        // More info: https://github.com/vitejs/vite/pull/7047#issuecomment-1288080855
        formats:
          typeof entry === 'string' ? ['es', 'umd', 'cjs'] : ['es', 'cjs'],
      },

      // Leaving this unminified so you can see what exactly gets included in
      // the bundles
      minify: false,

      sourcemap: true,

      // rollupOptions: {
      //   output: {
      //     manualChunks: {},
      //   },
      // },
    },
    plugins: [
      dts({
        insertTypesEntry: true,
        rollupTypes: true,
        afterBuild: () => {
          // To pass publint (`npm x publint@latest`) and ensure the
          // package is supported by all consumers, we must export types that are
          // read as ESM. To do this, there must be duplicate types with the
          // correct extension supplied in the package.json exports field.
          const files: string[] = glob.sync('dist/**/*.d.ts');
          files.forEach((file) => {
            const ctsFile = file.replace('.d.ts', '.d.cts');
            copyFileSync(file, ctsFile);
          });
        },
      }),
    ],
  });
}
