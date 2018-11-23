import typescript from 'rollup-plugin-typescript';
import { terser } from 'rollup-plugin-terser';
import pkg from './package.json';

function toMinPath(path) {
  return path.replace(/\.js$/, '.min.js');
}

export default [
  // browser
  {
    input: './src/index.ts',
    plugins: [typescript()],
    output: [
      {
        name: 'rrwebSnapshot',
        format: 'iife',
        file: pkg.unpkg,
      },
    ],
  },
  {
    input: './src/index.ts',
    plugins: [typescript(), terser()],
    output: [
      {
        name: 'rrwebSnapshot',
        format: 'iife',
        file: toMinPath(pkg.unpkg),
        sourcemap: true,
      },
    ],
  },
  // CommonJS
  {
    input: './src/index.ts',
    plugins: [typescript()],
    output: [
      {
        format: 'cjs',
        file: pkg.main,
      },
    ],
  },
  // ES module
  {
    input: './src/index.ts',
    plugins: [typescript()],
    output: [
      {
        format: 'esm',
        file: pkg.module,
      },
    ],
  },
  {
    input: './src/index.ts',
    plugins: [typescript(), terser()],
    output: [
      {
        format: 'esm',
        file: toMinPath(pkg.module),
        sourcemap: true,
      },
    ],
  },
];
