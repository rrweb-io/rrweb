import * as fs from 'fs';
import * as path from 'path';
import { launchPuppeteer, waitForRAF } from '../utils';
import { toMatchImageSnapshot } from 'jest-image-snapshot';
import type * as puppeteer from 'puppeteer';
import events from '../events/assets';
import mutationEvents from '../events/assets-mutation';
import assetsChangedEvents from '../events/assets-src-changed-before-asset-loaded';
import assetsBodyInlineStyleEvents from '../events/assets-body-inline-style';
import type { assetEvent } from '@rrweb/types';
import { vi } from 'vitest';

interface ISuite {
  code: string;
  browser: puppeteer.Browser;
  page: puppeteer.Page;
}

expect.extend({ toMatchImageSnapshot });

describe('replayer', function () {
  vi.setConfig({ testTimeout: 10_000 });

  let code: ISuite['code'];
  let browser: ISuite['browser'];
  let page: ISuite['page'];

  beforeAll(async () => {
    browser = await launchPuppeteer();

    const bundlePath = path.resolve(__dirname, '../../dist/rrweb.umd.cjs');
    code = fs.readFileSync(bundlePath, 'utf8');
  });

  beforeEach(async () => {
    page = await browser.newPage();
    await page.goto('about:blank');
    // mouse cursor canvas is large and pushes the replayer below the fold
    // lets hide it...
    await page.addStyleTag({
      content: '.replayer-mouse-tail{display: none !important;}',
    });
    await page.evaluate(code);
    await page.evaluate(`let events = ${JSON.stringify(events)}`);
    await page.evaluate(
      `let mutationEvents = ${JSON.stringify(mutationEvents)}`,
    );
    await page.evaluate(
      `let assetsChangedEvents = ${JSON.stringify(assetsChangedEvents)}`,
    );
    await page.evaluate(
      `let assetsBodyInlineStyleEvents = ${JSON.stringify(
        assetsBodyInlineStyleEvents,
      )}`,
    );

    page.on('console', (msg) => console.log('PAGE LOG:', msg.text()));
  });

  afterEach(async () => {
    await page.close();
  });

  afterAll(async () => {
    await browser.close();
  });

  describe('asset', () => {
    it('should incorporate assets emitted later', async () => {
      // incorprates a red square populated from an image asset
      // a navy background populated from a stylesheet asset
      // and a left green border from a style element asset
      await page.evaluate(`
      const { Replayer } = rrweb;
      const replayer = new Replayer(events, {
      });
      replayer.pause(0);
    `);

      await waitForRAF(page);

      const image = await page.screenshot();
      expect(image).toMatchImageSnapshot();
    });

    it('should incorporate assets streamed later', async () => {
      await page.evaluate(`
      const { Replayer } = rrweb;
      window.replayer = new Replayer([], {
        liveMode: true,
      });
      replayer.startLive();
      window.replayer.addEvent(events[0]);
      const fullSnapshot = events[1];

      // avoid the bit where we hold off attaching the snapshot while waiting for the css assets
      delete fullSnapshot.data.maxAssetDelay;
      window.replayer.addEvent(fullSnapshot);
    `);

      await waitForRAF(page);

      await page.evaluate(`
        window.replayer.addEvent(events[2]);
      `);

      await waitForRAF(page);

      const image = await page.screenshot();
      expect(image).toMatchImageSnapshot();
    });

    it('should wait for stylesheet assets to avoid fouc', async () => {
      // fouc = flash of unstyled content
      await page.evaluate(`
      const { Replayer } = rrweb;
      window.replayer = new Replayer([], {
        liveMode: true,
      });
      replayer.startLive();
      window.replayer.addEvent(events[0]);
      window.replayer.addEvent(events[1]);
      window.replayer.addEvent(events[2]);
    `);

      await waitForRAF(page);
      const image = await page.screenshot();
      expect(image).toMatchImageSnapshot(); // should be blank white and not have image rendered yet
    });

    it('should keep waiting for stylesheet assets when a sync mutation arrives first', async () => {
      // A live catch-up replays past-timestamped events synchronously. A sync
      // mutation must not abort the asset-wait by switching to the virtual dom
      // (which forks from the real document and would attach the snapshot early).
      await page.evaluate(`
      const { Replayer } = rrweb;
      window.replayer = new Replayer([], {
        liveMode: true,
      });
      replayer.startLive();
      window.replayer.addEvent(events[0]);
      window.replayer.addEvent(events[1]);
      window.replayer.addEvent({
        type: 3, // IncrementalSnapshot
        data: {
          source: 0, // Mutation
          texts: [],
          attributes: [],
          removes: [],
          adds: [
            {
              parentId: 14, // body
              nextId: null,
              node: {
                type: 2,
                tagName: 'div',
                attributes: {},
                childNodes: [],
                id: 1000,
              },
            },
          ],
        },
        timestamp: events[1].timestamp + 1,
      });
    `);

      await waitForRAF(page);

      // the snapshot must still be detached (held); nothing rebuilt into the iframe
      const attached = await page.evaluate(
        `!!document.querySelector('iframe').contentDocument.querySelector('img')`,
      );
      expect(attached).toBe(false);
    });

    it('should fall back to the original stylesheet url when its asset never arrives', async () => {
      // when the asset-wait budget elapses with the stylesheet asset still
      // missing (e.g. the recorder disconnected before uploading it), the
      // captured <link> should revert to an @import of its original href
      // rather than leave the page permanently unstyled
      await page.evaluate(`
      const { Replayer } = rrweb;
      window.replayer = new Replayer([], {
        liveMode: true,
      });
      replayer.startLive();
      window.replayer.addEvent(events[0]);
      window.replayer.addEvent(events[1]);
      // deliberately never add events[3]/events[4], the stylesheet assets
    `);

      // wait past the snapshot's maxAssetDelay (50) + 100ms margin
      await new Promise((resolve) => setTimeout(resolve, 300));

      const revertedToImport = await page.evaluate(`
        Array.from(
          document.querySelector('iframe').contentDocument.querySelectorAll('style'),
        ).some(
          (s) =>
            s.textContent.includes('@import') &&
            s.textContent.includes('example.com/style.css'),
        )
      `);
      expect(revertedToImport).toBe(true);
    });

    it('should fall back to the original stylesheet url when its asset never arrives', async () => {
      // when the asset-wait budget elapses with the stylesheet asset still
      // missing (e.g. the recorder disconnected before uploading it), the
      // captured <link> should revert to an @import of its original href
      // rather than leave the page permanently unstyled
      await page.evaluate(`
      const { Replayer } = rrweb;
      window.replayer = new Replayer([], {
        liveMode: true,
      });
      replayer.startLive();
      window.replayer.addEvent(events[0]);
      window.replayer.addEvent(events[1]);
      // deliberately never add events[3]/events[4], the stylesheet assets
    `);

      // wait past the snapshot's maxAssetDelay (50) + 100ms margin
      await new Promise((resolve) => setTimeout(resolve, 300));

      const revertedToImport = await page.evaluate(`
        Array.from(
          document.querySelector('iframe').contentDocument.querySelectorAll('style'),
        ).some(
          (s) =>
            s.textContent.includes('@import') &&
            s.textContent.includes('example.com/style.css'),
        )
      `);
      expect(revertedToImport).toBe(true);
    });

    it('replays a scroll that arrives during the attach pause, overriding initialOffset', async () => {
      // a scroll can't be applied to the detached (unrendered) tree, so it's
      // held and replayed after attach — where, being later, it must win over
      // the snapshot's restored initialOffset (top: 0)
      await page.evaluate(`
      const { Replayer } = rrweb;
      window.replayer = new Replayer([], {
        liveMode: true,
      });
      replayer.startLive();
      window.replayer.addEvent(events[0]);
      window.replayer.addEvent(events[1]);
      // make the document scrollable; applies to the detached tree during the pause
      window.replayer.addEvent({
        type: 3, // IncrementalSnapshot
        data: {
          source: 0, // Mutation
          texts: [],
          attributes: [],
          removes: [],
          adds: [
            {
              parentId: 14, // body
              nextId: null,
              node: {
                type: 2,
                tagName: 'div',
                attributes: { style: 'height: 5000px;' },
                childNodes: [],
                id: 2000,
              },
            },
          ],
        },
        timestamp: events[1].timestamp + 1,
      });
      // scroll the document (id 1) during the pause
      window.replayer.addEvent({
        type: 3, // IncrementalSnapshot
        data: { source: 3 /* Scroll */, id: 1, x: 0, y: 200 },
        timestamp: events[1].timestamp + 2,
      });
      // deliver the stylesheet assets to release the pause and attach
      window.replayer.addEvent(events[3]);
      window.replayer.addEvent(events[4]);
    `);

      await waitForRAF(page);

      const scrollY = await page.evaluate(
        `document.querySelector('iframe').contentWindow.scrollY`,
      );
      expect(scrollY).toBe(200);
    });

    it('holds the frame when a per-element StyleSheetRule arrives during the pause', async () => {
      // a rule mutation on a detached <style> (null .sheet) must be queued and
      // flushed at attach, not force the frame to reveal early
      await page.evaluate(`
      const { Replayer } = rrweb;
      window.replayer = new Replayer([], {
        liveMode: true,
      });
      replayer.startLive();
      window.replayer.addEvent(events[0]);
      window.replayer.addEvent(events[1]);
      window.replayer.addEvent({
        type: 3, // IncrementalSnapshot
        data: {
          source: 8, // StyleSheetRule
          id: 24, // the <style> element in the fixture
          adds: [{ rule: '.injected-during-pause { color: red; }', index: 0 }],
        },
        timestamp: events[1].timestamp + 1,
      });
    `);

      await waitForRAF(page);

      const attached = await page.evaluate(
        `!!document.querySelector('iframe').contentDocument.querySelector('img')`,
      );
      expect(attached).toBe(false);
    });

    it('attaches nested iframes added during the attach pause on flush', async () => {
      await page.evaluate(`
      const { Replayer } = rrweb;
      window.replayer = new Replayer([], {
        liveMode: true,
      });
      replayer.startLive();
      window.replayer.addEvent(events[0]);
      window.replayer.addEvent(events[1]);
      // during the pause: add an outer iframe element to the (detached) body
      window.replayer.addEvent({
        type: 3, // IncrementalSnapshot
        data: {
          source: 0, // Mutation
          texts: [],
          attributes: [],
          removes: [],
          adds: [
            {
              parentId: 14, // body
              nextId: null,
              node: {
                type: 2,
                tagName: 'iframe',
                attributes: { id: 'outer' },
                childNodes: [],
                id: 100,
              },
            },
          ],
        },
        timestamp: events[1].timestamp + 1,
      });
      // its document, containing a nested iframe element (isAttachIframe)
      window.replayer.addEvent({
        type: 3,
        data: {
          source: 0,
          texts: [],
          attributes: [],
          removes: [],
          isAttachIframe: true,
          adds: [
            {
              parentId: 100, // the outer iframe
              nextId: null,
              node: {
                type: 0,
                id: 101,
                childNodes: [
                  { type: 1, name: 'html', publicId: '', systemId: '', rootId: 101, id: 102 },
                  {
                    type: 2, tagName: 'html', attributes: {}, rootId: 101, id: 103,
                    childNodes: [
                      { type: 2, tagName: 'head', attributes: {}, childNodes: [], rootId: 101, id: 104 },
                      {
                        type: 2, tagName: 'body', attributes: {}, rootId: 101, id: 105,
                        childNodes: [
                          { type: 2, tagName: 'iframe', attributes: { id: 'inner' }, childNodes: [], rootId: 101, id: 106 },
                        ],
                      },
                    ],
                  },
                ],
              },
            },
          ],
        },
        timestamp: events[1].timestamp + 2,
      });
      // the nested iframe's document (parent 106 is not built yet -> newDocumentQueue)
      window.replayer.addEvent({
        type: 3,
        data: {
          source: 0,
          texts: [],
          attributes: [],
          removes: [],
          isAttachIframe: true,
          adds: [
            {
              parentId: 106, // the nested iframe
              nextId: null,
              node: {
                type: 0,
                id: 107,
                childNodes: [
                  { type: 1, name: 'html', publicId: '', systemId: '', rootId: 107, id: 108 },
                  {
                    type: 2, tagName: 'html', attributes: {}, rootId: 107, id: 109,
                    childNodes: [
                      { type: 2, tagName: 'head', attributes: {}, childNodes: [], rootId: 107, id: 110 },
                      {
                        type: 2, tagName: 'body', attributes: {}, rootId: 107, id: 111,
                        childNodes: [
                          {
                            type: 2, tagName: 'div', attributes: { id: 'inner-marker' }, rootId: 107, id: 112,
                            childNodes: [{ type: 3, textContent: 'nested content', rootId: 107, id: 113 }],
                          },
                        ],
                      },
                    ],
                  },
                ],
              },
            },
          ],
        },
        timestamp: events[1].timestamp + 3,
      });
    `);

      // still held: nothing attached into the replayer iframe yet
      const heldBeforeAssets = await page.evaluate(
        `!!document.querySelector('iframe').contentDocument.querySelector('#outer')`,
      );
      expect(heldBeforeAssets).toBe(false);

      // deliver the stylesheet assets to release the pause and attach
      await page.evaluate(`
        window.replayer.addEvent(events[3]);
        window.replayer.addEvent(events[4]);
      `);
      await waitForRAF(page);

      const nestedText = await page.evaluate(`
        (function () {
          const rep = document.querySelector('iframe').contentDocument;
          const outer = rep.querySelector('iframe#outer');
          if (!outer || !outer.contentDocument) return 'NO_OUTER';
          const inner = outer.contentDocument.querySelector('iframe#inner');
          if (!inner || !inner.contentDocument) return 'NO_INNER';
          const marker = inner.contentDocument.querySelector('#inner-marker');
          return marker ? marker.textContent : 'NO_MARKER';
        })()
      `);
      expect(nestedText).toBe('nested content');
    });

    it('should support urls src modified via incremental mutation', async () => {
      await page.evaluate(`
      const { Replayer } = rrweb;
      window.replayer = new Replayer([], {
        liveMode: true,
      });
      replayer.startLive(mutationEvents[0].timestamp);
      window.replayer.addEvent(mutationEvents[0]);
      window.replayer.addEvent(mutationEvents[1]);
      window.replayer.addEvent(mutationEvents[2]);
    `);

      await waitForRAF(page);

      await page.evaluate(`
        window.replayer.addEvent(mutationEvents[3]);
      `);

      await waitForRAF(page);

      const image = await page.screenshot();
      expect(image).toMatchImageSnapshot();
    });

    it("on mutation should add bogus src attribute until the asset is loaded so chrome doesn't display broken image icon", async () => {
      await page.evaluate(`
      const { Replayer } = rrweb;
      window.replayer = new Replayer([], {
        liveMode: true,
      });
      replayer.startLive(mutationEvents[0].timestamp);
      window.replayer.addEvent(mutationEvents[0]);
      window.replayer.addEvent(mutationEvents[1]);
      window.replayer.addEvent(mutationEvents[2]);
    `);

      await waitForRAF(page);

      const loadingImage = await page.screenshot();
      expect(loadingImage).toMatchImageSnapshot({
        customSnapshotIdentifier: 'asset-integration-test-ts-loading',
        failureThreshold: 0.02,
        failureThresholdType: 'percent',
      });

      expect(
        await page.evaluate(
          `document.querySelector('iframe').contentDocument.querySelector('img').getAttribute('src')`,
        ),
      ).toBe('//:0');

      await page.evaluate(`
        window.replayer.addEvent(mutationEvents[3]);
      `);

      await waitForRAF(page);

      const image = await page.screenshot();
      expect(image).toMatchImageSnapshot();
    });

    it('should wait with adding src attribute until the asset is loaded 2', async () => {
      await page.evaluate(`
      const { Replayer } = rrweb;
      window.replayer = new Replayer([], {
        liveMode: true,
      });
      replayer.startLive(events[0].timestamp);
      window.replayer.addEvent(events[0]);
      const fullSnapshot = events[1];

      // avoid the bit where we hold off attaching the snapshot while waiting for the css assets
      delete fullSnapshot.data.maxAssetDelay;
      window.replayer.addEvent(fullSnapshot);
    `);

      await waitForRAF(page);

      expect(
        await page.evaluate(
          `document.querySelector('iframe').contentDocument.querySelector('img').getAttribute('src')`,
        ),
      ).toBe('//:0');

      await page.evaluate(`
        window.replayer.addEvent(events[2]);
      `);

      await waitForRAF(page);

      const image = await page.screenshot();
      expect(image).toMatchImageSnapshot({
        failureThreshold: 0.02,
        failureThresholdType: 'percent',
      });
    });

    it('should show the correct asset when assets are loading while src is changed in live mode', async () => {
      await page.evaluate(`
      const { Replayer } = rrweb;
      window.replayer = new Replayer([], {
        liveMode: true,
      });
      replayer.startLive(assetsChangedEvents[0].timestamp);
      window.replayer.addEvent(assetsChangedEvents[0]);
      window.replayer.addEvent(assetsChangedEvents[1]);
      window.replayer.addEvent(assetsChangedEvents[2]);
      window.replayer.addEvent(assetsChangedEvents[3]);
      window.replayer.addEvent(assetsChangedEvents[4]);
    `);

      await waitForRAF(page);

      const image = await page.screenshot();
      expect(image).toMatchImageSnapshot({
        failureThreshold: 0.04,
        failureThresholdType: 'percent',
      });
    });

    it('should show the loaded asset (robot) in non-live mode', async () => {
      await page.evaluate(`
      const { Replayer } = rrweb;
      window.replayer = new Replayer(assetsChangedEvents);
      replayer.pause((assetsChangedEvents[2].timestamp - assetsChangedEvents[0].timestamp) + 1);
    `);

      await waitForRAF(page);

      const image = await page.screenshot();
      expect(image).toMatchImageSnapshot({
        failureThreshold: 0.04,
        failureThresholdType: 'percent',
      });
    });

    it('should show the loaded asset (red square) in non-live mode', async () => {
      await page.evaluate(`
      const { Replayer } = rrweb;
      window.replayer = new Replayer(assetsChangedEvents);
      replayer.pause((assetsChangedEvents[1].timestamp - assetsChangedEvents[0].timestamp) + 1);
  `);

      await waitForRAF(page);

      const image = await page.screenshot();
      expect(image).toMatchImageSnapshot();
    });

    it('should list original url in non-live mode when asset never gets loaded', async () => {
      await page.evaluate(`
      const { Replayer } = rrweb;
      window.replayer = new Replayer([assetsChangedEvents[0], assetsChangedEvents[1]]);
      replayer.pause(assetsChangedEvents[1].timestamp);
    `);

      await waitForRAF(page);

      const image = await page.screenshot();
      expect(image).toMatchImageSnapshot({
        failureThreshold: 30,
      });
    });

    it('should list original url in non-live mode when asset fails to load', async () => {
      const failedEvent: assetEvent & { timestamp: number } = {
        type: 7,
        data: {
          url: 'ftp://example.com/red.png',
          failed: {
            status: 404,
            message: 'Not Found',
          },
        },
        timestamp: assetsChangedEvents[2].timestamp,
      };
      await page.evaluate(`
      const { Replayer } = rrweb;
      window.replayer = new Replayer([assetsChangedEvents[0], assetsChangedEvents[1], ${JSON.stringify(
        failedEvent,
      )}]);
      replayer.pause(assetsChangedEvents[1].timestamp);
    `);

      await waitForRAF(page);

      const image = await page.screenshot();
      expect(image).toMatchImageSnapshot({
        failureThreshold: 30,
      });

      expect(
        await page.evaluate(
          `document.querySelector('iframe').contentDocument.querySelector('img').getAttribute('src')`,
        ),
      ).toMatchInlineSnapshot(`"ftp://example.com/red.png"`);
    });
  });

  it('should correctly rebuild style elements within the body', async () => {
    await page.evaluate(`
      const { Replayer } = rrweb;
      window.replayer = new Replayer(assetsBodyInlineStyleEvents.filter(e=>e.type!==7));
      replayer.pause((assetsBodyInlineStyleEvents[2].timestamp - assetsBodyInlineStyleEvents[0].timestamp) + 1);
      // make asset events available after rebuild so preloadedStatus.status in asset manager is not 'loaded'
      assetsBodyInlineStyleEvents.filter(e=>e.type===7).forEach(assetEvent=>replayer.addEvent(assetEvent));
      replayer.pause((assetsBodyInlineStyleEvents[assetsBodyInlineStyleEvents.length - 1].timestamp - assetsBodyInlineStyleEvents[0].timestamp) + 1);
  `);

    await waitForRAF(page);

    const image = await page.screenshot();
    expect(image).toMatchImageSnapshot();
  });
});
