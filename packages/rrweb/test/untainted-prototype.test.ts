import * as fs from 'fs';
import * as path from 'path';
import * as url from 'url';
import type { Browser, Page } from 'playwright';
import { chromium, webkit } from 'playwright';
import ts from 'typescript';
import { afterAll, afterEach, beforeAll, beforeEach, expect, it } from 'vitest';

declare const rrwebUtils: typeof import('../../utils/src');

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const source = fs.readFileSync(
  path.resolve(__dirname, '../../utils/src/index.ts'),
  'utf-8',
);
const code = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2020,
  },
}).outputText;

let browser: Browser;
let page: Page;

beforeAll(async () => {
  browser = await (process.env.BROWSER === 'webkit'
    ? webkit
    : chromium
  ).launch();
});

beforeEach(async () => {
  page = await browser.newPage();
  page.setDefaultTimeout(5_000);
  await page.addScriptTag({
    content: `var rrwebUtils = {}; ((exports) => { ${code} })(rrwebUtils);`,
  });
});

afterEach(async () => {
  await page.close();
});

afterAll(async () => {
  await browser.close();
});

it('uses the Zone.js original without creating an iframe, even when the wrapper looks native', async () => {
  await page.addScriptTag({
    content: `
      window.originalMutationObserver = MutationObserver;
      window.native_MutationObserver = MutationObserver;
      window.Zone = { __symbol__: (key) => 'native_' + key };
      window.MutationObserver = function MutationObserver() {
        throw new Error('Zone.js wrapper must not be used');
      };
      MutationObserver.toString = () => originalMutationObserver.toString();
    `,
  });

  const result = await page.evaluate(() => {
    const [Observer] = rrwebUtils.mutationObserverCtor();
    return {
      usesOriginal:
        Observer === Reflect.get(window, 'originalMutationObserver'),
      cached: Observer === rrwebUtils.mutationObserverCtor()[0],
      iframeCount: document.querySelectorAll('iframe').length,
    };
  });

  expect(result).toEqual({ usesOriginal: true, cached: true, iframeCount: 0 });
});

it('uses the native constructor when Zone.js has no symbol helper', async () => {
  await page.addScriptTag({ content: 'window.Zone = {};' });

  const result = await page.evaluate(() => ({
    usesNative: rrwebUtils.mutationObserverCtor()[0] === MutationObserver,
    iframeCount: document.querySelectorAll('iframe').length,
  }));

  expect(result).toEqual({ usesNative: true, iframeCount: 0 });
});

it('keeps a sandbox observer working and exposes its iframe cleanup', async () => {
  await page.addScriptTag({
    content: `
      window.Zone = {};
      window.MutationObserver = function MutationObserver() {
        throw new Error('MutationObserver was patched');
      };
    `,
  });

  await page.evaluate(() => {
    const [MutationObserverCtor, cleanup] = rrwebUtils.mutationObserverCtor();
    const Observer = MutationObserverCtor as typeof MutationObserver;
    const observer = new Observer(() => {
      observer.disconnect();
      cleanup();
      document.body.dataset.observed = 'true';
    });
    observer.observe(document.body, { childList: true });
    document.body.appendChild(document.createElement('div'));
  });

  await page.waitForFunction(() => document.body.dataset.observed === 'true');
  expect(await page.locator('iframe').count()).toBe(0);
});

it('falls back to the page prototype when inserting the sandbox fails', async () => {
  const result = await page.evaluate(() => {
    Reflect.set(window, 'MutationObserver', function MutationObserver() {
      throw new Error('MutationObserver was patched');
    });
    document.body.appendChild = () => {
      throw new Error('Sandbox insertion failed');
    };

    return (
      rrwebUtils.getUntaintedPrototype('MutationObserver') ===
      MutationObserver.prototype
    );
  });

  expect(result).toBe(true);
});
