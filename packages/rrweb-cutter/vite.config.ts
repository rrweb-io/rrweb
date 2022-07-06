import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  esbuild: {
    minify: true,
  },
  build: {
    minify: 'terser',
    sourcemap: true,
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'rrwebCutter',
      formats: ['es', 'cjs', 'umd', 'iife'],
    },
  },
});
