import path from 'path';
/**
 * @type {import('vite').UserConfig}
 */
export default {
  build: {
    // See https://vitejs.dev/guide/build.html#library-mode
    lib: {
      entry: path.resolve(__dirname, 'src/index.ts'),
      name: 'rrwebTypes',
    },

    // Leaving this unminified so you can see what exactly gets included in
    // the bundles
    minify: false,
  },
  plugins: [],
};
