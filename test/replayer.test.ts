/* tslint:disable no-string-literal no-console */

import * as fs from 'fs';
import * as path from 'path';
import * as puppeteer from 'puppeteer';
import { expect } from 'chai';
import { Suite } from 'mocha';
import {
  EventType,
  eventWithTime,
  IncrementalSource,
  MouseInteractions,
} from '../src/types';
import { Replayer } from '../src';

const now = Date.now();

const events: eventWithTime[] = [
  {
    type: EventType.DomContentLoaded,
    data: {},
    timestamp: now,
  },
  {
    type: EventType.Load,
    data: {},
    timestamp: now + 1000,
  },
  {
    type: EventType.Meta,
    data: {
      href: 'http://localhost',
      width: 1000,
      height: 800,
    },
    timestamp: now + 1000,
  },
  {
    type: EventType.FullSnapshot,
    data: {
      node: {
        type: 0,
        childNodes: [
          {
            type: 2,
            tagName: 'html',
            attributes: {},
            childNodes: [
              {
                type: 2,
                tagName: 'head',
                attributes: {},
                childNodes: [],
                id: 3,
              },
              {
                type: 2,
                tagName: 'body',
                attributes: {},
                childNodes: [],
                id: 4,
              },
            ],
            id: 2,
          },
        ],
        id: 1,
      },
      initialOffset: {
        top: 0,
        left: 0,
      },
    },
    timestamp: now + 1000,
  },
  {
    type: EventType.IncrementalSnapshot,
    data: {
      source: IncrementalSource.MouseInteraction,
      type: MouseInteractions.Click,
      id: 1,
      x: 0,
      y: 0,
    },
    timestamp: now + 2000,
  },
  {
    type: EventType.IncrementalSnapshot,
    data: {
      source: IncrementalSource.MouseInteraction,
      type: MouseInteractions.Click,
      id: 1,
      x: 0,
      y: 0,
    },
    timestamp: now + 3000,
  },
  {
    type: EventType.IncrementalSnapshot,
    data: {
      source: IncrementalSource.MouseInteraction,
      type: MouseInteractions.Click,
      id: 1,
      x: 0,
      y: 0,
    },
    timestamp: now + 4000,
  },
];

interface IWindow extends Window {
  rrweb: {
    Replayer: typeof Replayer;
  };
}

interface ISuite extends Suite {
  code: string;
  browser: puppeteer.Browser;
  page: puppeteer.Page;
}

describe('replayer', function(this: ISuite) {
  before(async () => {
    this.browser = await puppeteer.launch({
      headless: false,
      args: ['--no-sandbox'],
    });

    const bundlePath = path.resolve(__dirname, '../dist/rrweb.min.js');
    this.code = fs.readFileSync(bundlePath, 'utf8');
  });

  beforeEach(async () => {
    const page: puppeteer.Page = await this.browser.newPage();
    await page.goto('about:blank');
    await page.evaluate(this.code);
    await page.evaluate(`const events = ${JSON.stringify(events)}`);
    this.page = page;

    page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  });

  afterEach(async () => {
    await this.page.close();
  });

  after(async () => {
    await this.browser.close();
  });

  it('can get meta data', async () => {
    const meta = await this.page.evaluate(() => {
      const { Replayer } = (window as IWindow).rrweb;
      const replayer = new Replayer(events);
      return replayer.getMetaData();
    });
    expect(meta).to.deep.equal({
      totalTime: events[events.length - 1].timestamp - events[0].timestamp,
    });
  });

  it('will start actions when play', async () => {
    const actionLength = await this.page.evaluate(() => {
      const { Replayer } = (window as IWindow).rrweb;
      const replayer = new Replayer(events);
      replayer.play();
      return replayer['timer']['actions'].length;
    });
    expect(actionLength).to.equal(events.length);
  });

  it('will clean actions when pause', async () => {
    const actionLength = await this.page.evaluate(() => {
      const { Replayer } = (window as IWindow).rrweb;
      const replayer = new Replayer(events);
      replayer.play();
      replayer.pause();
      return replayer['timer']['actions'].length;
    });
    expect(actionLength).to.equal(0);
  });

  it('can play at any time offset', async () => {
    const actionLength = await this.page.evaluate(() => {
      const { Replayer } = (window as IWindow).rrweb;
      const replayer = new Replayer(events);
      replayer.play(1500);
      return replayer['timer']['actions'].length;
    });
    expect(actionLength).to.equal(
      events.filter(e => e.timestamp - events[0].timestamp >= 1500).length,
    );
  });

  it('can resume at any time offset', async () => {
    const actionLength = await this.page.evaluate(() => {
      const { Replayer } = (window as IWindow).rrweb;
      const replayer = new Replayer(events);
      replayer.play(1500);
      replayer.pause();
      replayer.resume(1500);
      return replayer['timer']['actions'].length;
    });
    expect(actionLength).to.equal(
      events.filter(e => e.timestamp - events[0].timestamp >= 1500).length,
    );
  });
});
