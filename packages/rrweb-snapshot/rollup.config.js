import typescript from 'rollup-plugin-typescript2';
import { terser } from 'rollup-plugin-terser';
import pkg from './package.json';

function toMinPath(path) {
  return path.replace(/\.js$/, '.min.js');
}

let configs = [];
let es_configs = [
  // ES module - for building rrweb
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
];
let browser_configs = [
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
];
let extra_configs = [
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
  // ES module (packed)
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

if (process.env.ES_ONLY) {
  configs = es_configs;
} else if (process.env.BROWSER_ONLY) {
  configs = browser_configs;
} else {
  configs.push(...es_configs, ...browser_configs, ...extra_configs);
}

export default configs;
