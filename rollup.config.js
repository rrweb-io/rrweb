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

function toPackPath(path) {
  return path
    .replace(/^([\w]+)\//, '$1/packer/')
    .replace('rrweb', 'rrweb-pack');
}

function toPackerPath(path) {
  return path
    .replace(/^([\w]+)\//, '$1/packer/')
    .replace('rrweb', 'rrweb-packer');
}

function toBoostPath(path) {
  return path.replace('rrweb', 'rrweb-boost');
}

function toMinPath(path) {
  return path.replace(/\.js$/, '.min.js');
}

const namedExports = {
  'pako/dist/pako_deflate': ['deflate'],
  'pako/dist/pako_inflate': ['inflate'],
  pako: ['deflate'],
};

const baseConfigs = [
  // record only
  {
    input: './src/record/index.ts',
    name: 'rrwebRecord',
    pathFn: toRecordPath,
  },
  // pack only
  {
    input: './src/packer/pack.ts',
    name: 'rrwebPack',
    pathFn: toPackPath,
  },
  // packer only
  {
    input: './src/packer/index.ts',
    name: 'rrwebPacker',
    pathFn: toPackerPath,
  },
  // record and replay
  {
    input: './src/index.ts',
    name: 'rrweb',
    pathFn: (p) => p,
  },
  // all in one
  {
    input: './src/boost.ts',
    name: 'rrwebBoost',
    pathFn: toBoostPath,
  },
];

let configs = [];

for (const c of baseConfigs) {
  const basePlugins = [resolve(), commonjs({ namedExports }), typescript()];
  const plugins = basePlugins.concat(
    postcss({
      extract: false,
      inject: false,
    }),
  );
  // browser
  configs.push({
    input: c.input,
    plugins,
    output: [
      {
        name: c.name,
        format: 'iife',
        file: c.pathFn(pkg.unpkg),
      },
    ],
  });
  // browser + minify
  configs.push({
    input: c.input,
    plugins: basePlugins.concat(
      postcss({
        extract: true,
        minimize: true,
        sourceMap: true,
      }),
      terser(),
    ),
    output: [
      {
        name: c.name,
        format: 'iife',
        file: toMinPath(c.pathFn(pkg.unpkg)),
        sourcemap: true,
      },
    ],
  });
  // CommonJS
  configs.push({
    input: c.input,
    plugins,
    output: [
      {
        format: 'cjs',
        file: c.pathFn(pkg.main),
      },
    ],
  });
  // ES module
  configs.push({
    input: c.input,
    plugins,
    preserveModules: true,
    output: [
      {
        format: 'esm',
        dir: 'es/rrweb',
      },
    ],
  });
}

if (process.env.BROWSER_ONLY) {
  configs = {
    input: './src/index.ts',
    plugins: [
      resolve(),
      commonjs({
        namedExports,
      }),
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
  };
}

export default configs;
