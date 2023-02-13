import path from 'path';
import dts from 'vite-plugin-dts';
/**
 * @type {import('vite').UserConfig}
 */
export default {
  build: {
    lib: {
      entry: path.resolve(__dirname, 'src/index.ts'),
      name: 'rrwebCutter',
      fileName: 'index',
      formats: ['es', 'cjs', 'umd', 'iife'],
    },

    minify: true,

    sourcemap: true,
  },
  plugins: [dts()],
};
