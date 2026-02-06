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

  const setup = async (htmlfile) => {
    page = await browser.newPage();
    page.on('console', (msg) => {
      console.log(msg.text());
    });

    await page.goto(`${serverURL}/html/${htmlfile}`);
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
  };

  it('add elements all at once', async () => {
    await setup('mutation.html');
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
    await setup('mutation.html');
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
    await setup('mutation.html');
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
    await setup('mutation.html');
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
    await setup('mutation.html');
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

  it('blocked firstchild element', async () => {
    await setup('mutation.html');
    await page.evaluate(() => {
      const d1 = document.createElement('div');
      document.body.append(d1);
      const b1 = document.createElement('div');
      b1.className = 'rr-block';
      b1.append(document.createElement('div')); // shouldn't show up
      b1.append(document.createElement('div')); // shouldn't show up
      const siblingDiv = document.createElement('div');
      d1.append(b1);
      d1.append(siblingDiv);
    });
    await waitForRAF(page);
    const mutations = events.filter(
      (e) => e.type === EventType.IncrementalSnapshot,
    );
    await assertSnapshot(mutations, true);
  });

  it('blocked middlechild element', async () => {
    await setup('mutation.html');
    await page.evaluate(() => {
      const d1 = document.createElement('div');
      document.body.append(d1);
      const b1 = document.createElement('div');
      b1.className = 'rr-block';
      b1.append(document.createElement('div')); // shouldn't show up
      b1.append(document.createElement('div')); // shouldn't show up
      const siblingDiv = document.createElement('div');
      const siblingDiv2 = document.createElement('div');
      d1.append(siblingDiv);
      d1.append(b1);
      d1.append(siblingDiv2);
    });
    await waitForRAF(page);
    const mutations = events.filter(
      (e) => e.type === EventType.IncrementalSnapshot,
    );
    await assertSnapshot(mutations, true);
  });

  it('blocked endchild element', async () => {
    await setup('mutation.html');
    await page.evaluate(() => {
      const d1 = document.createElement('div');
      document.body.append(d1);
      const b1 = document.createElement('div');
      b1.className = 'rr-block';
      b1.append(document.createElement('div')); // shouldn't show up
      b1.append(document.createElement('div')); // shouldn't show up
      const siblingDiv = document.createElement('div');
      d1.append(siblingDiv);
      d1.append(b1);
    });
    await waitForRAF(page);
    const mutations = events.filter(
      (e) => e.type === EventType.IncrementalSnapshot,
    );
    await assertSnapshot(mutations, true);
  });

  it('siblings added in idleCallback', async () => {
    await setup('mutation.html');
    await page.evaluate(() => {
      document.body.childNodes.forEach((cn) => document.body.removeChild(cn)); // clear out text nodes created by server
      document.body.prepend(document.createElement('div'));
      requestAnimationFrame(() => {
        //rrweb.freezePage();
        document.body.prepend(document.createElement('div'));
        document.body.append(document.createElement('div'));
      });
    });
    await waitForRAF(page);
    const mutations = events.filter(
      (e) => e.type === EventType.IncrementalSnapshot,
    );
    await assertSnapshot(mutations, true);
  });

  it('ignored firstchild comment already there', async () => {
    await setup('mutation-already-there.html');
    await page.evaluate(() => {
      const siblingDiv = document.createElement('div');
      document.getElementById('with-comment').append(siblingDiv);
    });
    await waitForRAF(page);
    const mutations = events.filter((e) =>
      [EventType.IncrementalSnapshot, EventType.FullSnapshot].includes(e.type),
    );
    await assertSnapshot(mutations, true);
  });

  it('ignored middlechild comment already there', async () => {
    await setup('mutation-already-there.html');
    await page.evaluate(() => {
      const siblingDiv = document.createElement('div');
      const siblingDiv2 = document.createElement('div');
      document
        .getElementById('with-comment')
        .insertAdjacentElement('afterbegin', siblingDiv);
      document.getElementById('with-comment').append(siblingDiv2);
    });
    await waitForRAF(page);
    const mutations = events.filter((e) =>
      [EventType.IncrementalSnapshot, EventType.FullSnapshot].includes(e.type),
    );
    await assertSnapshot(mutations, true);
  });

  it('ignored endchild comment already there', async () => {
    await setup('mutation-already-there.html');
    await page.evaluate(() => {
      const siblingDiv = document.createElement('div');
      document
        .getElementById('with-comment')
        .insertAdjacentElement('afterbegin', siblingDiv);
    });
    await waitForRAF(page);
    const mutations = events.filter((e) =>
      [EventType.IncrementalSnapshot, EventType.FullSnapshot].includes(e.type),
    );
    await assertSnapshot(mutations, true);
  });

  it('blocked firstchild element already there', async () => {
    await setup('mutation-already-there.html');
    await page.evaluate(() => {
      const d1 = document.getElementById('with-blocked');
      const b1 = d1.querySelector('.rr-block');
      b1.append(document.createElement('div')); // shouldn't show up
      b1.append(document.createElement('div')); // shouldn't show up
      const siblingDiv = document.createElement('div');
      d1.append(siblingDiv);
    });
    await waitForRAF(page);
    const mutations = events.filter((e) =>
      [EventType.IncrementalSnapshot, EventType.FullSnapshot].includes(e.type),
    );
    await assertSnapshot(mutations, true);
  });

  it('blocked middlechild element already there', async () => {
    await setup('mutation-already-there.html');
    await page.evaluate(() => {
      const d1 = document.getElementById('with-blocked');
      const b1 = d1.querySelector('.rr-block');
      b1.append(document.createElement('div')); // shouldn't show up
      b1.append(document.createElement('div')); // shouldn't show up
      const siblingDiv = document.createElement('div');
      const siblingDiv2 = document.createElement('div');
      d1.insertAdjacentElement('afterbegin', siblingDiv);
      d1.append(siblingDiv2);
    });
    await waitForRAF(page);
    const mutations = events.filter((e) =>
      [EventType.IncrementalSnapshot, EventType.FullSnapshot].includes(e.type),
    );
    await assertSnapshot(mutations, true);
  });

  it('blocked endchild element already there', async () => {
    await setup('mutation-already-there.html');
    await page.evaluate(() => {
      const d1 = document.getElementById('with-blocked');
      const b1 = d1.querySelector('.rr-block');
      b1.append(document.createElement('div')); // shouldn't show up
      b1.append(document.createElement('div')); // shouldn't show up
      const siblingDiv = document.createElement('div');
      d1.insertAdjacentElement('afterbegin', siblingDiv);
    });
    await waitForRAF(page);
    const mutations = events.filter((e) =>
      [EventType.IncrementalSnapshot, EventType.FullSnapshot].includes(e.type),
    );
    await assertSnapshot(mutations, true);
  });
});
