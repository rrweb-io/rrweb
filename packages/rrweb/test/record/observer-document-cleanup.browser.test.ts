import * as fs from 'fs';
import * as path from 'path';
import { chromium, webkit, type Browser, type Page } from 'playwright';
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
} from 'vitest';
import {
  EventType,
  IncrementalSource,
  type eventWithTime,
  type listenerHandler,
} from '@rrweb/types';
import type record from '../../src/record';
import { waitForRAF } from '../utils';

declare const rrweb: { record: typeof record };
declare const rrwebUtils: typeof import('@rrweb/utils');

declare global {
  interface Window {
    observerCleanupOriginalAttachShadow: typeof Element.prototype.attachShadow;
    observerCleanupTest: {
      record: typeof record;
      stop: listenerHandler;
      events: eventWithTime[];
      active: Map<MutationObserver, Node>;
      oldRoots: Node[];
      nestedRoots: Node[];
      allRoots: Node[];
    };
  }
}

// BROWSER=webkit runs the same real lifecycle checks against Safari's engine.
const browserType = process.env.BROWSER === 'webkit' ? webkit : chromium;

describe('document cleanup across browser iframe lifetimes', () => {
  let browser: Browser;
  let page: Page;
  let code: string;

  beforeAll(async () => {
    browser = await browserType.launch();
    code = fs.readFileSync(
      path.resolve(__dirname, '../../dist/rrweb.umd.cjs'),
      'utf8',
    );
  });
  afterAll(async () => browser?.close());
  afterEach(async () => page?.close());
  beforeEach(async () => {
    page = await browser.newPage();
    await page.setContent(`<!doctype html><body>
      <iframe id="target" srcdoc="<p>target</p>"></iframe>
      <iframe id="sibling" srcdoc="<p>sibling</p>"></iframe>
    </body>`);
  });

  async function start() {
    await page.addScriptTag({ content: code });
    await page.evaluate(() => {
      const active = new Map<MutationObserver, Node>();
      const originalObserve = MutationObserver.prototype.observe;
      const originalDisconnect = MutationObserver.prototype.disconnect;
      // Track real native observers without replacing their constructor or callbacks.
      MutationObserver.prototype.observe = function (target, options) {
        originalObserve.call(this, target, options);
        active.set(this, target);
      };
      MutationObserver.prototype.disconnect = function () {
        originalDisconnect.call(this);
        active.delete(this);
      };
      function shadow(doc: Document, parent: Node = doc.body) {
        const host = doc.createElement('x-card');
        const root = host.attachShadow({ mode: 'open' });
        root.innerHTML = '<span>shadow</span>';
        parent.appendChild(host);
        return root;
      }
      const frameDoc =
        document.querySelector<HTMLIFrameElement>('#target')!.contentDocument!;
      const siblingDoc =
        document.querySelector<HTMLIFrameElement>('#sibling')!.contentDocument!;
      const mainShadow = shadow(document);
      const siblingShadow = shadow(siblingDoc);
      const outer = shadow(frameDoc);
      const inner = shadow(frameDoc, outer);
      const nested = frameDoc.createElement('iframe');
      frameDoc.body.appendChild(nested);
      const nestedDoc = nested.contentDocument!;
      const nestedShadow = shadow(nestedDoc);
      const events: eventWithTime[] = [];
      const stop = rrweb.record({ emit: (event) => events.push(event) });
      if (!stop) throw new Error('Recorder did not start');
      window.observerCleanupTest = {
        active,
        oldRoots: [frameDoc, outer, inner],
        nestedRoots: [nestedDoc, nestedShadow],
        allRoots: [
          document,
          mainShadow,
          siblingDoc,
          siblingShadow,
          frameDoc,
          outer,
          inner,
          nestedDoc,
          nestedShadow,
        ],
        events,
        record: rrweb.record,
        stop,
      };
    });
    await waitForRAF(page);
    const observed = await page.evaluate(() => {
      const { active, oldRoots, nestedRoots } = window.observerCleanupTest;
      return [...oldRoots, ...nestedRoots].map((root) =>
        [...active.values()].includes(root),
      );
    });
    expect(observed).toEqual([true, true, true, true, true]);
  }

  it('disconnects shadow observers when their iframe is removed', async () => {
    await start();
    await page.evaluate(() => document.querySelector('#target')!.remove());
    await waitForRAF(page);

    const observed = await page.evaluate(() => {
      const { active, oldRoots } = window.observerCleanupTest;
      return oldRoots.map((root) => [...active.values()].includes(root));
    });
    expect(observed).toEqual([false, false, false]);
  });

  it('disconnects shadow observers in nested iframe documents when their ancestor is removed', async () => {
    await start();
    await page.evaluate(() => document.querySelector('#target')!.remove());
    await waitForRAF(page);

    const observed = await page.evaluate(() => {
      const { active, nestedRoots } = window.observerCleanupTest;
      return nestedRoots.map((root) => [...active.values()].includes(root));
    });
    expect(observed).toEqual([false, false]);
  });

  it('disconnects the old document shadow observers after srcdoc navigation', async () => {
    await start();
    await page.evaluate(
      () =>
        new Promise<void>((resolve) => {
          const iframe = document.querySelector<HTMLIFrameElement>('#target')!;
          iframe.addEventListener('load', () => resolve(), { once: true });
          iframe.srcdoc = '<p>new document</p>';
        }),
    );
    await waitForRAF(page);

    const observed = await page.evaluate(() => {
      const { active, oldRoots } = window.observerCleanupTest;
      return oldRoots.map((root) => [...active.values()].includes(root));
    });
    expect(observed).toEqual([false, false, false]);
  });

  it('attaches a navigated iframe once after repeated checkouts', async () => {
    await start();
    for (let checkout = 0; checkout < 3; checkout++) {
      await page.evaluate(() =>
        window.observerCleanupTest.record.takeFullSnapshot(true),
      );
      await waitForRAF(page);
    }
    await page.evaluate(() => {
      window.observerCleanupTest.events.length = 0;
      document.querySelector<HTMLIFrameElement>('#target')!.srcdoc =
        '<p>new</p>';
    });
    await page.waitForFunction(
      () =>
        document.querySelector<HTMLIFrameElement>('#target')!.contentDocument
          ?.body?.textContent === 'new',
    );
    await waitForRAF(page);
    const attachments = await page.evaluate(
      () =>
        window.observerCleanupTest.events.filter(
          (event) =>
            event.type === 3 &&
            event.data.source === 0 &&
            event.data.isAttachIframe,
        ).length,
    );
    expect(attachments).toBe(1);
  });

  it('restores iframe shadow patches after checkout followed by unload', async () => {
    const original = await page.evaluateHandle(
      () =>
        document
          .querySelector<HTMLIFrameElement>('#target')!
          .contentDocument!.createElement('div').attachShadow,
    );
    await start();
    for (let checkout = 0; checkout < 3; checkout++) {
      await page.evaluate(() =>
        window.observerCleanupTest.record.takeFullSnapshot(true),
      );
      await waitForRAF(page);
    }
    await page.evaluate(() => {
      document
        .querySelector<HTMLIFrameElement>('#target')!
        .contentWindow!.dispatchEvent(new PageTransitionEvent('pagehide'));
    });
    expect(
      await page.evaluate(
        (original) =>
          document
            .querySelector<HTMLIFrameElement>('#target')!
            .contentDocument!.createElement('div').attachShadow === original,
        original,
      ),
    ).toBe(true);
    await original.dispose();
  });

  it('restores the new realm after navigation from an initial about:blank iframe', async () => {
    await page.evaluate(
      () =>
        new Promise<void>((resolve) => {
          const iframe = document.querySelector<HTMLIFrameElement>('#target')!;
          iframe.addEventListener('load', () => resolve(), { once: true });
          iframe.removeAttribute('srcdoc');
        }),
    );
    await start();
    await page.evaluate(
      () =>
        new Promise<void>((resolve) => {
          const iframe = document.querySelector<HTMLIFrameElement>('#target')!;
          iframe.addEventListener('load', () => resolve(), { once: true });
          iframe.srcdoc = `<script>parent.observerCleanupOriginalAttachShadow = Element.prototype.attachShadow;</script><p>new realm</p>`;
        }),
    );
    await waitForRAF(page);
    const state = await page.evaluate(() => {
      const { active, oldRoots, stop } = window.observerCleanupTest;
      const oldDocumentObserved = [...active.values()].includes(oldRoots[0]);
      const doc =
        document.querySelector<HTMLIFrameElement>('#target')!.contentDocument!;
      stop();
      return {
        oldDocumentObserved,
        restored:
          doc.createElement('div').attachShadow ===
          window.observerCleanupOriginalAttachShadow,
        newDocumentObserved: [...active.values()].includes(doc),
      };
    });
    expect(state).toEqual({
      oldDocumentObserved: false,
      restored: true,
      newDocumentObserved: false,
    });
  });

  it('keeps recording parent and sibling shadows after another iframe unloads', async () => {
    await start();
    await page.evaluate(() => {
      document.querySelector('#target')!.remove();
    });
    await waitForRAF(page);
    const expectedIds = await page.evaluate(() => {
      const state = window.observerCleanupTest;
      state.events.length = 0;
      const siblingDoc =
        document.querySelector<HTMLIFrameElement>('#sibling')!.contentDocument!;
      return [document, siblingDoc].map((doc) => {
        const span =
          doc.querySelector('x-card')!.shadowRoot!.firstElementChild!;
        const id = state.record.mirror.getId(span);
        span.setAttribute('data-live', 'true');
        return id;
      });
    });
    await waitForRAF(page);
    const attributeIds = await page.evaluate(() =>
      window.observerCleanupTest.events.flatMap((event) =>
        event.type === 3 && event.data.source === 0
          ? event.data.attributes.map(({ id }) => id)
          : [],
      ),
    );
    expect(attributeIds.sort()).toEqual(expectedIds.sort());
  });

  it('cleans all observers on stop after nested documents have unloaded', async () => {
    await start();
    await page.evaluate(() => document.querySelector('#target')!.remove());
    await waitForRAF(page);
    await page.evaluate(() => window.observerCleanupTest.stop());

    expect(
      await page.evaluate(() => {
        const { active, allRoots } = window.observerCleanupTest;
        return [...active.values()].filter((root) => allRoots.includes(root))
          .length;
      }),
    ).toBe(0);
  });

  it.each([
    { sampling: 'all' as const, frames: 2, workers: 0 },
    { sampling: 10, frames: 1, workers: 1 },
  ])(
    'cancels canvas $sampling loops, workers, and queued callbacks at stop',
    async ({ sampling, frames: expectedFrames, workers }) => {
      await page.addScriptTag({ content: code });
      const counts = await page.evaluate((sampling) => {
        const frames = new Map<number, FrameRequestCallback>();
        let nextId = 0;
        let terminated = 0;
        const originalRequest = window.requestAnimationFrame;
        const originalCancel = window.cancelAnimationFrame;
        const OriginalWorker = window.Worker;
        window.Worker = class extends OriginalWorker {
          terminate() {
            terminated++;
            super.terminate();
          }
        };
        window.requestAnimationFrame = (callback) => {
          frames.set(++nextId, callback);
          return nextId;
        };
        window.cancelAnimationFrame = (id) => {
          frames.delete(id);
        };
        try {
          const stop = rrweb.record({
            recordCanvas: true,
            recordDOM: false,
            sampling: { canvas: sampling },
            emit: () => undefined,
          });
          if (!stop) throw new Error('Canvas recorder did not start');
          const before = frames.size;
          const queued = [...frames.values()];
          stop();
          const afterStop = frames.size;
          queued.forEach((callback) => callback(100));
          return { before, afterStop, afterQueued: frames.size, terminated };
        } finally {
          window.requestAnimationFrame = originalRequest;
          window.cancelAnimationFrame = originalCancel;
          window.Worker = OriginalWorker;
        }
      }, sampling);
      expect(counts.before).toBe(expectedFrames);
      expect.soft(counts.afterStop).toBe(0);
      expect(counts.afterQueued).toBe(0);
      expect(counts.terminated).toBe(workers);
    },
  );

  it('does not attach an iframe that finishes loading after recording stops', async () => {
    let releaseImage!: () => void;
    let imageRequested!: () => void;
    const imageReady = new Promise<void>((resolve) => {
      imageRequested = resolve;
    });
    const imageGate = new Promise<void>((resolve) => {
      releaseImage = resolve;
    });
    await page.route('https://rrweb.test/slow-image', async (route) => {
      imageRequested();
      await imageGate;
      await route.fulfill({
        contentType: 'image/svg+xml',
        body: '<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"/>',
      });
    });
    try {
      await start();
      await page.evaluate(() => {
        const iframe = document.createElement('iframe');
        iframe.id = 'late-frame';
        iframe.srcdoc = `<img src="https://rrweb.test/slow-image"><x-late></x-late>
          <script>document.querySelector('x-late').attachShadow({mode:'open'}).innerHTML='<b>late</b>'</script>`;
        document.body.appendChild(iframe);
      });
      await imageReady;
      await waitForRAF(page);
      const idsAtStop = await page.evaluate(() => {
        const state = window.observerCleanupTest;
        state.stop();
        state.events.length = 0;
        return state.record.mirror.getIds();
      });

      releaseImage();
      await page.waitForFunction(
        () =>
          document.querySelector<HTMLIFrameElement>('#late-frame')!
            .contentDocument!.readyState === 'complete',
      );
      await waitForRAF(page);

      const state = await page.evaluate(() => {
        const { events, active, record } = window.observerCleanupTest;
        const doc =
          document.querySelector<HTMLIFrameElement>('#late-frame')!
            .contentDocument!;
        const shadow = doc.querySelector('x-late')!.shadowRoot!;
        return {
          events: events.length,
          observed: [doc, shadow].map((root) =>
            [...active.values()].includes(root),
          ),
          ids: record.mirror.getIds(),
        };
      });
      expect.soft(state.events).toBe(0);
      expect.soft(state.observed).toEqual([false, false]);
      expect(state.ids).toEqual(idsAtStop);
    } finally {
      releaseImage();
    }
  });

  it('cleans up when the recorder itself runs inside an iframe', async () => {
    const handle = await page.$('#target');
    const frame = await handle!.contentFrame();
    if (!frame) throw new Error('Missing recorder iframe');
    await frame.addScriptTag({ content: code });
    await frame.evaluate(() => {
      const active = new Map<MutationObserver, Node>();
      const originalObserve = MutationObserver.prototype.observe;
      const originalDisconnect = MutationObserver.prototype.disconnect;
      MutationObserver.prototype.observe = function (target, options) {
        originalObserve.call(this, target, options);
        active.set(this, target);
      };
      MutationObserver.prototype.disconnect = function () {
        originalDisconnect.call(this);
        active.delete(this);
      };
      const host = document.createElement('x-card');
      const root = host.attachShadow({ mode: 'open' });
      root.innerHTML = '<span>inside recorder iframe</span>';
      document.body.appendChild(host);
      const events: eventWithTime[] = [];
      const stop = rrweb.record({ emit: (event) => events.push(event) });
      if (!stop) throw new Error('Iframe recorder did not start');
      window.observerCleanupTest = {
        record: rrweb.record,
        stop,
        events,
        active,
        allRoots: [document, root],
        oldRoots: [],
        nestedRoots: [],
      };
    });
    await waitForRAF(frame);
    await frame.evaluate(() => {
      window.observerCleanupTest.events.length = 0;
      document
        .querySelector('x-card')!
        .shadowRoot!.firstElementChild!.setAttribute('data-own-realm', 'true');
    });
    await waitForRAF(frame);
    const events = await frame.evaluate(
      () => window.observerCleanupTest.events,
    );
    expect(
      events.some(
        (event) =>
          event.type === EventType.IncrementalSnapshot &&
          event.data.source === IncrementalSource.Mutation &&
          event.data.attributes.some(
            (attribute) => attribute.attributes['data-own-realm'] === 'true',
          ),
      ),
    ).toBe(true);
    const observed = await frame.evaluate(() => {
      const { stop, active, allRoots } = window.observerCleanupTest;
      stop();
      return allRoots.map((root) => [...active.values()].includes(root));
    });
    expect(observed).toEqual([false, false]);
  });

  async function startWithFallbackObserver() {
    await page.evaluate(() => {
      // Force the same fallback used when a framework replaces MutationObserver.
      window.MutationObserver = class extends MutationObserver {};
    });
    await page.addScriptTag({ content: code });
    await page.evaluate(() => {
      const events: eventWithTime[] = [];
      const stop = rrweb.record({ emit: (event) => events.push(event) });
      if (!stop) throw new Error('Recorder did not start');
      window.observerCleanupTest = {
        events,
        record: rrweb.record,
        stop,
        active: new Map(),
        oldRoots: [],
        nestedRoots: [],
        allRoots: [],
      };
    });
    await waitForRAF(page);
  }

  it('keeps a fallback MutationObserver iframe alive until the recorder stops', async () => {
    await startWithFallbackObserver();
    const helperCount = await page
      .locator('[__rrwebUntaintedMutationObserver]')
      .count();
    await page.evaluate(() => document.querySelector('#target')!.remove());
    await waitForRAF(page);
    expect(
      await page.locator('[__rrwebUntaintedMutationObserver]').count(),
    ).toBe(helperCount);
    await page.evaluate(() => {
      window.observerCleanupTest.events.length = 0;
      document.body.setAttribute('data-after-child-unload', 'true');
    });
    await waitForRAF(page);
    const events = await page.evaluate(() => window.observerCleanupTest.events);
    expect(
      events.some(
        (event) =>
          event.type === EventType.IncrementalSnapshot &&
          event.data.source === IncrementalSource.Mutation &&
          event.data.attributes.some(
            (attribute) =>
              attribute.attributes['data-after-child-unload'] === 'true',
          ),
      ),
    ).toBe(true);
    await page.evaluate(() => window.observerCleanupTest.stop());
    // Safari also keeps helper iframes for DOM accessors. This stop callback owns
    // only the MutationObserver helper, so compare against the pre-stop count.
    expect(
      await page.locator('[__rrwebUntaintedMutationObserver]').count(),
    ).toBe(Math.max(0, helperCount - 1));
  });

  it('records mutations after stop and restart with a fallback MutationObserver', async () => {
    await startWithFallbackObserver();
    await page.evaluate(() => {
      const state = window.observerCleanupTest;
      state.stop();
      state.events.length = 0;
      const stop = state.record({ emit: (event) => state.events.push(event) });
      if (!stop) throw new Error('Recorder did not restart');
      state.stop = stop;
    });
    await waitForRAF(page);
    await page.evaluate(() => {
      window.observerCleanupTest.events.length = 0;
      document.body.setAttribute('data-after-restart', 'true');
    });
    await waitForRAF(page);

    const events = await page.evaluate(() => window.observerCleanupTest.events);
    expect(
      events.some(
        (event) =>
          event.type === EventType.IncrementalSnapshot &&
          event.data.source === IncrementalSource.Mutation &&
          event.data.attributes.some(
            (attribute) =>
              attribute.attributes['data-after-restart'] === 'true',
          ),
      ),
    ).toBe(true);
  });

  it('releases a fallback helper when the last constructor lease predates it', async () => {
    await page.addScriptTag({
      content: fs.readFileSync(
        path.resolve(__dirname, '../../../utils/dist/utils.umd.cjs'),
        'utf8',
      ),
    });
    const helpers = await page.evaluate(() => {
      // Exercise Safari's retained-helper branch in both browser engines.
      Object.defineProperty(navigator, 'userAgent', { value: 'Safari' });
      window.MutationObserver = class extends MutationObserver {};
      const body = document.body;
      body.remove();
      const [, releaseFirst] = rrwebUtils.mutationObserverCtor();
      document.documentElement.appendChild(body);
      const [, releaseSecond] = rrwebUtils.mutationObserverCtor();
      const before = document.querySelectorAll(
        '[__rrwebUntaintedMutationObserver]',
      ).length;
      releaseSecond();
      releaseFirst();
      return {
        before,
        after: document.querySelectorAll('[__rrwebUntaintedMutationObserver]')
          .length,
      };
    });
    expect(helpers.before).toBe(1);
    expect(helpers.after).toBe(0);
  });
});
