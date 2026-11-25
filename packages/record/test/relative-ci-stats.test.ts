import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { OutputBundle, OutputOptions, Plugin } from 'rollup';
import { afterEach, describe, expect, it } from 'vitest';

import createViteConfig from '../../../vite.config.default';

const temporaryDirectories: string[] = [];

afterEach(() => {
  delete process.env.RELATIVE_CI_STATS;
  for (const directory of temporaryDirectories.splice(0)) {
    rmSync(directory, { recursive: true, force: true });
  }
});

function chunk(fileName: string): OutputBundle {
  return {
    [fileName]: {
      type: 'chunk',
      code: `export const format = '${fileName}';`,
      dynamicImports: [],
      exports: ['format'],
      facadeModuleId: '/src/index.ts',
      fileName,
      implicitlyLoadedBefore: [],
      importedBindings: {},
      imports: [],
      isDynamicEntry: false,
      isEntry: true,
      isImplicitEntry: false,
      map: null,
      moduleIds: ['/src/index.ts'],
      modules: {
        '/src/index.ts': {
          code: null,
          originalLength: 40,
          removedExports: [],
          renderedExports: ['format'],
          renderedLength: 32,
        },
      },
      name: 'index',
      preliminaryFileName: fileName,
      referencedFiles: [],
      sourcemapFileName: null,
    },
  };
}

async function runHook(
  plugin: Plugin,
  hookName: 'generateBundle' | 'closeBundle',
  args: unknown[],
) {
  const hook = plugin[hookName];
  if (!hook) return;
  const handler = typeof hook === 'function' ? hook : hook.handler;
  await handler.apply(
    {
      debug() {},
      error(error: unknown): never {
        throw error;
      },
      info() {},
      warn() {},
    } as never,
    args as never,
  );
}

describe('RelativeCI bundle stats', () => {
  it('reports every top-level distributable produced for a package', async () => {
    const outputDirectory = mkdtempSync(join(tmpdir(), 'rrweb-stats-'));
    temporaryDirectories.push(outputDirectory);
    process.env.RELATIVE_CI_STATS = 'true';

    const configFactory = createViteConfig('/src/index.ts', 'test-bundle', {
      outputDir: outputDirectory,
    });
    const config =
      typeof configFactory === 'function'
        ? configFactory({
            command: 'build',
            isPreview: false,
            isSsrBuild: false,
            mode: 'production',
          })
        : configFactory;
    const statsPlugins: Plugin[] = [];
    for (const plugin of config.plugins || []) {
      if (
        plugin &&
        typeof plugin === 'object' &&
        'name' in plugin &&
        (plugin.name === 'webpackStats' ||
          plugin.name.startsWith('relative-ci'))
      ) {
        statsPlugins.push(plugin);
      }
    }

    for (const [format, fileName] of [
      ['es', 'test-bundle.js'],
      ['cjs', 'test-bundle.cjs'],
    ] as const) {
      for (const plugin of statsPlugins) {
        await runHook(plugin, 'generateBundle', [
          { dir: outputDirectory, format } satisfies OutputOptions,
          chunk(fileName),
          true,
        ]);
      }
    }

    for (const [fileName, contents] of [
      ['test-bundle.js', 'esm'],
      ['test-bundle.cjs', 'commonjs'],
      ['test-bundle.umd.cjs', 'umd'],
      ['test-bundle.umd.min.cjs', 'minified'],
      ['style.css', 'css'],
      ['style.min.css', 'minified css'],
      ['worker.mjs', 'module worker'],
      ['test-bundle.cjs.map', 'not a distributable'],
      ['index.d.ts', 'not a distributable'],
    ]) {
      writeFileSync(join(outputDirectory, fileName), contents);
    }
    mkdirSync(join(outputDirectory, 'nested'));
    writeFileSync(join(outputDirectory, 'nested/ignored.js'), 'nested output');
    mkdirSync(join(outputDirectory, 'directory.js'));

    for (const plugin of statsPlugins) {
      await runHook(plugin, 'closeBundle', []);
    }

    const stats = JSON.parse(
      readFileSync(join(outputDirectory, 'webpack-stats.json'), 'utf8'),
    ) as {
      assets: { name: string; size: number }[];
      chunks: { id: string | number; files: string[] }[];
      modules: { name: string; size: number; chunks: (string | number)[] }[];
    };

    expect(stats.assets.map(({ name }) => name).sort()).toEqual([
      'style.css',
      'style.min.css',
      'test-bundle.cjs',
      'test-bundle.js',
      'test-bundle.umd.cjs',
      'test-bundle.umd.min.cjs',
      'worker.mjs',
    ]);
    expect(
      stats.assets.find(({ name }) => name === 'test-bundle.js')?.size,
    ).toBe(3);
    expect(
      stats.assets.find(({ name }) => name === 'test-bundle.umd.min.cjs')?.size,
    ).toBe(8);
    expect(stats.chunks.flatMap(({ files }) => files)).toEqual([
      'test-bundle.js',
    ]);
    expect(new Set(stats.chunks.map(({ id }) => id)).size).toBe(1);
    expect(stats.modules).toHaveLength(1);
    expect(stats.modules[0].size).toBe(32);
    expect(new Set(stats.modules[0].chunks)).toEqual(
      new Set(stats.chunks.map(({ id }) => id)),
    );
  });
});
