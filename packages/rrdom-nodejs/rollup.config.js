import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import { terser } from 'rollup-plugin-terser';
import typescript from 'rollup-plugin-typescript2';
import webWorkerLoader from 'rollup-plugin-web-worker-loader';
import pkg from './package.json';

function toMinPath(path) {
  return path.replace(/\.js$/, '.min.js');
}

const basePlugins = [
  resolve({ browser: true }),
  commonjs(),

  // supports bundling `web-worker:..filename` from rrweb
  webWorkerLoader(),

  typescript({
    tsconfigOverride: { compilerOptions: { module: 'ESNext' } },
  }),
];

const baseConfigs = [
  {
    input: './src/index.ts',
    name: pkg.name,
    path: pkg.name,
  },
  {
    input: './src/document-nodejs.ts',
    name: 'RRDocument',
    path: 'document-nodejs',
  },
];

let configs = [];
let extraConfigs = [];
for (let config of baseConfigs) {
  configs.push(
    // ES module
    {
      input: config.input,
      plugins: basePlugins,
      output: [
        {
          format: 'esm',
          file: pkg.module.replace(pkg.name, config.path),
        },
      ],
    },
  );
  extraConfigs.push(
    // CommonJS
    {
      input: config.input,
      plugins: basePlugins,
      output: [
        {
          format: 'cjs',
          file: pkg.main.replace(pkg.name, config.path),
        },
      ],
    },
    // ES module (packed)
    {
      input: config.input,
      plugins: basePlugins.concat(terser()),
      output: [
        {
          format: 'esm',
          file: toMinPath(pkg.module).replace(pkg.name, config.path),
          sourcemap: true,
        },
      ],
    },
  );
}

if (!process.env.ES_ONLY) {
  configs.push(...extraConfigs);
}

export default configs;
