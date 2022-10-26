import * as fs from 'fs';
import * as path from 'path';
import type * as puppeteer from 'puppeteer';
import type {
  recordOptions,
  listenerHandler,
  eventWithTime,
  mutationData,
} from '../../src/types';
import { EventType, IncrementalSource } from '../../src/types';
import {
  assertSnapshot,
  getServerURL,
  launchPuppeteer,
  startServer,
  stripBase64,
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
  };
  emit: (e: eventWithTime) => undefined;
  snapshots: eventWithTime[];
}

async function injectRecordScript(frame: puppeteer.Frame) {
  await frame.addScriptTag({
    path: path.resolve(__dirname, '../../dist/rrweb.js'),
  });
  await frame.evaluate(() => {
    ((window as unknown) as IWindow).snapshots = [];
    const { record } = ((window as unknown) as IWindow).rrweb;
    record({
      recordCrossOriginIframes: true,
      recordCanvas: true,
      emit(event) {
        ((window as unknown) as IWindow).snapshots.push(event);
        ((window as unknown) as IWindow).emit(event);
      },
    });
  });

  for (const child of frame.childFrames()) {
    await injectRecordScript(child);
  }
}

const setup = function (this: ISuite, content: string): ISuite {
  const ctx = {} as ISuite;

  beforeAll(async () => {
    ctx.browser = await launchPuppeteer();
    ctx.server = await startServer();
    ctx.serverURL = getServerURL(ctx.server);
    // ctx.serverB = await startServer();
    // ctx.serverBURL = getServerURL(ctx.serverB);

    const bundlePath = path.resolve(__dirname, '../../dist/rrweb.js');
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
    await injectRecordScript(ctx.page.mainFrame());
  });

  afterEach(async () => {
    await ctx.page.close();
  });

  afterAll(async () => {
    await ctx.browser.close();
    ctx.server.close();
    // ctx.serverB.close();
  });

  return ctx;
};

describe('cross origin iframes', function (this: ISuite) {
  jest.setTimeout(100_000);

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
        () => ((window as unknown) as IWindow).snapshots,
      );
      expect(events).toMatchObject([]);
    });

    it('will emit events if it is in the top level iframe', async () => {
      const events = await ctx.page.evaluate(
        () => ((window as unknown) as IWindow).snapshots,
      );
      expect(events.length).not.toBe(0);
    });

    it('should emit contents of iframe', async () => {
      const events = await ctx.page.evaluate(
        () => ((window as unknown) as IWindow).snapshots,
      );
      await waitForRAF(ctx.page);
      // two events from main frame, and two from iframe
      expect(events.length).toBe(4);
    });

    it('should emit full snapshot event from iframe as mutation event', async () => {
      const events = await ctx.page.evaluate(
        () => ((window as unknown) as IWindow).snapshots,
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
        () => ((window as unknown) as IWindow).snapshots,
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
        () => ((window as unknown) as IWindow).snapshots,
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
      await waitForRAF(ctx.page);
      const snapshots = (await ctx.page.evaluate(
        'window.snapshots',
      )) as eventWithTime[];
      assertSnapshot(snapshots);
    });
  });
});

describe('same origin iframes', function (this: ISuite) {
  jest.setTimeout(100_000);

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
      () => ((window as unknown) as IWindow).snapshots,
    );
    await waitForRAF(ctx.page);
    // two events from main frame, and two from iframe
    expect(events.length).toBe(4);
  });
});
