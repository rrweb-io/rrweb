import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import type { Browser, Page } from 'puppeteer';
import {
  beforeAll,
  afterAll,
  beforeEach,
  afterEach,
  describe,
  it,
  expect,
} from 'vitest';
import {
  EventType,
  IncrementalSource,
  MouseInteractions,
  type eventWithTime,
} from '@rrweb/types';
import { launchPuppeteer, waitForRAF } from '../utils';

type TestWindow = Window & {
  rrweb: typeof import('../../src');
  events: eventWithTime[];
  root: ShadowRoot;
  stop: () => void;
};

describe('closed Shadow DOM', () => {
  let browser: Browser;
  let page: Page;
  let server: Server;
  let origin: string;
  let code: string;

  beforeAll(async () => {
    code = readFileSync(resolve(__dirname, '../../dist/rrweb.umd.cjs'), 'utf8');
    browser = await launchPuppeteer();
    server = createServer((req, res) => {
      res.setHeader('Content-Type', 'text/html');
      res.end(`<!DOCTYPE html><p>frame-initial</p><script>${code}
        window.events = [];
        window.stop = rrweb.record({recordCrossOriginIframes: true,
          emit: event => window.events.push(event)});
        </script>`);
    });
    await new Promise<void>((resolve) => server.listen(0, resolve));
    origin = `http://localhost:${(server.address() as AddressInfo).port}`;
  });

  afterAll(async () => {
    await browser.close();
    await new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
  });

  beforeEach(async () => {
    page = await browser.newPage();
    await page.goto(origin);
  });

  afterEach(async () => {
    await page.close();
  });

  async function events() {
    return page.evaluate(() => (window as TestWindow).events);
  }

  async function createRoot(mode: ShadowRootMode = 'closed', attached = false) {
    await page.evaluate(
      ({ mode, attached }) => {
        const win = window as TestWindow;
        const host = document.createElement('x-test');
        host.id = 'host';
        if (attached) document.body.appendChild(host);
        win.root = host.attachShadow({ mode });
        win.root.innerHTML =
          '<style>p { color: rgb(1, 2, 3) }</style><p>initial</p><input><button>click</button>';
        if (!attached) document.body.appendChild(host);
      },
      { mode, attached },
    );
    await waitForRAF(page);
  }

  async function replay(recorded: eventWithTime[]) {
    const replayPage = await browser.newPage();
    await replayPage.evaluate(code);
    await replayPage.evaluate((recorded) => {
      const win = window as TestWindow;
      const replayer = new win.rrweb.Replayer(recorded, {
        useVirtualDom: false,
      });
      replayer.pause(
        recorded[recorded.length - 1].timestamp - recorded[0].timestamp + 1,
      );
    }, recorded);
    return replayPage;
  }

  for (const mode of ['open', 'closed'] as const) {
    for (const attached of [false, true]) {
      it(`records and replays ${mode} roots created ${
        attached ? 'on attached hosts' : 'before insertion'
      }`, async () => {
        await createRoot(mode, attached);
        expect(
          await page.$eval('#host', (host) => host.shadowRoot === null),
        ).toBe(mode === 'closed');
        await page.evaluate(() => {
          const win = window as TestWindow;
          win.root.querySelector('p')!.textContent = 'updated';
          win.root.querySelector('p')!.setAttribute('data-state', 'changed');
        });
        await waitForRAF(page);
        const recorded = await events();
        expect(JSON.stringify(recorded)).toContain('initial');
        expect(JSON.stringify(recorded)).toContain('updated');
        const replayPage = await replay(recorded);
        try {
          expect(
            await replayPage.evaluate(() => {
              const doc = document.querySelector('iframe')!.contentDocument!;
              const p = doc
                .querySelector('#host')!
                .shadowRoot!.querySelector('p')!;
              return {
                text: p.textContent,
                state: p.getAttribute('data-state'),
                color: doc.defaultView!.getComputedStyle(p).color,
              };
            }),
          ).toEqual({
            text: 'updated',
            state: 'changed',
            color: 'rgb(1, 2, 3)',
          });
        } finally {
          await replayPage.close();
        }
      });
    }
  }

  it('includes registered existing roots in full snapshots and later checkouts', async () => {
    await page.evaluate(() => (window as TestWindow).stop());
    await createRoot();
    await page.evaluate(() => {
      const win = window as TestWindow;
      win.rrweb.record.registerShadowRoot(win.root);
      win.events = [];
      win.stop = win.rrweb.record({ emit: (event) => win.events.push(event) })!;
      win.root.querySelector('p')!.textContent = 'checkout-text';
      win.rrweb.record.takeFullSnapshot(true);
    });
    const full = (await events()).filter(
      (event) => event.type === EventType.FullSnapshot,
    );
    expect(full).toHaveLength(2);
    expect(JSON.stringify(full[0])).toContain('initial');
    expect(JSON.stringify(full[1])).toContain('checkout-text');
  });

  it('registers an existing root during recording and observes subsequent changes', async () => {
    await page.evaluate(() => {
      const win = window as TestWindow;
      const host = document.createElement('x-existing');
      document.body.appendChild(host);
      const iframe = document.createElement('iframe');
      document.body.appendChild(iframe);
      // 使用尚未被 recorder 包装的原生 attachShadow 创建已有根。
      win.root = iframe.contentWindow!.Element.prototype.attachShadow.call(
        host,
        { mode: 'closed' },
      );
      win.root.innerHTML = '<p>registered-initial</p>';
      win.rrweb.record.registerShadowRoot(win.root);
    });
    await page.evaluate(() => {
      (window as TestWindow).root.querySelector('p')!.textContent =
        'registered-updated';
    });
    await waitForRAF(page);
    expect(JSON.stringify(await events())).toContain('registered-initial');
    expect(JSON.stringify(await events())).toContain('registered-updated');
  });

  it('records nested closed roots, releases removed nodes and observes reinsertion', async () => {
    await createRoot();
    await page.evaluate(() => {
      const win = window as TestWindow;
      const nested = document.createElement('x-nested');
      win.root.appendChild(nested);
      const root = nested.attachShadow({ mode: 'closed' });
      root.innerHTML = '<b>nested-initial</b>';
      win.root = root;
    });
    await waitForRAF(page);
    const childId = await page.evaluate(() => {
      const win = window as TestWindow;
      return win.rrweb.record.mirror.getId(win.root.querySelector('b')!);
    });
    expect(childId).toBeGreaterThan(0);
    await page.evaluate(() => document.querySelector('#host')!.remove());
    await waitForRAF(page);
    expect(
      await page.evaluate(
        (id) => (window as TestWindow).rrweb.record.mirror.getNode(id) === null,
        childId,
      ),
    ).toBe(true);
    await page.evaluate(() => {
      const win = window as TestWindow;
      const host = win.root.host.getRootNode() as ShadowRoot;
      document.body.appendChild(host.host);
    });
    await waitForRAF(page);
    await page.evaluate(
      () =>
        ((window as TestWindow).root.querySelector('b')!.textContent =
          'nested-updated'),
    );
    await waitForRAF(page);
    expect(JSON.stringify(await events())).toContain('nested-updated');
  });

  it('records the original click and input target once, including non-composed input', async () => {
    await createRoot();
    const ids = await page.evaluate(() => {
      const win = window as TestWindow;
      const input = win.root.querySelector('input')!;
      const button = win.root.querySelector('button')!;
      input.value = 'typed';
      input.dispatchEvent(
        new Event('input', { bubbles: true, composed: false }),
      );
      const click = new MouseEvent('click', { bubbles: true, composed: true });
      button.dispatchEvent(click);
      win.root.host.dispatchEvent(click);
      return {
        input: win.rrweb.record.mirror.getId(input),
        button: win.rrweb.record.mirror.getId(button),
        host: win.rrweb.record.mirror.getId(win.root.host),
      };
    });
    await waitForRAF(page);
    const recorded = await events();
    const clicks = recorded.filter(
      (event) =>
        event.type === EventType.IncrementalSnapshot &&
        event.data.source === IncrementalSource.MouseInteraction &&
        event.data.type === MouseInteractions.Click,
    );
    expect(
      clicks.map((event) => (event as { data: { id: number } }).data.id),
    ).toEqual([ids.button, ids.host]);
    const inputs = recorded.filter(
      (event) =>
        event.type === EventType.IncrementalSnapshot &&
        event.data.source === IncrementalSource.Input,
    );
    expect(inputs).toHaveLength(1);
    expect(inputs[0]).toMatchObject({ data: { id: ids.input, text: 'typed' } });
  });

  it('preserves input masking and blocked closed hosts', async () => {
    await page.evaluate(() => {
      const win = window as TestWindow;
      win.stop();
      win.events = [];
      win.stop = win.rrweb.record({
        maskAllInputs: true,
        emit: (event) => win.events.push(event),
      })!;
    });
    await createRoot();
    await page.evaluate(() => {
      const win = window as TestWindow;
      const input = win.root.querySelector('input')!;
      input.value = 'secret';
      input.dispatchEvent(
        new Event('input', { bubbles: true, composed: true }),
      );
      const host = document.createElement('x-blocked');
      host.className = 'rr-block';
      document.body.appendChild(host);
      host.attachShadow({ mode: 'closed' }).innerHTML = '<p>blocked-secret</p>';
    });
    await waitForRAF(page);
    const recorded = await events();
    expect(JSON.stringify(recorded)).not.toContain('blocked-secret');
    expect(
      recorded.some(
        (event) =>
          event.type === EventType.IncrementalSnapshot &&
          event.data.source === IncrementalSource.Input &&
          event.data.text === '******',
      ),
    ).toBe(true);
  });

  it('records scrolling and adopted stylesheet changes inside a closed root', async () => {
    await createRoot();
    await page.evaluate(() => {
      const win = window as TestWindow;
      win.root.querySelector('p')!.innerHTML =
        '<span style="display:block;height:200px">scroll</span>';
      const p = win.root.querySelector('p')!;
      p.style.cssText = 'height:20px;overflow:auto';
      const sheet = new CSSStyleSheet();
      sheet.replaceSync('button { color: rgb(4, 5, 6) }');
      win.root.adoptedStyleSheets = [sheet];
    });
    await waitForRAF(page);
    const id = await page.evaluate(() => {
      const win = window as TestWindow;
      const p = win.root.querySelector('p')!;
      p.scrollTop = 50;
      win.root.adoptedStyleSheets[0].insertRule(
        'button { background: rgb(7, 8, 9) }',
        1,
      );
      return win.rrweb.record.mirror.getId(p);
    });
    await page.waitForFunction(
      (id) =>
        (window as TestWindow).events.some(
          (event) =>
            event.type === 3 &&
            event.data.source === 3 &&
            event.data.id === id &&
            event.data.y === 50,
        ),
      {},
      id,
    );
    const recorded = await events();
    expect(
      recorded.some(
        (event) =>
          event.type === EventType.IncrementalSnapshot &&
          event.data.source === IncrementalSource.AdoptedStyleSheet,
      ),
    ).toBe(true);
    const replayPage = await replay(recorded);
    try {
      expect(
        await replayPage.evaluate(() => {
          const doc = document.querySelector('iframe')!.contentDocument!;
          const root = doc.querySelector('#host')!.shadowRoot!;
          const button = root.querySelector('button')!;
          const style = doc.defaultView!.getComputedStyle(button);
          return {
            color: style.color,
            background: style.backgroundColor,
            scrollTop: root.querySelector('p')!.scrollTop,
          };
        }),
      ).toEqual({
        color: 'rgb(4, 5, 6)',
        background: 'rgb(7, 8, 9)',
        scrollTop: 50,
      });
    } finally {
      await replayPage.close();
    }
  });

  it('keeps nested closed and slotted click targets without duplicate events', async () => {
    await createRoot();
    await page.evaluate(() => {
      const win = window as TestWindow;
      const nested = document.createElement('x-nested');
      win.root.appendChild(nested);
      const root = nested.attachShadow({ mode: 'closed' });
      root.innerHTML = '<button>nested</button><slot></slot>';
      win.root = root;
      const slotted = document.createElement('button');
      slotted.textContent = 'slotted';
      nested.appendChild(slotted);
    });
    await waitForRAF(page);
    const targets = await page.evaluate(() => {
      const win = window as TestWindow;
      const slotted = win.root.host.querySelector('button')!;
      const button = win.root.querySelector('button')!;
      button.click();
      slotted.click();
      return [
        win.rrweb.record.mirror.getId(button),
        win.rrweb.record.mirror.getId(slotted),
      ];
    });
    await waitForRAF(page);
    const clicks = (await events()).filter(
      (event) =>
        event.type === EventType.IncrementalSnapshot &&
        event.data.source === IncrementalSource.MouseInteraction &&
        event.data.type === MouseInteractions.Click,
    );
    expect(
      clicks.map((event) => (event as { data: { id: number } }).data.id),
    ).toEqual(targets);
  });

  it('keeps closed-root click targets without duplicates after repeated full snapshots', async () => {
    await createRoot();
    const targets = await page.evaluate(() => {
      const win = window as TestWindow;
      const button = win.root.querySelector('button')!;
      const targets: number[] = [];
      for (let cycle = 0; cycle < 3; cycle++) {
        win.rrweb.record.takeFullSnapshot(true);
        targets.push(win.rrweb.record.mirror.getId(button));
        button.click();
      }
      return targets;
    });
    await waitForRAF(page);
    const clicks = (await events()).filter(
      (event) =>
        event.type === EventType.IncrementalSnapshot &&
        event.data.source === IncrementalSource.MouseInteraction &&
        event.data.type === MouseInteractions.Click,
    );
    expect(
      clicks.map((event) => (event as { data: { id: number } }).data.id),
    ).toEqual(targets);
  });

  it('stops observing roots and resumes known roots after restart', async () => {
    await createRoot();
    const count = await page.evaluate(() => {
      const win = window as TestWindow;
      win.stop();
      win.root.querySelector('p')!.textContent = 'while-stopped';
      win.root.querySelector('button')!.click();
      return win.events.length;
    });
    await waitForRAF(page);
    expect(
      await page.evaluate(() => (window as TestWindow).events.length),
    ).toBe(count);
    await page.evaluate(() => {
      const win = window as TestWindow;
      win.events = [];
      win.stop = win.rrweb.record({ emit: (event) => win.events.push(event) })!;
    });
    await page.evaluate(
      () =>
        ((window as TestWindow).root.querySelector('p')!.textContent =
          'after-restart'),
    );
    await waitForRAF(page);
    expect(JSON.stringify(await events())).toContain('while-stopped');
    expect(JSON.stringify(await events())).toContain('after-restart');
  });

  for (const crossOrigin of [false, true]) {
    it(`records and replays a ${
      crossOrigin ? 'cross-origin' : 'same-origin'
    } iframe inside a closed root`, async () => {
      await createRoot();
      await page.evaluate((src) => {
        const iframe = document.createElement('iframe');
        iframe.id = 'inner-frame';
        iframe.src = src;
        (window as TestWindow).root.appendChild(iframe);
      }, `${crossOrigin ? origin.replace('localhost', '127.0.0.1') : origin}/frame`);
      await page.waitForFunction(() =>
        JSON.stringify((window as TestWindow).events).includes('frame-initial'),
      );
      const frame = page
        .frames()
        .find((frame) => frame.url().endsWith('/frame'))!;
      await frame.evaluate(
        () => (document.querySelector('p')!.textContent = 'frame-updated'),
      );
      await page.waitForFunction(() =>
        JSON.stringify((window as TestWindow).events).includes('frame-updated'),
      );
      await frame.evaluate(() => {
        const host = document.createElement('x-frame-host');
        host.id = 'frame-host';
        document.body.appendChild(host);
        host.attachShadow({ mode: 'closed' }).innerHTML =
          '<b>frame-closed-content</b>';
      });
      await page.waitForFunction(() =>
        JSON.stringify((window as TestWindow).events).includes(
          'frame-closed-content',
        ),
      );

      const recorded = await events();
      await page.close();
      page = await browser.newPage();
      const replayPage = await replay(recorded);
      try {
        await replayPage.waitForFunction(() => {
          const doc = document.querySelector('iframe')!.contentDocument!;
          const root = doc.querySelector('#host')?.shadowRoot;
          const iframe = root?.querySelector('iframe');
          return (
            iframe?.contentDocument?.querySelector('p')?.textContent ===
              'frame-updated' &&
            iframe?.contentDocument
              ?.querySelector('#frame-host')
              ?.shadowRoot?.querySelector('b')?.textContent ===
              'frame-closed-content'
          );
        });
      } finally {
        await replayPage.close();
      }
    });
  }
});
