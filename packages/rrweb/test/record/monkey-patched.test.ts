/**
 * WebKit (Safari engine) test for monkey-patched MutationObserver.
 *
 * When a framework hijacks MutationObserver before rrweb loads, the recorder
 * must fall back to an iframe to obtain the real native constructor.
 * This test verifies that DOM mutations are still captured as IncrementalSnapshot
 * events (source: MutationData) in WebKit under these conditions.
 *
 * Run with:  yarn test:webkit  (in packages/rrweb)
 *
 * Requires the playwright WebKit browser to be installed:
 *   npx playwright install webkit
 */
import * as fs from 'fs';
import * as http from 'http';
import * as path from 'path';
import * as url from 'url';
import { chromium, webkit, Browser } from 'playwright';
const browserType = process.env.BROWSER === 'webkit' ? webkit : chromium;
import { afterAll, beforeAll, describe, expect, it, vi } from 'vite-plus/test';
import { EventType, IncrementalSource, eventWithTime } from '@rrweb/types';
import { getServerURL, startServer, waitForRAF } from '../utils';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));

describe('WebKit: monkey-patched MutationObserver', () => {
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
      path.resolve(__dirname, '../../dist/rrweb.umd.cjs'),
      'utf-8',
    );
  });

  afterAll(async () => {
    await browser.close();
    await server.close();
  });

  it('should record DOM mutations when MutationObserver is monkey-patched', async () => {
    const page = await browser.newPage();
    page.on('console', (msg) => console.log('[webkit]', msg.text()));
    page.on('pageerror', (err) => {
      throw new Error(`Uncaught page error: ${err.message}`);
    });

    await page.goto(`${serverURL}/html/monkey-patched-mutation.html`, {
      waitUntil: 'load',
    });
    await waitForRAF(page);

    // Verify MutationObserver is actually patched in this engine.
    const patchActive = await page.evaluate(`
      (() => {
        try { new MutationObserver(() => {}); return false; }
        catch(e) { return e.message.includes('hijacked'); }
      })()
    `);
    expect(patchActive).toBe(true);

    // Store events in window so they can be retrieved synchronously via evaluate.
    await page.evaluate(`
      ${code};
      window.__rrwebEvents = [];
      window.__rrwebStop = rrweb.record({ emit: (e) => window.__rrwebEvents.push(e) });
      console.log('[rrweb] record started, stop fn:', typeof window.__rrwebStop);
    `);
    await waitForRAF(page);

    // Trigger a DOM mutation.
    await page.evaluate(`
      const li = document.createElement('li');
      li.textContent = 'b';
      document.getElementById('list').appendChild(li);
      console.log('[rrweb] mutation triggered, events so far:', window.__rrwebEvents.length);
    `);

    await waitForRAF(page);
    await waitForRAF(page);
    await waitForRAF(page);

    const events = (await page.evaluate(
      `JSON.parse(JSON.stringify(window.__rrwebEvents))`,
    )) as eventWithTime[];
    console.log(
      '[test] total events:',
      events.length,
      events.map((e: eventWithTime) => e.type),
    );

    const mutationEvents = events.filter(
      (e) =>
        e.type === EventType.IncrementalSnapshot &&
        (e.data as { source: number }).source === IncrementalSource.Mutation,
    );

    expect(mutationEvents.length).toBeGreaterThan(0);

    await page.close();
  });
});
