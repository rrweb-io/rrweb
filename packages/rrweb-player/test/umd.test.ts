import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { runInNewContext } from 'node:vm';
import { describe, expect, it } from 'vitest';

describe('player UMD bundles', () => {
  it.each(['rrweb-player.umd.cjs', 'rrweb-player.umd.min.cjs'])(
    '%s exposes the player constructor as the browser global',
    (filename) => {
      const bundle = readFileSync(
        fileURLToPath(new URL(`../dist/${filename}`, import.meta.url)),
        'utf8',
      );
      const browser = { rrwebPlayer: undefined };

      runInNewContext(bundle, browser);

      expect(browser.rrwebPlayer).toBeTypeOf('function');
    },
  );
});
