/**
 * @vitest-environment jsdom
 */
//import MutationBuffer from '../mutation';
//import type { MutationBufferParam } from '../../types';
/*

describe('Processing mutations', () => {

  describe('Large list 1 perf', () => {
    const mutationBuffer = new MutationBuffer();
    const options: MutationBufferParam = {
    };
    mutationBuffer.init(options);

    mutationBuffer.processMutations([]);
  });
*/

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
import { EventType, eventWithTime, listenerHandler } from '@rrweb/types';
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

describe('mutation', () => {
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

    await page.goto(`${serverURL}/html/mutation.html`);
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
        slimDOMOptions: {
          comment: true,
        },
      });
    });

    await waitForRAF(page);
  });

  it('add elements all at once', async () => {
    await page.evaluate(() => {
      const d1 = document.createElement('div');
      d1.id = 'd1';
      const s1 = document.createElement('span');
      d1.append(s1);
      const d2 = document.createElement('div');
      d2.id = 'd2';
      const s2 = document.createElement('span');
      d2.append(s2);
      const d3 = document.createElement('div');
      d3.id = 'd3';
      const s3 = document.createElement('span');
      d3.append(s3);

      d1.append(d2);
      d1.append(d3);
      document.body.append(d1);
    });
    await waitForRAF(page);
    const mutations = events.filter(
      (e) => e.type === EventType.IncrementalSnapshot,
    );
    await assertSnapshot(mutations, true);
  });

  it('add root first', async () => {
    await page.evaluate(() => {
      const d1 = document.createElement('div');
      d1.id = 'd1';
      const s1 = document.createElement('span');
      d1.append(s1);
      document.body.append(d1);
      const d2 = document.createElement('div');
      d2.id = 'd2';
      const s2 = document.createElement('span');
      d2.append(s2);
      const d3 = document.createElement('div');
      d3.id = 'd3';
      const s3 = document.createElement('span');
      d3.append(s3);

      d1.append(d2);
      d1.append(d3);
    });
    await waitForRAF(page);
    const mutations = events.filter(
      (e) => e.type === EventType.IncrementalSnapshot,
    );

    // assert has same output as previous test despite difference in way elements are added to DOM
    //await assertSnapshot(mutations, 'mutation.test.ts.mutation.add_elements_all_at_once');

    await assertSnapshot(mutations, true);
  });

  it('ignored firstchild comment', async () => {
    await page.evaluate(() => {
      const d1 = document.createElement('div');
      document.body.append(d1);
      const c1 = document.createComment('slimdom ignored');
      const siblingDiv = document.createElement('div');
      d1.append(c1);
      d1.append(siblingDiv);
    });
    await waitForRAF(page);
    const mutations = events.filter(
      (e) => e.type === EventType.IncrementalSnapshot,
    );
    await assertSnapshot(mutations, true);
  });

  it('ignored middlechild comment', async () => {
    await page.evaluate(() => {
      const d1 = document.createElement('div');
      document.body.append(d1);
      const c1 = document.createComment('slimdom ignored');
      const siblingDiv = document.createElement('div');
      const siblingDiv2 = document.createElement('div');
      d1.append(siblingDiv);
      d1.append(c1);
      d1.append(siblingDiv2);
    });
    await waitForRAF(page);
    const mutations = events.filter(
      (e) => e.type === EventType.IncrementalSnapshot,
    );
    await assertSnapshot(mutations, true);
  });

  it('ignored endchild comment', async () => {
    await page.evaluate(() => {
      const d1 = document.createElement('div');
      document.body.append(d1);
      const c1 = document.createComment('slimdom ignored');
      const siblingDiv = document.createElement('div');
      d1.append(siblingDiv);
      d1.append(c1);
    });
    await waitForRAF(page);
    const mutations = events.filter(
      (e) => e.type === EventType.IncrementalSnapshot,
    );
    await assertSnapshot(mutations, true);
  });
});
