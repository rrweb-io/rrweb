import * as fs from 'fs';
import * as path from 'path';
import type * as puppeteer from 'puppeteer';
import { vi } from 'vitest';
import type { recordOptions } from '../../src/types';
import type {
  listenerHandler,
  eventWithTime,
  mutationData,
} from '@saola.ai/rrweb-types';
import { EventType, IncrementalSource } from '@saola.ai/rrweb-types';
import {
  assertSnapshot,
  getServerURL,
  launchPuppeteer,
  startServer,
  waitForRAF,
} from '../utils';
import type * as http from 'http';

interface ISuite {
  code: string;
  browser: puppeteer.Browser;
  page: puppeteer.Page;
  events: eventWithTime[];
  server: http.Server;
  serverURL: string;
}

interface IWindow extends Window {
  rrweb: {
    record: (
      options: recordOptions<eventWithTime>,
    ) => listenerHandler | undefined;
    addCustomEvent<T>(tag: string, payload: T): void;
    pack: (e: eventWithTime) => string;
  };
  emit: (e: eventWithTime) => undefined;
  snapshots: eventWithTime[];
}
type ExtraOptions = {
  usePackFn?: boolean;
};

async function injectRecordScript(
  frame: puppeteer.Frame,
  options?: ExtraOptions,
) {
  try {
    await frame.addScriptTag({
      path: path.resolve(__dirname, '../../dist/rrweb.umd.cjs'),
    });
  } catch (e) {
    // we get this error: `Protocol error (DOM.resolveNode): Node with given id does not belong to the document`
    // then the page wasn't loaded yet and we try again
    if (!e.message.includes('DOM.resolveNode')) throw e;
    await injectRecordScript(frame, options);
    return;
  }
  options = options || {};
  await frame.evaluate((options) => {
    (window as unknown as IWindow).snapshots = [];
    const { record } = (window as unknown as IWindow).rrweb;
    const config: recordOptions<eventWithTime> = {
      recordCrossOriginIframes: true,
      recordCanvas: true,
      emit(event) {
        (window as unknown as IWindow).snapshots.push(event);
        (window as unknown as IWindow).emit(event);
      },
    };
    record(config);
  }, options);

  for (const child of frame.childFrames()) {
    await injectRecordScript(child, options);
  }
}

const setup = function (
  this: ISuite,
  content: string,
  options?: ExtraOptions,
): ISuite {
  const ctx = {} as ISuite & {
    serverB: http.Server;
    serverBURL: string;
  };

  beforeAll(async () => {
    ctx.browser = await launchPuppeteer();
    ctx.server = await startServer();
    ctx.serverURL = getServerURL(ctx.server);
    ctx.serverB = await startServer();
    ctx.serverBURL = getServerURL(ctx.serverB);

    const bundlePath = path.resolve(__dirname, '../../dist/rrweb.umd.cjs');
    ctx.code = fs.readFileSync(bundlePath, 'utf8');
  });

  beforeEach(async () => {
    ctx.page = await ctx.browser.newPage();
    await ctx.page.goto('about:blank');
    await ctx.page.setContent(
      content.replace(/\{SERVER_URL\}/g, ctx.serverURL),
    );
    // await ctx.page.evaluate(ctx.code);
    ctx.events = [];
    await ctx.page.exposeFunction('emit', (e: eventWithTime) => {
      if (e.type === EventType.DomContentLoaded || e.type === EventType.Load) {
        return;
      }
      ctx.events.push(e);
    });

    ctx.page.on('console', (msg) => console.log('PAGE LOG:', msg.text()));
    await injectRecordScript(ctx.page.mainFrame(), options);
  });

  afterEach(async () => {
    await ctx.page.close();
  });

  afterAll(async () => {
    await ctx.browser.close();
    ctx.server.close();
    ctx.serverB.close();
  });

  return ctx;
};

