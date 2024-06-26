import * as fs from 'fs';
import * as path from 'path';
import { vi } from 'vitest';

import {
  assertSnapshot,
  getServerURL,
  ISuite,
  launchPuppeteer,
  startServer,
  waitForRAF,
} from '../utils';
import {
  attributeMutation,
  EventType,
  eventWithTime,
  listenerHandler,
} from '@rrweb/types';
import { recordOptions } from '../../src/types';

interface IWindow extends Window {
  rrweb: {
    record: (
      options: recordOptions<eventWithTime>,
    ) => listenerHandler | undefined;
    addCustomEvent<T>(tag: string, payload: T): void;
  };
  emit: (e: eventWithTime) => undefined;
}

const attributeMutationFactory = (
  mutation: attributeMutation['attributes'],
) => {
  return {
    data: {
      attributes: [
        {
          attributes: mutation,
        },
      ],
    },
  };
};

describe('dialog', () => {
  vi.setConfig({ testTimeout: 100_000 });
  let code: ISuite['code'];
  let page: ISuite['page'];
  let browser: ISuite['browser'];
  let server: ISuite['server'];
  let serverURL: ISuite['serverURL'];
  let events: ISuite['events'];

  beforeAll(async () => {
    server = await startServer();
    serverURL = getServerURL(server);
    browser = await launchPuppeteer();

    const bundlePath = path.resolve(__dirname, '../../dist/rrweb.umd.cjs');
    code = fs.readFileSync(bundlePath, 'utf8');
  });

  afterEach(async () => {
    await page.close();
  });

  afterAll(async () => {
    await server.close();
    await browser.close();
  });

  beforeEach(async () => {
    page = await browser.newPage();
    page.on('console', (msg) => {
      console.log(msg.text());
    });

    await page.goto(`${serverURL}/html/dialog.html`);
    await page.addScriptTag({
      path: path.resolve(__dirname, '../../dist/rrweb.umd.cjs'),
    });
    await waitForRAF(page);
    events = [];

    await page.exposeFunction('emit', (e: eventWithTime) => {
      if (e.type === EventType.DomContentLoaded || e.type === EventType.Load) {
        return;
      }
      events.push(e);
    });

    page.on('console', (msg) => console.log('PAGE LOG:', msg.text()));

    await page.evaluate(() => {
      const { record } = (window as unknown as IWindow).rrweb;
      record({
        emit: (window as unknown as IWindow).emit,
      });
    });

    await waitForRAF(page);
  });

  it('show dialog', async () => {
    await page.evaluate(() => {
      const dialog = document.querySelector('dialog') as HTMLDialogElement;
      dialog.show();
    });

    const lastEvent = events[events.length - 1];

    expect(lastEvent).toMatchObject(attributeMutationFactory({ open: '' }));
    // assertSnapshot(events);
  });

  it('showModal dialog', async () => {
    await page.evaluate(() => {
      const dialog = document.querySelector('dialog') as HTMLDialogElement;
      dialog.showModal();
    });

    const lastEvent = events[events.length - 1];

    expect(lastEvent).toMatchObject(
      attributeMutationFactory({ rr_open_mode: 'modal' }),
    );
  });

  it('showModal & close dialog', async () => {
    await page.evaluate(() => {
      const dialog = document.querySelector('dialog') as HTMLDialogElement;
      dialog.showModal();
    });
    await waitForRAF(page);
    await page.evaluate(() => {
      const dialog = document.querySelector('dialog') as HTMLDialogElement;
      dialog.close();
    });

    const lastEvent = events[events.length - 1];

    expect(lastEvent).toMatchObject(attributeMutationFactory({ open: null }));
  });

  it('show & close dialog', async () => {
    await page.evaluate(() => {
      const dialog = document.querySelector('dialog') as HTMLDialogElement;
      dialog.show();
    });
    await waitForRAF(page);
    await page.evaluate(() => {
      const dialog = document.querySelector('dialog') as HTMLDialogElement;
      dialog.close();
    });

    const lastEvent = events[events.length - 1];

    expect(lastEvent).toMatchObject(attributeMutationFactory({ open: null }));
  });

  it('switch to showModal dialog', async () => {
    await page.evaluate(() => {
      const dialog = document.querySelector('dialog') as HTMLDialogElement;
      dialog.show();
    });
    await waitForRAF(page);
    await page.evaluate(() => {
      const dialog = document.querySelector('dialog') as HTMLDialogElement;
      dialog.close();
      dialog.showModal();
    });

    await assertSnapshot(events);
  });

  it('switch to show dialog', async () => {
    await page.evaluate(() => {
      const dialog = document.querySelector('dialog') as HTMLDialogElement;
      dialog.showModal();
    });
    await waitForRAF(page);
    await page.evaluate(() => {
      const dialog = document.querySelector('dialog') as HTMLDialogElement;
      dialog.close();
      dialog.show();
    });

    await assertSnapshot(events);
  });

  it('add dialog and showModal', async () => {
    await page.evaluate(() => {
      const dialog = document.createElement('dialog') as HTMLDialogElement;
      document.body.appendChild(dialog);
      dialog.showModal();
    });
    await waitForRAF(page);

    await assertSnapshot(events);
  });

  it('add dialog and show', async () => {
    await page.evaluate(() => {
      const dialog = document.createElement('dialog') as HTMLDialogElement;
      document.body.appendChild(dialog);
      dialog.show();
    });
    await waitForRAF(page);

    await assertSnapshot(events);
  });

  // TODO: implement me in the future
  it.skip('should record playback order with multiple dialogs opening', async () => {
    await page.evaluate(() => {
      const dialog1 = document.createElement('dialog') as HTMLDialogElement;
      dialog1.className = 'dialog1';
      document.body.appendChild(dialog1);
      const dialog2 = document.createElement('dialog') as HTMLDialogElement;
      dialog1.className = 'dialog2';
      document.body.appendChild(dialog2);
      dialog2.showModal(); // <== Note that dialog TWO is being triggered first
      dialog1.showModal();
    });

    await waitForRAF(page);
    await assertSnapshot(events); // <== This should trigger showModal() on dialog2 first, then dialog1
  });
});
