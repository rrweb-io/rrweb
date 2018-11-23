import typescript from 'rollup-plugin-typescript';
import resolve from 'rollup-plugin-node-resolve';
import { terser } from 'rollup-plugin-terser';
import postcss from 'rollup-plugin-postcss';
import pkg from './package.json';

function toRecordPath(path) {
  return path
    .replace(/^([\w]+)\//, '$1/record/')
    .replace('rrweb', 'rrweb-record');
}

function toMinPath(path) {
  return path.replace(/\.js$/, '.min.js');
}

let configs = [
  // browser(record only)
  {
    input: './src/record/index.ts',
    plugins: [typescript(), resolve()],
    output: [
      {
        name: 'record',
        format: 'iife',
        file: toRecordPath(pkg.unpkg),
      },
    ],
  },
  {
    input: './src/record/index.ts',
    plugins: [typescript(), resolve(), terser()],
    output: [
      {
        name: 'record',
        format: 'iife',
        file: toMinPath(toRecordPath(pkg.unpkg)),
      },
    ],
  },
  // CommonJS(record only)
  {
    input: './src/record/index.ts',
    plugins: [typescript(), resolve()],
    output: [
      {
        format: 'cjs',
        file: toRecordPath(pkg.main),
      },
    ],
  },
  // ES module(record only)
  {
    input: './src/record/index.ts',
    plugins: [typescript(), resolve()],
    output: [
      {
        format: 'esm',
        file: toRecordPath(pkg.module),
      },
    ],
  },
  {
    input: './src/record/index.ts',
    plugins: [typescript(), resolve(), terser()],
    output: [
      {
        format: 'esm',
        file: toMinPath(toRecordPath(pkg.module)),
      },
    ],
  },
  // browser
  {
    input: './src/index.ts',
    plugins: [
      typescript(),
      resolve(),
      postcss({
        extract: false,
        inject: false,
      }),
    ],
    output: [
      {
        name: 'rrweb',
        format: 'iife',
        file: pkg.unpkg,
      },
    ],
  },
  {
    input: './src/index.ts',
    plugins: [
      typescript(),
      resolve(),
      postcss({
        extract: true,
        minimize: true,
        sourceMap: 'inline',
      }),
      terser(),
    ],
    output: [
      {
        name: 'rrweb',
        format: 'iife',
        file: toMinPath(pkg.unpkg),
      },
    ],
  },
  // CommonJS
  {
    input: './src/index.ts',
    plugins: [
      typescript(),
      resolve(),
      postcss({
        extract: false,
        inject: false,
      }),
    ],
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
    plugins: [
      typescript(),
      resolve(),
      postcss({
        extract: false,
        inject: false,
      }),
    ],
    output: [
      {
        format: 'esm',
        file: pkg.module,
      },
    ],
  },
  {
    input: './src/index.ts',
    plugins: [
      typescript(),
      resolve(),
      postcss({
        extract: false,
        inject: false,
      }),
      terser(),
    ],
    output: [
      {
        format: 'esm',
        file: toMinPath(pkg.module),
      },
    ],
  },
];

if (process.env.BROWSER_ONLY) {
  configs = {
    input: './src/index.ts',
    plugins: [
      typescript(),
      resolve(),
      postcss({
        extract: true,
        minimize: true,
        sourceMap: 'inline',
      }),
      terser(),
    ],
    output: [
      {
        name: 'rrweb',
        format: 'iife',
        file: toMinPath(pkg.unpkg),
      },
    ],
  };
}

export default configs;
