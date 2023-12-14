import * as rollup from 'rollup';
import typescript from 'rollup-plugin-typescript2';
import resolve from '@rollup/plugin-node-resolve';

/**
 * Use rollup to compile an input TS script into JS code string.
 */
export async function compileTSCode(inputFilePath: string) {
  const bundle = await rollup.rollup({
    input: inputFilePath,
    plugins: [
      resolve() as unknown as rollup.Plugin,
      typescript({
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
