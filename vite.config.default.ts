import dts from 'vite-plugin-dts';
import { defineConfig } from 'vite';
export default function (entry: string, name: string) {
  return defineConfig({
    build: {
      // See https://vitejs.dev/guide/build.html#library-mode
      lib: {
        entry,
        name,
      },

      // Leaving this unminified so you can see what exactly gets included in
      // the bundles
      minify: false,

      sourcemap: true,
    },
    plugins: [dts({ insertTypesEntry: true })],
  });
}
