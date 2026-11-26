import {
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { SourceMap } from 'node:module';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { runInNewContext } from 'node:vm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { build, loadConfigFromFile } from 'vite';
import { minifyAndUMDPlugin } from '../../../vite.config.default';

const packageDir = fileURLToPath(new URL('..', import.meta.url));
const temporaryDir = mkdtempSync(resolve(tmpdir(), 'rrweb-packer-build-'));
const dist = resolve(temporaryDir, 'dist');
const event = { type: 0, data: {}, timestamp: 123 };

function loadUMD(filename: string, mode: 'browser' | 'commonjs' | 'amd') {
  const code = readFileSync(filename, 'utf8');
  const context = {
    TextEncoder,
    TextDecoder,
    ...(mode === 'commonjs' ? { module: { exports: {} }, exports: {} } : {}),
    ...(mode === 'amd'
      ? {
          define: Object.assign(
            (name: string, dependencies: string[], factory: () => unknown) => {
              expect(name).toBe('rrwebPacker');
              expect(dependencies).toEqual([]);
              amdExport = factory();
            },
            { amd: true },
          ),
        }
      : {}),
  };
  let amdExport: unknown;
  // No require is supplied: every UMD file must be usable on its own.
  runInNewContext(code, context);
  return mode === 'amd'
    ? amdExport
    : mode === 'commonjs'
    ? context.module?.exports
    : Reflect.get(context, 'rrwebPacker');
}

beforeAll(async () => {
  const loaded = await loadConfigFromFile(
    { command: 'build', mode: 'production' },
    resolve(packageDir, 'vite.config.ts'),
  );
  expect(loaded).not.toBeNull();
  const config = loaded!.config;
  await build({
    ...config,
    configFile: false,
    root: packageDir,
    // The report uses a repository-wide absolute path, outside this temp build.
    plugins: config.plugins?.filter(
      (plugin) =>
        !plugin || !('name' in plugin) || plugin.name !== 'visualizer',
    ),
    build: { ...config.build, outDir: dist, emptyOutDir: true },
    logLevel: 'silent',
  });
}, 60_000);

afterAll(() => rmSync(temporaryDir, { recursive: true, force: true }));

describe('packer build', () => {
  it('builds standalone UMD entries with working source maps and browser copies', () => {
    const files = readdirSync(dist);
    expect(files.filter((file) => file.endsWith('.umd.cjs')).sort()).toEqual([
      'pack.umd.cjs',
      'packer.umd.cjs',
      'unpack.umd.cjs',
    ]);
    for (const entry of ['packer', 'pack', 'unpack']) {
      for (const suffix of ['', '.min']) {
        const code = readFileSync(
          resolve(dist, `${entry}.umd${suffix}.cjs`),
          'utf8',
        );
        expect(
          readFileSync(
            resolve(temporaryDir, 'umd', `${entry}${suffix}.js`),
            'utf8',
          ),
        ).toBe(code);
        const map = JSON.parse(
          readFileSync(resolve(dist, `${entry}.umd${suffix}.cjs.map`), 'utf8'),
        );
        const sources = entry === 'packer' ? ['pack', 'unpack'] : [entry];
        for (const source of sources) {
          const marker = source === 'pack' ? 'JSON.stringify' : 'JSON.parse';
          expect(code).toContain(marker);
          const lines = code.slice(0, code.indexOf(marker)).split('\n');
          const original = new SourceMap(map).findEntry(
            lines.length - 1,
            lines[lines.length - 1].length,
          );
          expect(original.originalSource).toMatch(
            new RegExp(`/src/${source}\\.ts$`),
          );
        }
        expect(map.mappings.length).toBeGreaterThan(0);
      }
      expect(
        readFileSync(resolve(dist, `${entry}.umd.min.cjs`)).length,
      ).toBeLessThan(readFileSync(resolve(dist, `${entry}.umd.cjs`)).length);
    }
  });

  for (const mode of ['browser', 'commonjs', 'amd'] as const) {
    for (const suffix of ['', '.min']) {
      it(`round-trips events with standalone ${mode} UMD${suffix} exports`, () => {
        const packer = loadUMD(resolve(dist, `packer.umd${suffix}.cjs`), mode);
        const pack = loadUMD(resolve(dist, `pack.umd${suffix}.cjs`), mode);
        const unpack = loadUMD(resolve(dist, `unpack.umd${suffix}.cjs`), mode);
        expect(Object.keys(packer).sort()).toEqual(['pack', 'unpack']);
        expect(Object.keys(pack)).toEqual(['pack']);
        expect(Object.keys(unpack)).toEqual(['unpack']);
        expect(packer.unpack(packer.pack(event))).toEqual({
          ...event,
          v: 'v1',
        });
        expect(unpack.unpack(pack.pack(event))).toEqual({ ...event, v: 'v1' });
      });
    }
  }

  it('preserves default UMD exports and CSS minification without source maps', async () => {
    const fixture = resolve(temporaryDir, 'fixture.js');
    writeFileSync(
      fixture,
      "import './style.css'; export const version = 1; export default function answer() { return 42; }",
    );
    writeFileSync(resolve(temporaryDir, 'style.css'), 'body { color: red; }');
    const output = resolve(temporaryDir, 'fixture-dist');
    await build({
      configFile: false,
      root: packageDir,
      logLevel: 'silent',
      build: {
        lib: {
          entry: fixture,
          formats: ['cjs'],
          fileName: () => 'fixture.js',
          cssFileName: 'style',
        },
        outDir: output,
        sourcemap: false,
        minify: false,
      },
      plugins: [
        minifyAndUMDPlugin({
          name: 'rrwebPacker',
          outDir: 'fixture-dist',
          umdExport: 'default',
        }),
      ],
    });
    expect(readdirSync(output)).not.toContain('fixture.js.map');
    for (const suffix of ['', '.min']) {
      const answer = loadUMD(
        resolve(output, `fixture.umd${suffix}.cjs`),
        'browser',
      );
      expect(answer()).toBe(42);
    }
    expect(readFileSync(resolve(output, 'style.min.css'), 'utf8')).toContain(
      'body{color:red}',
    );
    expect(readdirSync(output)).toContain('style.min.css.map');
  }, 60_000);
});
