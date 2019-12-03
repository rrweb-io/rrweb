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

function toRecordPackPath(path) {
  return path
    .replace(/^([\w]+)\//, '$1/record/')
    .replace('rrweb', 'rrweb-record-pack');
}

function toReplayPath(path) {
  return path
    .replace(/^([\w]+)\//, '$1/replay/')
    .replace('rrweb', 'rrweb-replay');
}

function toReplayUnpackPath(path) {
  return path
    .replace(/^([\w]+)\//, '$1/replay/')
    .replace('rrweb', 'rrweb-replay-unpack');
}

function toAllPath(path) {
  return path.replace('rrweb', 'rrweb-all');
}

function toMinPath(path) {
  return path.replace(/\.js$/, '.min.js');
}

const baseConfigs = [
  // record only
  {
    input: './src/record/index.ts',
    name: 'rrwebRecord',
    pathFn: toRecordPath,
  },
  // record and pack
  {
    input: './src/entries/record-pack.ts',
    name: 'rrwebRecord',
    pathFn: toRecordPackPath,
  },
  // replay only
  {
    input: './src/replay/index.ts',
    name: 'rrwebReplay',
    pathFn: toReplayPath,
  },
  // replay and unpack
  {
    input: './src/entries/replay-unpack.ts',
    name: 'rrwebReplay',
    pathFn: toReplayUnpackPath,
  },
  // record and replay
  {
    input: './src/index.ts',
    name: 'rrweb',
    pathFn: (p) => p,
  },
  // all in one
  {
    input: './src/entries/all.ts',
    name: 'rrweb',
    pathFn: toAllPath,
  },
];

let configs = [];

for (const c of baseConfigs) {
  const basePlugins = [resolve({ browser: true }), typescript()];
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
        file: c.pathFn('lib/rrweb.js'),
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
