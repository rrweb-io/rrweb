import typescript from 'rollup-plugin-typescript';
import commonjs from 'rollup-plugin-commonjs';
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
    plugins: [resolve(), commonjs(), typescript()],
    output: [
      {
        name: 'rrwebRecord',
        format: 'iife',
        file: toRecordPath(pkg.unpkg),
      },
    ],
  },
  {
    input: './src/record/index.ts',
    plugins: [resolve(), commonjs(), typescript(), terser()],
    output: [
      {
        name: 'rrwebRecord',
        format: 'iife',
        file: toMinPath(toRecordPath(pkg.unpkg)),
        sourcemap: true,
      },
    ],
  },
  // CommonJS(record only)
  {
    input: './src/record/index.ts',
    plugins: [resolve(), commonjs(), typescript()],
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
    plugins: [resolve(), commonjs(), typescript()],
    output: [
      {
        format: 'esm',
        file: toRecordPath(pkg.module),
      },
    ],
  },
  {
    input: './src/record/index.ts',
    plugins: [resolve(), commonjs(), typescript(), terser()],
    output: [
      {
        format: 'esm',
        file: toMinPath(toRecordPath(pkg.module)),
        sourcemap: true,
      },
    ],
  },
  // browser
  {
    input: './src/index.ts',
    plugins: [
      resolve(),
      commonjs(),
      typescript(),
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
  // BROWSER_ONLY
  {
    input: './src/index.ts',
    plugins: [
      resolve(),
      commonjs(),
      typescript(),
      postcss({
        extract: true,
        minimize: true,
        sourceMap: true,
      }),
      terser(),
    ],
    output: [
      {
        name: 'rrweb',
        format: 'iife',
        file: toMinPath(pkg.unpkg),
        sourcemap: true,
      },
    ],
  },
  // CommonJS
  {
    input: './src/index.ts',
    plugins: [
      resolve(),
      commonjs(),
      typescript(),
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
      resolve(),
      commonjs(),
      typescript(),
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
      resolve(),
      commonjs(),
      typescript(),
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
        sourcemap: true,
      },
    ],
  },
];

if (process.env.BROWSER) {
  configs = configs.filter(function(c){
    var is_browser = c.output[0].format == 'iife';
    if (process.env.BROWSER === 'suppress') {
      return !is_browser;
    } else {
      return is_browser;
    }
  });
}
if (process.env.PACKED) {
  configs = configs.filter(function(c){
    var is_packed = c.output[0].file.endsWith('.min.js');
    if (process.env.PACKED === 'suppress') {
      return !is_packed;
    } else {
      return is_packed;
    }
  });
}
if (process.env.RECORD) {
  configs = configs.filter(function(c){
    var is_record =  c.input == './src/record/index.ts';
    if (process.env.RECORD === 'suppress') {
      return !is_record;
    } else {
      return is_record;
    }
  });
}

export default configs;