describe('cross origin iframes', function (this: ISuite) {
  vi.setConfig({ testTimeout: 100_000 });

  describe('form.html', function (this: ISuite) {
    const ctx: ISuite = setup.call(
      this,
      `
        <!DOCTYPE html>
        <html>
          <body>
            <iframe src="{SERVER_URL}/html/form.html" style="width: 400px; height: 400px;"></iframe>
          </body>
        </html>
      `,
    );

    it("won't emit events if it isn't in the top level iframe", async () => {
      const el = (await ctx.page.$(
        'body > iframe',
      )) as puppeteer.ElementHandle<Element>;

      const frame = await el.contentFrame();
      const events = await frame?.evaluate(
        () => (window as unknown as IWindow).snapshots,
      );
      expect(events).toMatchObject([]);
    });

    it('will emit events if it is in the top level iframe', async () => {
      const events = await ctx.page.evaluate(
        () => (window as unknown as IWindow).snapshots,
      );
      expect(events.length).not.toBe(0);
    });

    it('should emit contents of iframe', async () => {
      const events = await ctx.page.evaluate(
        () => (window as unknown as IWindow).snapshots,
      );
      await waitForRAF(ctx.page);
      // two events (full snapshot + meta) from main frame, and one full snapshot from iframe
      expect(events.length).toBe(3);
    });

    it('should emit full snapshot event from iframe as mutation event', async () => {
      const events = await ctx.page.evaluate(
        () => (window as unknown as IWindow).snapshots,
      );
      await waitForRAF(ctx.page);
      // two events from main frame, and two from iframe
      expect(events[events.length - 1]).toMatchObject({
        type: EventType.IncrementalSnapshot,
        data: {
          source: IncrementalSource.Mutation,
          adds: [
            {
              parentId: expect.any(Number),
              node: {
                id: expect.any(Number),
              },
            },
          ],
        },
      });
    });

    it('should use unique id for child of iframes', async () => {
      const events: eventWithTime[] = await ctx.page.evaluate(
        () => (window as unknown as IWindow).snapshots,
      );
      await waitForRAF(ctx.page);
      expect(
        (events[events.length - 1].data as mutationData).adds[0].node.id,
      ).not.toBe(1);
    });

    it('should replace the existing DOM nodes on iframe navigation with `isAttachIframe`', async () => {
      await ctx.page.evaluate((url) => {
        const iframe = document.querySelector('iframe') as HTMLIFrameElement;
        iframe.src = `${url}/html/form.html?2`;
      }, ctx.serverURL);
      await waitForRAF(ctx.page); // loads iframe

      await injectRecordScript(ctx.page.mainFrame().childFrames()[0]); // injects script into new iframe

      const events: eventWithTime[] = await ctx.page.evaluate(
        () => (window as unknown as IWindow).snapshots,
      );
      expect(
        (events[events.length - 1].data as mutationData).removes,
      ).toMatchObject([]);
      expect(
        (events[events.length - 1].data as mutationData).isAttachIframe,
      ).toBeTruthy();
    });

    it('should map input events correctly', async () => {
      const frame = ctx.page.mainFrame().childFrames()[0];
      await frame.type('input[type="text"]', 'test');
      await frame.click('input[type="radio"]');
      await frame.click('input[type="checkbox"]');
      await frame.type('input[type="password"]', 'password');
      await frame.type('textarea', 'textarea test');
      await frame.select('select', '1');

      const snapshots = (await ctx.page.evaluate(
        'window.snapshots',
      )) as eventWithTime[];
      assertSnapshot(snapshots);
    });

    it('should map scroll events correctly', async () => {
      // force scrollbars in iframe
      ctx.page.evaluate(() => {
        const iframe = document.querySelector('iframe') as HTMLIFrameElement;
        iframe.style.width = '50px';
        iframe.style.height = '50px';
      });

      await waitForRAF(ctx.page);
      const frame = ctx.page.mainFrame().childFrames()[0];

      // scroll a little
      frame.evaluate(() => {
        window.scrollTo(0, 10);
      });
      await waitForRAF(ctx.page);

      const snapshots = (await ctx.page.evaluate(
        'window.snapshots',
      )) as eventWithTime[];
      assertSnapshot(snapshots);
    });
  });

  describe('move-node.html', function (this: ISuite) {
    const ctx: ISuite = setup.call(
      this,
      `
        <!DOCTYPE html>
        <html>
          <body>
            <iframe src="{SERVER_URL}/html/move-node.html"></iframe>
          </body>
        </html>
      `,
    );

    it('should record DOM node movement', async () => {
      const frame = ctx.page.mainFrame().childFrames()[0];
      await frame.evaluate(() => {
        const div = document.createElement('div');
        const span = document.querySelector('span')!;
        document.body.appendChild(div);
        div.appendChild(span);
      });
      const snapshots = (await ctx.page.evaluate(
        'window.snapshots',
      )) as eventWithTime[];
      assertSnapshot(snapshots);
    });

    it('should record DOM node removal', async () => {
      const frame = ctx.page.mainFrame().childFrames()[0];
      await frame.evaluate(() => {
        const span = document.querySelector('span')!;
        span.remove();
      });
      const snapshots = (await ctx.page.evaluate(
        'window.snapshots',
      )) as eventWithTime[];
      assertSnapshot(snapshots);
    });

    it('should record DOM attribute changes', async () => {
      const frame = ctx.page.mainFrame().childFrames()[0];
      await frame.evaluate(() => {
        const span = document.querySelector('span')!;
        span.className = 'added-class-name';
      });
      const snapshots = (await ctx.page.evaluate(
        'window.snapshots',
      )) as eventWithTime[];
      assertSnapshot(snapshots);
    });

    it('should record DOM text changes', async () => {
      const frame = ctx.page.mainFrame().childFrames()[0];
      await frame.evaluate(() => {
        const b = document.querySelector('b')!;
        b.childNodes[0].textContent = 'replaced text';
      });
      const snapshots = (await ctx.page.evaluate(
        'window.snapshots',
      )) as eventWithTime[];
      assertSnapshot(snapshots);
    });

    it('should record canvas elements', async () => {
      const frame = ctx.page.mainFrame().childFrames()[0];
      await frame.evaluate(() => {
        var canvas = document.createElement('canvas');
        var gl = canvas.getContext('webgl')!;
        var program = gl.createProgram()!;
        gl.linkProgram(program);
        gl.clear(gl.COLOR_BUFFER_BIT);
        document.body.appendChild(canvas);
      });
      await waitForRAF(ctx.page);
      const snapshots = (await ctx.page.evaluate(
        'window.snapshots',
      )) as eventWithTime[];
      assertSnapshot(snapshots);
    });

    it('should record custom events', async () => {
      const frame = ctx.page.mainFrame().childFrames()[0];
      await frame.evaluate(() => {
        (window as unknown as IWindow).rrweb.addCustomEvent('test', {
          id: 1,
          parentId: 1,
          nextId: 2,
        });
      });
      await waitForRAF(ctx.page);
      const snapshots = (await ctx.page.evaluate(
        'window.snapshots',
      )) as eventWithTime[];
      assertSnapshot(snapshots);
    });

    it('captures mutations on adopted stylesheets', async () => {
      const frame = ctx.page.mainFrame().childFrames()[0];
      await ctx.page.evaluate(() => {
        const sheet = new CSSStyleSheet();
        // Add stylesheet to a document.
        document.adoptedStyleSheets = [sheet];
      });
      await frame.evaluate(() => {
        const sheet = new CSSStyleSheet();
        // Add stylesheet to a document.
        document.adoptedStyleSheets = [sheet];
      });
      await waitForRAF(ctx.page);
      await ctx.page.evaluate(() => {
        document.adoptedStyleSheets![0].replace!('div { color: yellow; }');
      });
      await frame.evaluate(() => {
        document.adoptedStyleSheets![0].replace!('h1 { color: blue; }');
      });
      await waitForRAF(ctx.page);
      await ctx.page.evaluate(() => {
        document.adoptedStyleSheets![0].replaceSync!(
          'div { display: inline ; }',
        );
      });
      await frame.evaluate(() => {
        document.adoptedStyleSheets![0].replaceSync!(
          'h1 { font-size: large; }',
        );
      });
      await waitForRAF(ctx.page);
      await ctx.page.evaluate(() => {
        (
          document.adoptedStyleSheets![0].cssRules[0] as CSSStyleRule
        ).style.setProperty('color', 'green');
        (
          document.adoptedStyleSheets![0].cssRules[0] as CSSStyleRule
        ).style.removeProperty('display');
      });
      await frame.evaluate(() => {
        (
          document.adoptedStyleSheets![0].cssRules[0] as CSSStyleRule
        ).style.setProperty('font-size', 'medium', 'important');
        document.adoptedStyleSheets![0].insertRule('h2 { color: red; }');
      });
      await waitForRAF(ctx.page);
      await ctx.page.evaluate(() => {
        document.adoptedStyleSheets![0].insertRule(
          'body { border: 2px solid blue; }',
          1,
        );
      });
      await frame.evaluate(() => {
        document.adoptedStyleSheets![0].deleteRule(0);
      });
      await waitForRAF(ctx.page);

      const snapshots = (await ctx.page.evaluate(
        'window.snapshots',
      )) as eventWithTime[];
      assertSnapshot(snapshots);
    });

    it('captures mutations on stylesheets', async () => {
      const frame = ctx.page.mainFrame().childFrames()[0];
      await ctx.page.evaluate(() => {
        // Add stylesheet to a document.
        const style = document.createElement('style');
        document.head.appendChild(style);
      });
      await frame.evaluate(() => {
        // Add stylesheet to a document.
        const style = document.createElement('style');
        document.head.appendChild(style);
      });
      await waitForRAF(ctx.page);
      await ctx.page.evaluate(() => {
        document.styleSheets[0].insertRule('div { color: yellow; }');
      });
      await frame.evaluate(() => {
        document.styleSheets[0].insertRule('h1 { color: blue; }');
      });
      await waitForRAF(ctx.page);
      await ctx.page.evaluate(() => {
        (document.styleSheets[0].cssRules[0] as CSSStyleRule).style.setProperty(
          'color',
          'green',
        );
        (
          document.styleSheets[0].cssRules[0] as CSSStyleRule
        ).style.removeProperty('display');
      });
      await frame.evaluate(() => {
        (document.styleSheets[0].cssRules[0] as CSSStyleRule).style.setProperty(
          'font-size',
          'medium',
          'important',
        );
        document.styleSheets[0].insertRule('h2 { color: red; }');
      });
      await waitForRAF(ctx.page);
      await ctx.page.evaluate(() => {
        document.styleSheets[0].insertRule(
          'body { border: 2px solid blue; }',
          1,
        );
      });
      await frame.evaluate(() => {
        document.styleSheets[0].deleteRule(0);
      });
      await waitForRAF(ctx.page);

      const snapshots = (await ctx.page.evaluate(
        'window.snapshots',
      )) as eventWithTime[];
      assertSnapshot(snapshots);
    });
  });

  describe('audio.html', function (this: ISuite) {
    vi.setConfig({ testTimeout: 100_000 });

    const ctx: ISuite = setup.call(
      this,
      `
      <!DOCTYPE html>
      <html>
        <body>
          <iframe src="{SERVER_URL}/html/audio.html"></iframe>
        </body>
      </html>
    `,
    );

    it('should emit contents of iframe once', async () => {
      const frame = ctx.page.mainFrame().childFrames()[0];
      await frame.evaluate(() => {
        const el = document.querySelector('audio')!;
        el.play();
      });
      await waitForRAF(ctx.page);
      const snapshots = (await ctx.page.evaluate(
        'window.snapshots',
      )) as eventWithTime[];
      assertSnapshot(snapshots);
    });
  });

  describe('blank.html', function (this: ISuite) {
    const content = `
    <!DOCTYPE html>
    <html>
      <body>
        <iframe src="{SERVER_URL}/html/blank.html"></iframe>
      </body>
    </html>
  `;
    const ctx = setup.call(this, content) as ISuite & {
      serverBURL: string;
    };

    it('should record same-origin iframe in cross-origin iframe', async () => {
      const frame = ctx.page.mainFrame().childFrames()[0];
      await frame.evaluate(() => {
        const iframe2 = document.createElement('iframe');
        // Append a same-origin iframe in a cross-origin iframe.
        document.body.appendChild(iframe2);
        iframe2.contentDocument!.body.appendChild(
          document.createTextNode('Same-origin iframe in cross-origin iframe'),
        );
      });

      await waitForRAF(ctx.page);
      const snapshots = (await ctx.page.evaluate(
        'window.snapshots',
      )) as eventWithTime[];
      assertSnapshot(snapshots);
    });

    it('should filter out forwarded cross origin rrweb messages', async () => {
      const frame = ctx.page.mainFrame().childFrames()[0];
      const iframe2URL = `${ctx.serverBURL}/html/blank.html`;
      await frame.evaluate((iframe2URL) => {
        // Add a message proxy to forward messages from child frames to its parent frame.
        window.addEventListener('message', (event) => {
          if (event.source !== window)
            window.parent.postMessage(event.data, '*');
        });
        const iframe2 = document.createElement('iframe');
        iframe2.src = iframe2URL;
        document.body.appendChild(iframe2);
      }, iframe2URL);

      // Wait for iframe2 to load
      await ctx.page.waitForFrame(iframe2URL);
      const iframe2 = frame.childFrames()[0];
      // Record iframe2
      await injectRecordScript(iframe2);

      await waitForRAF(iframe2);
      const snapshots = (await ctx.page.evaluate(
        'window.snapshots',
      )) as eventWithTime[];
      assertSnapshot(snapshots);
    });
  });
});

