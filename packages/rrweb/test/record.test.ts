/* tslint:disable no-console */

import * as fs from 'fs';
import * as path from 'path';
import * as puppeteer from 'puppeteer';
import {
  recordOptions,
  listenerHandler,
  eventWithTime,
  EventType,
  IncrementalSource,
  styleSheetRuleData,
} from '../src/types';
import { assertSnapshot, launchPuppeteer } from './utils';

interface ISuite {
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

const setup = function (this: ISuite, content: string): ISuite {
  const ctx = {} as ISuite;

  beforeAll(async () => {
    ctx.browser = await launchPuppeteer();

    const bundlePath = path.resolve(__dirname, '../dist/rrweb.min.js');
    ctx.code = fs.readFileSync(bundlePath, 'utf8');
  });

  beforeEach(async () => {
    ctx.page = await ctx.browser.newPage();
    await ctx.page.goto('about:blank');
    await ctx.page.setContent(content);
    await ctx.page.evaluate(ctx.code);
    ctx.events = [];
    await ctx.page.exposeFunction('emit', (e: eventWithTime) => {
      if (e.type === EventType.DomContentLoaded || e.type === EventType.Load) {
        return;
      }
      ctx.events.push(e);
    });

    ctx.page.on('console', (msg) => console.log('PAGE LOG:', msg.text()));
  });

  afterEach(async () => {
    await ctx.page.close();
  });

  afterAll(async () => {
    await ctx.browser.close();
  });

  return ctx;
};

describe('record', function (this: ISuite) {
  jest.setTimeout(10_000);

  const ctx: ISuite = setup.call(
    this,
    `
      <!DOCTYPE html>
      <html>
        <body>
          <input type="text" size="40" />
        </body>
      </html>
    `,
  );

  it('will only have one full snapshot without checkout config', async () => {
    await ctx.page.evaluate(() => {
      const { record } = ((window as unknown) as IWindow).rrweb;
      record({
        emit: ((window as unknown) as IWindow).emit,
      });
    });
    let count = 30;
    while (count--) {
      await ctx.page.type('input', 'a');
    }
    await ctx.page.waitForTimeout(10);
    expect(ctx.events.length).toEqual(33);
    expect(
      ctx.events.filter((event: eventWithTime) => event.type === EventType.Meta)
        .length,
    ).toEqual(1);
    expect(
      ctx.events.filter(
        (event: eventWithTime) => event.type === EventType.FullSnapshot,
      ).length,
    ).toEqual(1);
  });

  it('can checkout full snapshot by count', async () => {
    await ctx.page.evaluate(() => {
      const { record } = ((window as unknown) as IWindow).rrweb;
      record({
        emit: ((window as unknown) as IWindow).emit,
        checkoutEveryNth: 10,
      });
    });
    let count = 30;
    while (count--) {
      await ctx.page.type('input', 'a');
    }
    await ctx.page.waitForTimeout(10);
    expect(ctx.events.length).toEqual(39);
    expect(
      ctx.events.filter((event: eventWithTime) => event.type === EventType.Meta)
        .length,
    ).toEqual(4);
    expect(
      ctx.events.filter(
        (event: eventWithTime) => event.type === EventType.FullSnapshot,
      ).length,
    ).toEqual(4);
    expect(ctx.events[1].type).toEqual(EventType.FullSnapshot);
    expect(ctx.events[13].type).toEqual(EventType.FullSnapshot);
    expect(ctx.events[25].type).toEqual(EventType.FullSnapshot);
    expect(ctx.events[37].type).toEqual(EventType.FullSnapshot);
  });

  it('can checkout full snapshot by time', async () => {
    await ctx.page.evaluate(() => {
      const { record } = ((window as unknown) as IWindow).rrweb;
      record({
        emit: ((window as unknown) as IWindow).emit,
        checkoutEveryNms: 500,
      });
    });
    let count = 30;
    while (count--) {
      await ctx.page.type('input', 'a');
    }
    await ctx.page.waitForTimeout(300);
    expect(ctx.events.length).toEqual(33); // before first automatic snapshot
    await ctx.page.waitForTimeout(200); // could be 33 or 35 events by now depending on speed of test env
    await ctx.page.type('input', 'a');
    await ctx.page.waitForTimeout(10);
    expect(ctx.events.length).toEqual(36); // additionally includes the 2 checkout events
    expect(
      ctx.events.filter((event: eventWithTime) => event.type === EventType.Meta)
        .length,
    ).toEqual(2);
    expect(
      ctx.events.filter(
        (event: eventWithTime) => event.type === EventType.FullSnapshot,
      ).length,
    ).toEqual(2);
    expect(ctx.events[1].type).toEqual(EventType.FullSnapshot);
    expect(ctx.events[35].type).toEqual(EventType.FullSnapshot);
  });

  it('is safe to checkout during async callbacks', async () => {
    await ctx.page.evaluate(() => {
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
    await ctx.page.waitForTimeout(100);
    assertSnapshot(ctx.events);
  });

  it('can add custom event', async () => {
    await ctx.page.evaluate(() => {
      const { record, addCustomEvent } = ((window as unknown) as IWindow).rrweb;
      record({
        emit: ((window as unknown) as IWindow).emit,
      });
      addCustomEvent<number>('tag1', 1);
      addCustomEvent<{ a: string }>('tag2', {
        a: 'b',
      });
    });
    await ctx.page.waitForTimeout(50);
    assertSnapshot(ctx.events);
  });

  it('captures stylesheet rules', async () => {
    await ctx.page.evaluate(() => {
      const { record } = ((window as unknown) as IWindow).rrweb;

      record({
        emit: ((window as unknown) as IWindow).emit,
      });

      const styleElement = document.createElement('style');
      document.head.appendChild(styleElement);

      const styleSheet = <CSSStyleSheet>styleElement.sheet;
      // begin: pre-serialization
      const ruleIdx0 = styleSheet.insertRule('body { background: #000; }');
      const ruleIdx1 = styleSheet.insertRule('body { background: #111; }');
      styleSheet.deleteRule(ruleIdx1);
      // end: pre-serialization
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
    await ctx.page.waitForTimeout(50);
    const styleSheetRuleEvents = ctx.events.filter(
      (e) =>
        e.type === EventType.IncrementalSnapshot &&
        e.data.source === IncrementalSource.StyleSheetRule,
    );
    const addRules = styleSheetRuleEvents.filter((e) =>
      Boolean((e.data as styleSheetRuleData).adds),
    );
    const removeRuleCount = styleSheetRuleEvents.filter((e) =>
      Boolean((e.data as styleSheetRuleData).removes),
    ).length;
    // pre-serialization insert/delete should be ignored
    expect(addRules.length).toEqual(2);
    expect((addRules[0].data as styleSheetRuleData).adds).toEqual([
      {
        rule: 'body { color: #fff; }',
      },
    ]);
    expect(removeRuleCount).toEqual(1);
    assertSnapshot(ctx.events);
  });

  const captureNestedStylesheetRulesTest = async () => {
    await ctx.page.evaluate(() => {
      const { record } = ((window as unknown) as IWindow).rrweb;

      record({
        emit: ((window as unknown) as IWindow).emit,
      });

      const styleElement = document.createElement('style');
      document.head.appendChild(styleElement);

      const styleSheet = <CSSStyleSheet>styleElement.sheet;
      styleSheet.insertRule('@media {}');
      const atMediaRule = styleSheet.cssRules[0] as CSSMediaRule;

      const ruleIdx0 = atMediaRule.insertRule('body { background: #000; }', 0);
      const ruleIdx1 = atMediaRule.insertRule('body { background: #111; }', 0);
      atMediaRule.deleteRule(ruleIdx1);
      setTimeout(() => {
        atMediaRule.insertRule('body { color: #fff; }', 0);
      }, 0);
      setTimeout(() => {
        atMediaRule.deleteRule(ruleIdx0);
      }, 5);
      setTimeout(() => {
        atMediaRule.insertRule('body { color: #ccc; }', 0);
      }, 10);
    });
    await ctx.page.waitForTimeout(50);
    const styleSheetRuleEvents = ctx.events.filter(
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
    expect(addRuleCount).toEqual(2);
    expect(removeRuleCount).toEqual(1);
    assertSnapshot(ctx.events);
  };
  it('captures nested stylesheet rules', captureNestedStylesheetRulesTest);

  describe('without CSSGroupingRule support', () => {
    // Safari currently doesn't support CSSGroupingRule, let's test without that
    // https://caniuse.com/?search=CSSGroupingRule
    beforeEach(async () => {
      await ctx.page.evaluate(() => {
        /* @ts-ignore: override CSSGroupingRule */
        CSSGroupingRule = undefined;
      });
      // load a fresh rrweb recorder without CSSGroupingRule
      await ctx.page.evaluate(ctx.code);
    });
    it('captures nested stylesheet rules', captureNestedStylesheetRulesTest);
  });

  it('captures style property changes', async () => {
    await ctx.page.evaluate(() => {
      const { record } = ((window as unknown) as IWindow).rrweb;

      record({
        emit: ((window as unknown) as IWindow).emit,
      });

      const styleElement = document.createElement('style');
      document.head.appendChild(styleElement);

      const styleSheet = <CSSStyleSheet>styleElement.sheet;
      styleSheet.insertRule('body { background: #000; }');
      setTimeout(() => {
        (styleSheet.cssRules[0] as CSSStyleRule).style.setProperty(
          'color',
          'green',
        );
        (styleSheet.cssRules[0] as CSSStyleRule).style.removeProperty(
          'background',
        );
      }, 0);
    });
    await ctx.page.waitForTimeout(50);
    assertSnapshot(ctx.events);
  });
});

describe('record iframes', function (this: ISuite) {
  jest.setTimeout(10_000);

  const ctx: ISuite = setup.call(
    this,
    `
      <!DOCTYPE html>
      <html>
        <body>
          <iframe srcdoc="<button>Mysterious Button</button>" />
        </body>
      </html>
    `,
  );

  it('captures iframe content in correct order', async () => {
    await ctx.page.evaluate(() => {
      const { record } = ((window as unknown) as IWindow).rrweb;
      record({
        emit: ((window as unknown) as IWindow).emit,
      });
    });
    await ctx.page.waitForTimeout(10);
    // console.log(JSON.stringify(ctx.events));

    expect(ctx.events.length).toEqual(3);
    const eventTypes = ctx.events
      .filter(
        (e) =>
          e.type === EventType.IncrementalSnapshot ||
          e.type === EventType.FullSnapshot,
      )
      .map((e) => e.type);
    expect(eventTypes).toEqual([
      EventType.FullSnapshot,
      EventType.IncrementalSnapshot,
    ]);
  });

  it('captures stylesheet mutations in iframes', async () => {
    await ctx.page.evaluate(() => {
      const { record } = ((window as unknown) as IWindow).rrweb;
      record({
        // need to reference window.top for when we are in an iframe!
        emit: ((window.top as unknown) as IWindow).emit,
      });

      const iframe = document.querySelector('iframe');
      // outer timeout is needed to wait for initStyleSheetObserver on iframe to be set up
      setTimeout(() => {
        const idoc = (iframe as HTMLIFrameElement).contentDocument!;
        const styleElement = idoc.createElement('style');

        idoc.head.appendChild(styleElement);

        const styleSheet = <CSSStyleSheet>styleElement.sheet;
        styleSheet.insertRule('@media {}');
        const atMediaRule = styleSheet.cssRules[0] as CSSMediaRule;
        const atRuleIdx0 = atMediaRule.insertRule(
          'body { background: #000; }',
          0,
        );
        const ruleIdx0 = styleSheet.insertRule('body { background: #000; }'); // inserted before above
        // pre-serialization insert/delete above should be ignored
        setTimeout(() => {
          styleSheet.insertRule('body { color: #fff; }');
          atMediaRule.insertRule('body { color: #ccc; }', 0);
        }, 0);
        setTimeout(() => {
          styleSheet.deleteRule(ruleIdx0);
          (styleSheet.cssRules[0] as CSSStyleRule).style.setProperty(
            'color',
            'green',
          );
        }, 5);
        setTimeout(() => {
          atMediaRule.deleteRule(atRuleIdx0);
        }, 10);
      }, 10);
    });
    await ctx.page.waitForTimeout(50);
    const styleRelatedEvents = ctx.events.filter(
      (e) =>
        e.type === EventType.IncrementalSnapshot &&
        (e.data.source === IncrementalSource.StyleSheetRule ||
          e.data.source === IncrementalSource.StyleDeclaration),
    );
    const addRuleCount = styleRelatedEvents.filter((e) =>
      Boolean((e.data as styleSheetRuleData).adds),
    ).length;
    const removeRuleCount = styleRelatedEvents.filter((e) =>
      Boolean((e.data as styleSheetRuleData).removes),
    ).length;
    expect(styleRelatedEvents.length).toEqual(5);
    expect(addRuleCount).toEqual(2);
    expect(removeRuleCount).toEqual(2);
    assertSnapshot(ctx.events);
  });
});
