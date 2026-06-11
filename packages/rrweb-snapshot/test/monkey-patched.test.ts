/**
 * WebKit (Safari engine) test for monkey-patched DOM methods.
 *
 * Puppeteer/Chromium tests don't cover Safari-specific behaviour around
 * Object.getOwnPropertyDescriptor on built-in prototypes.  Run with:
 *
 *   yarn test:webkit
 *
 * Requires the playwright WebKit browser to be installed:
 *   npx playwright install webkit
 */
import * as fs from 'fs';
import * as http from 'http';
import * as path from 'path';
import * as url from 'url';
import { chromium, webkit, Browser, Page } from 'playwright';
const browserType = process.env.BROWSER === 'webkit' ? webkit : chromium;
import { afterAll, beforeAll, describe, expect, it, vi } from 'vite-plus/test';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));

function startServer(defaultPort = 3035): Promise<http.Server> {
  return new Promise((resolve) => {
    const mimeType: Record<string, string> = {
      '.html': 'text/html',
      '.js': 'text/javascript',
      '.css': 'text/css',
      '.png': 'image/png',
    };
    const s = http.createServer((req, res) => {
      const parsedUrl = url.parse(req.url!);
      const sanitizePath = path
        .normalize(parsedUrl.pathname!)
        .replace(/^(\.\.[\/\\])+/, '');
      const pathname = path.join(__dirname, sanitizePath);
      try {
        const data = fs.readFileSync(pathname);
        const ext = path.parse(pathname).ext;
        res.setHeader('Content-type', mimeType[ext] || 'text/plain');
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.end(data);
      } catch {
        res.end();
      }
    });
    s.listen(defaultPort)
      .on('listening', () => resolve(s))
      .on('error', () => {
        s.listen().on('listening', () => resolve(s));
      });
  });
}

function getServerURL(server: http.Server): string {
  const address = server.address();
  return address && typeof address !== 'string'
    ? `http://localhost:${address.port}`
    : String(address);
}

async function waitForRAF(page: Page): Promise<void> {
  await page.evaluate(
    () =>
      new Promise<void>((resolve) => {
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
      }),
  );
}

describe('WebKit: monkey-patched DOM methods', () => {
  vi.setConfig({ testTimeout: 30_000 });

  let server: http.Server;
  let serverURL: string;
  let browser: Browser;
  let code: string;

  beforeAll(async () => {
    server = await startServer();
    serverURL = getServerURL(server);
    browser = await browserType.launch();
    code = fs.readFileSync(
      path.resolve(__dirname, '../dist/rrweb-snapshot.umd.cjs'),
      'utf-8',
    );
  });

  afterAll(async () => {
    await browser.close();
    await server.close();
  });

  it('should snapshot without error when childNodes, contains, getRootNode and MutationObserver are monkey-patched', async () => {
    const page = await browser.newPage();
    page.on('console', (msg) => console.log('[webkit]', msg.text()));
    page.on('pageerror', (err) => {
      throw new Error(`Uncaught page error: ${err.message}`);
    });

    await page.goto(`${serverURL}/html/monkey-patched-elements.html`, {
      waitUntil: 'load',
    });
    await waitForRAF(page);

    // Verify the monkey-patch is actually in effect in this browser engine.
    // If WebKit silently ignores Object.defineProperty on Node.prototype,
    // the rest of this test is meaningless as a regression check.
    const patchActive = await page.evaluate(`
      (() => {
        try { document.body.childNodes; return false; }
        catch(e) { return e.message.includes('hijacked'); }
      })()
    `);
    expect(patchActive).toBe(true);

    const snapshotJSON = await page.evaluate(`
      ${code};
      JSON.stringify(rrwebSnapshot.snapshot(document), null, 2);
    `);

    expect(typeof snapshotJSON).toBe('string');
    const snap = JSON.parse(snapshotJSON as string);
    expect(snap).not.toBeNull();

    // The ul > li structure must have been traversed successfully via the
    // reverse-monkey-patched childNodes accessor.  If the fix doesn't work in
    // WebKit, snapshot() will throw or return a tree with missing li nodes.
    const raw = snapshotJSON as string;
    expect(raw).toContain('"tagName": "ul"');
    expect(raw).toContain('"tagName": "li"');
    // All four list items must appear
    for (const letter of ['a', 'b', 'c', 'd']) {
      expect(raw).toContain(`"textContent": "${letter}"`);
    }

    await page.close();
  });
});