describe('same origin iframes', function (this: ISuite) {
  vi.setConfig({ testTimeout: 100_000 });

  const ctx: ISuite = setup.call(
    this,
    `
      <!DOCTYPE html>
      <html>
        <body>
          <iframe src="about:blank"></iframe>
        </body>
      </html>
    `,
  );

  it('should emit contents of iframe once', async () => {
    const events = await ctx.page.evaluate(
      () => (window as unknown as IWindow).snapshots,
    );
    await waitForRAF(ctx.page);
    // two events (full snapshot + meta) from main frame,
    // and two (full snapshot + mutation) from iframe
    expect(events.length).toBe(4);
    assertSnapshot(events);
  });

  it('should record cross-origin iframe in same-origin iframe', async () => {
    const sameOriginIframe = ctx.page.mainFrame().childFrames()[0];
    await sameOriginIframe.evaluate((serverUrl) => {
      /**
       * Create a cross-origin iframe in this same-origin iframe.
       */
      const crossOriginIframe = document.createElement('iframe');
      document.body.appendChild(crossOriginIframe);
      crossOriginIframe.src = `${serverUrl}/html/blank.html`;
      return new Promise((resolve) => {
        crossOriginIframe.onload = resolve;
      });
    }, ctx.serverURL);
    const crossOriginIframe = sameOriginIframe.childFrames()[0];
    // Inject recording script into this cross-origin iframe
    await injectRecordScript(crossOriginIframe);

    await waitForRAF(ctx.page);
    const snapshots = (await ctx.page.evaluate(
      'window.snapshots',
    )) as eventWithTime[];
    assertSnapshot(snapshots);
  });
});
