import typescript from 'rollup-plugin-typescript';

export default {
  input: './src/index.ts',
  plugins: [typescript()],
  output: [
    {
      format: 'cjs',
      file: './dist/index.js',
    },
    {
      format: 'esm',
      file: './dist/module.js',
    },
    {
      name: 'rrwebSnapshot',
      format: 'iife',
      file: './dist/browser.js',
    },
  ],
};
