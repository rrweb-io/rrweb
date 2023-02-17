import dts from 'vite-plugin-dts';
/**
 * @type {import('vite').UserConfig}
 */
export default {
  build: {
    lib: {
      entry: 'src/index.ts',
      name: 'rrwebCutter',
      fileName: 'index',
      formats: ['es', 'cjs', 'umd', 'iife'],
    },

    minify: true,

    sourcemap: true,

    emptyOutDir: true,
  },
  plugins: [dts()],
};
