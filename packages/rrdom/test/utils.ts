import * as rollup from 'rollup';
import * as typescript from 'rollup-plugin-typescript2';
import resolve from '@rollup/plugin-node-resolve';
const _typescript = typescript as unknown as typeof typescript.default;

/**
 * Use rollup to compile an input TS script into JS code string.
 */
export async function compileTSCode(inputFilePath: string) {
  const bundle = await rollup.rollup({
    input: inputFilePath,
    plugins: [
      resolve() as unknown as rollup.Plugin,
      _typescript({
        tsconfigOverride: { compilerOptions: { module: 'ESNext' } },
        clean: true,
        cacheRoot: `./node_modules/.cache/rrdom-test/${Date.now()}/`,
      }) as unknown as rollup.Plugin,
    ],
  });
  const {
    output: [{ code: _code }],
  } = await bundle.generate({
    name: 'rrdom',
    format: 'iife',
  });
  return _code;
}
