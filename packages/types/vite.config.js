import path from 'path';
// import dts from 'vite-plugin-dts'; // disabled because of https://github.com/qmhc/vite-plugin-dts/issues/193
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

    sourcemap: true,
  },
  // plugins: [dts()],
};
