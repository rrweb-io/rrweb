import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { loadConfigFromFile, resolveConfig } from 'vite';

describe('rrweb-player Vite config', () => {
  it('resolves Svelte lifecycle APIs to the browser runtime', async () => {
    const configPath = path.resolve(__dirname, '../vite.config.ts');
    const loaded = await loadConfigFromFile(
      { command: 'build', mode: 'production' },
      configPath,
    );

    expect(loaded).toBeTruthy();

    const resolvedConfig = await resolveConfig(
      loaded!.config,
      'build',
      'production',
    );
    const resolve = resolvedConfig.createResolver({ asSrc: false });
    const svelteRuntime = await resolve(
      'svelte',
      path.resolve(__dirname, '../src/Player.svelte'),
    );

    expect(svelteRuntime?.replaceAll(path.sep, '/')).toContain(
      '/svelte/src/runtime/index.js',
    );
  });
});
