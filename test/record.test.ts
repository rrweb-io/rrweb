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
  IncrementalSource,
  styleSheetRuleData,
} from '../src/types';
import { assertSnapshot, launchPuppeteer } from './utils';
import { Suite } from 'mocha';

interface ISuite extends Suite {
  code: string;
  browser: puppeteer.Browser;
  page: puppeteer.Page;
  events: eventWithTime[];
}

interface IWindow extends Window {
  rrweb: {
    record: (
      options: recordOptions<eventWithTime>,
    ) => listenerHandler | undefined;
    addCustomEvent<T>(tag: string, payload: T): void;
  };
  emit: (e: eventWithTime) => undefined;
}

describe('record', function (this: ISuite) {
  before(async () => {
    this.browser = await launchPuppeteer();

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

    page.on('console', (msg) => console.log('PAGE LOG:', msg.text()));
  });

  afterEach(async () => {
    await this.page.close();
  });

  after(async () => {
    await this.browser.close();
  });

  it('will only have one full snapshot without checkout config', async () => {
    await this.page.evaluate(() => {
      const { record } = ((window as unknown) as IWindow).rrweb;
      record({
        emit: ((window as unknown) as IWindow).emit,
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
      const { record } = ((window as unknown) as IWindow).rrweb;
      record({
        emit: ((window as unknown) as IWindow).emit,
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
    expect(this.events[13].type).to.equal(EventType.FullSnapshot);
    expect(this.events[25].type).to.equal(EventType.FullSnapshot);
    expect(this.events[37].type).to.equal(EventType.FullSnapshot);
  });

  it('can checkout full snapshot by time', async () => {
    await this.page.evaluate(() => {
      const { record } = ((window as unknown) as IWindow).rrweb;
      record({
        emit: ((window as unknown) as IWindow).emit,
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
    expect(this.events[35].type).to.equal(EventType.FullSnapshot);
  });

  it('is safe to checkout during async callbacks', async () => {
    await this.page.evaluate(() => {
      const { record } = ((window as unknown) as IWindow).rrweb;
      record({
        emit: ((window as unknown) as IWindow).emit,
        checkoutEveryNth: 2,
      });
      const p = document.createElement('p');
      const span = document.createElement('span');
      setTimeout(() => {
        document.body.appendChild(p);
        p.appendChild(span);
        document.body.removeChild(document.querySelector('input')!);
      }, 0);
      setTimeout(() => {
        span.innerText = 'test';
      }, 10);
      setTimeout(() => {
        p.removeChild(span);
        document.body.appendChild(span);
      }, 10);
    });
    await this.page.waitFor(100);
    assertSnapshot(this.events, __filename, 'async-checkout');
  });

  it('can add custom event', async () => {
    await this.page.evaluate(() => {
      const { record, addCustomEvent } = ((window as unknown) as IWindow).rrweb;
      record({
        emit: ((window as unknown) as IWindow).emit,
      });
      addCustomEvent<number>('tag1', 1);
      addCustomEvent<{ a: string }>('tag2', {
        a: 'b',
      });
    });
    await this.page.waitFor(50);
    assertSnapshot(this.events, __filename, 'custom-event');
  });

  it('captures stylesheet rules', async () => {
    await this.page.evaluate(() => {
      const { record } = ((window as unknown) as IWindow).rrweb;

      record({
        emit: ((window as unknown) as IWindow).emit,
      });

      const styleElement = document.createElement('style');
      document.head.appendChild(styleElement);

      const styleSheet = <CSSStyleSheet>styleElement.sheet;
      const ruleIdx0 = styleSheet.insertRule('body { background: #000; }');
      const ruleIdx1 = styleSheet.insertRule('body { background: #111; }');
      styleSheet.deleteRule(ruleIdx1);
      setTimeout(() => {
        styleSheet.insertRule('body { color: #fff; }');
      }, 0);
      setTimeout(() => {
        styleSheet.deleteRule(ruleIdx0);
      }, 5);
      setTimeout(() => {
        styleSheet.insertRule('body { color: #ccc; }');
      }, 10);
    });
    await this.page.waitFor(10);
    const styleSheetRuleEvents = this.events.filter(
      (e) =>
        e.type === EventType.IncrementalSnapshot &&
        e.data.source === IncrementalSource.StyleSheetRule,
    );
    const addRuleCount = styleSheetRuleEvents.filter((e) =>
      Boolean((e.data as styleSheetRuleData).adds),
    ).length;
    const removeRuleCount = styleSheetRuleEvents.filter((e) =>
      Boolean((e.data as styleSheetRuleData).removes),
    ).length;
    // sync insert/delete should be ignored
    expect(addRuleCount).to.equal(2);
    expect(removeRuleCount).to.equal(1);
    assertSnapshot(this.events, __filename, 'stylesheet-rules');
  });
});
