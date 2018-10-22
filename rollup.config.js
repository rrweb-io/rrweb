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
        name: 'record1',
        format: 'iife',
        file: './dist/record/browser.js',
      },
    ],
  },
  {
    input: './src/index.ts',
    plugins: [typescript(), resolve()],
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
        name: 'rrweb',
        format: 'iife',
        file: './dist/browser.js',
      },
    ],
  },
];
