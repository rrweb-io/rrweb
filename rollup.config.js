import typescript from 'rollup-plugin-typescript';
import resolve from 'rollup-plugin-node-resolve';

export default [
  {
    input: './src/record/index.ts',
    plugins: [typescript(), resolve()],
    output: [
      {
        format: 'cjs',
        file: './dist/record/index.js',
      },
      {
        format: 'esm',
        file: './dist/record/module.js',
      },
      {
        name: 'record',
        format: 'iife',
        file: './dist/record/browser.js',
      },
    ],
  },
  {
    input: './src/replay/index.ts',
    plugins: [typescript(), resolve()],
    output: [
      {
        format: 'cjs',
        file: './dist/replay/index.js',
      },
      {
        format: 'esm',
        file: './dist/replay/module.js',
      },
      {
        name: 'replay',
        format: 'iife',
        file: './dist/replay/browser.js',
      },
    ],
  },
];
