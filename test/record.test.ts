/* tslint:disable no-console */

import * as fs from 'fs';
import * as path from 'path';
import * as puppeteer from 'puppeteer';
import { expect } from 'chai';
import {
  recordOptions,
  listenerHandler,
  eventWithTime,
  EventType,
} from '../src/types';

interface IWindow extends Window {
  rrweb: {
    record: (options: recordOptions) => listenerHandler | undefined;
  };
  emit: (e: eventWithTime) => undefined;
}

describe('record', () => {
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
    await page.setContent(`
      <html>
        <body>
          <input type="text" />
        </body>
      </html>
    `);
    await page.evaluate(this.code);
    this.page = page;
    this.events = [];
    await this.page.exposeFunction('emit', (e: eventWithTime) => {
      if (e.type === EventType.DomContentLoaded || e.type === EventType.Load) {
        return;
      }
      this.events.push(e);
    });

    page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  });

  afterEach(async () => {
    await this.page.close();
  });

  after(async () => {
    await this.browser.close();
  });

  it('can will only have one full snapshot without checkout config', async () => {
    await this.page.evaluate(() => {
      const { record } = (window as IWindow).rrweb;
      record({
        emit: (window as IWindow).emit,
      });
    });
    let count = 30;
    while (count--) {
      await this.page.type('input', 'a');
    }
    await this.page.waitFor(10);
    expect(this.events.length).to.equal(33);
    expect(
      this.events.filter(
        (event: eventWithTime) => event.type === EventType.Meta,
      ).length,
    ).to.equal(1);
    expect(
      this.events.filter(
        (event: eventWithTime) => event.type === EventType.FullSnapshot,
      ).length,
    ).to.equal(1);
  });

  it('can checkout full snapshot by count', async () => {
    await this.page.evaluate(() => {
      const { record } = (window as IWindow).rrweb;
      record({
        emit: (window as IWindow).emit,
        checkoutEveryNth: 10,
      });
    });
    let count = 30;
    while (count--) {
      await this.page.type('input', 'a');
    }
    await this.page.waitFor(10);
    expect(this.events.length).to.equal(39);
    expect(
      this.events.filter(
        (event: eventWithTime) => event.type === EventType.Meta,
      ).length,
    ).to.equal(4);
    expect(
      this.events.filter(
        (event: eventWithTime) => event.type === EventType.FullSnapshot,
      ).length,
    ).to.equal(4);
    expect(this.events[1].type).to.equal(EventType.FullSnapshot);
    expect(this.events[12].type).to.equal(EventType.FullSnapshot);
    expect(this.events[24].type).to.equal(EventType.FullSnapshot);
    expect(this.events[36].type).to.equal(EventType.FullSnapshot);
  });

  it('can checkout full snapshot by time', async () => {
    await this.page.evaluate(() => {
      const { record } = (window as IWindow).rrweb;
      record({
        emit: (window as IWindow).emit,
        checkoutEveryNms: 500,
      });
    });
    let count = 30;
    while (count--) {
      await this.page.type('input', 'a');
    }
    await this.page.waitFor(500);
    expect(this.events.length).to.equal(33);
    await this.page.type('input', 'a');
    await this.page.waitFor(10);
    expect(this.events.length).to.equal(36);
    expect(
      this.events.filter(
        (event: eventWithTime) => event.type === EventType.Meta,
      ).length,
    ).to.equal(2);
    expect(
      this.events.filter(
        (event: eventWithTime) => event.type === EventType.FullSnapshot,
      ).length,
    ).to.equal(2);
    expect(this.events[1].type).to.equal(EventType.FullSnapshot);
    expect(this.events[34].type).to.equal(EventType.FullSnapshot);
  });
});
