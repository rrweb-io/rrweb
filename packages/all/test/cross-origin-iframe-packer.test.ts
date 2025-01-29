import {
  describe,
  it,
  vi,
  beforeAll,
  beforeEach,
  afterEach,
  afterAll,
} from 'vitest';
import type {
  eventWithTime,
  listenerHandler,
  mutationData,
} from '@saola.ai/rrweb-types';
import { unpack } from '@saola.ai/rrweb-packer';
import * as fs from 'fs';
import * as path from 'path';
import type * as puppeteer from 'puppeteer';
import type { recordOptions } from '@saola.ai/rrweb';
import type {} from '@saola.ai/rrweb-types';
import { EventType } from '@saola.ai/rrweb-types';
import {
  assertSnapshot,
  getServerURL,
  launchPuppeteer,
  startServer,
  waitForRAF,
} from './utils';
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
  await frame.addScriptTag({
    path: path.resolve(__dirname, '../dist/all.umd.cjs'),
  });
  options = options || {};
  await frame.evaluate((options) => {
    (window as unknown as IWindow).snapshots = [];
    const { record, pack } = (window as unknown as IWindow).rrweb;
    const config: recordOptions<eventWithTime> = {
      recordCrossOriginIframes: true,
      recordCanvas: true,
      emit(event) {
        (window as unknown as IWindow).snapshots.push(event);
        (window as unknown as IWindow).emit(event);
      },
    };
    if (options.usePackFn) {
      config.packFn = pack;
    }
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
  const ctx = {} as ISuite;

  beforeAll(async () => {
    ctx.browser = await launchPuppeteer();
    ctx.server = await startServer();
    ctx.serverURL = getServerURL(ctx.server);
  });

  beforeEach(async () => {
    ctx.page = await ctx.browser.newPage();
    await ctx.page.goto('about:blank');
    await ctx.page.setContent(
      content.replace(/\{SERVER_URL\}/g, ctx.serverURL),
    );
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
  });

  return ctx;
};

describe('cross origin iframes & packer', function (this: ISuite) {
  vi.setConfig({ testTimeout: 100_000 });

  describe('blank.html', function (this: ISuite) {
    const content = `
    <!DOCTYPE html>
    <html>
      <body>
        <iframe src="{SERVER_URL}/html/blank.html"></iframe>
      </body>
    </html>
  `;
    const ctx = setup.call(this, content, { usePackFn: true });

    describe('should support packFn option in record()', () => {
      it('', async () => {
        const frame = ctx.page.mainFrame().childFrames()[0];
        await waitForRAF(frame);
        const packedSnapshots = (await ctx.page.evaluate(
          'window.snapshots',
        )) as string[];
        const unpackedSnapshots = packedSnapshots.map((packed) =>
          unpack(packed),
        ) as eventWithTime[];
        await assertSnapshot(unpackedSnapshots);
      });
    });
  });
});
