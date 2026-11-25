import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { runInNewContext } from 'node:vm';
import { describe, expect, it } from 'vitest';

describe('player UMD bundles', () => {
  it.each(['rrweb-player.umd.cjs', 'rrweb-player.umd.min.cjs'])(
    '%s exposes the player constructor in browser, CommonJS, and AMD loaders',
    (filename) => {
      const bundle = readFileSync(
        fileURLToPath(new URL(`../dist/${filename}`, import.meta.url)),
        'utf8',
      );
      const browser = { rrwebPlayer: undefined };

      runInNewContext(bundle, browser);

      expect(browser.rrwebPlayer).toBeTypeOf('function');

      const commonjs = { module: { exports: {} }, exports: {} };
      runInNewContext(bundle, commonjs);
      expect(commonjs.module.exports).toBeTypeOf('function');

      let amdExport: unknown;
      const define = Object.assign(
        (name: string, dependencies: string[], factory: () => unknown) => {
          expect(name).toBe('rrwebPlayer');
          expect(dependencies).toEqual([]);
          amdExport = factory();
        },
        { amd: true },
      );
      runInNewContext(bundle, { define });
      expect(amdExport).toBeTypeOf('function');
    },
  );
});
