import * as fs from 'fs';
import * as path from 'path';
import type * as puppeteer from 'puppeteer';
import {
  recordOptions,
  listenerHandler,
  eventWithTime,
  EventType,
  IncrementalSource,
  styleSheetRuleData,
  selectionData,
} from '../src/types';
import { assertSnapshot, launchPuppeteer, waitForRAF } from './utils';

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
    ctx.browser = await launchPuppeteer({
      devtools: true,
    });

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
    await ctx.page.type('input', 'a');
    await ctx.page.waitForTimeout(300);
    expect(
      ctx.events.filter((event: eventWithTime) => event.type === EventType.Meta)
        .length,
    ).toEqual(1); // before first automatic snapshot
    expect(
      ctx.events.filter(
        (event: eventWithTime) => event.type === EventType.FullSnapshot,
      ).length,
    ).toEqual(1); // before first automatic snapshot
    await ctx.page.waitForTimeout(200);
    await ctx.page.type('input', 'a');
    await ctx.page.waitForTimeout(10);
    expect(
      ctx.events.filter((event: eventWithTime) => event.type === EventType.Meta)
        .length,
    ).toEqual(2);
    expect(
      ctx.events.filter(
        (event: eventWithTime) => event.type === EventType.FullSnapshot,
      ).length,
    ).toEqual(2);
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

  it('should record scroll position', async () => {
    await ctx.page.evaluate(() => {
      const { record } = ((window as unknown) as IWindow).rrweb;
      record({
        emit: ((window as unknown) as IWindow).emit,
      });
      const p = document.createElement('p');
      p.innerText = 'testtesttesttesttesttesttesttesttesttest';
      p.setAttribute('style', 'overflow: auto; height: 1px; width: 1px;');
      document.body.appendChild(p);
      p.scrollTop = 10;
      p.scrollLeft = 10;
    });
    await waitForRAF(ctx.page);
    assertSnapshot(ctx.events);
  });

  it('should record selection event', async () => {
    await ctx.page.evaluate(() => {
      const { record } = ((window as unknown) as IWindow).rrweb;
      record({
        emit: ((window as unknown) as IWindow).emit,
      });
      const startNode = document.createElement('p');

      startNode.innerText =
        'Lorem ipsum dolor sit amet consectetur adipisicing elit.';

      const endNode = document.createElement('span');
      endNode.innerText =
        'nihil ipsum officiis pariatur laboriosam quas,corrupti vero vitae minus.';

      document.body.appendChild(startNode);
      document.body.appendChild(endNode);

      const selection = window.getSelection();
      const range = new Range();

      range.setStart(startNode!.firstChild!, 10);
      range.setEnd(endNode!.firstChild!, 2);

      selection?.addRange(range);
    });
    await waitForRAF(ctx.page);
    const selectionData = ctx.events
      .filter(({ type, data }) => {
        return (
          type === EventType.IncrementalSnapshot &&
          data.source === IncrementalSource.Selection
        );
      })
      .map((ev) => ev.data as selectionData);

    expect(selectionData.length).toEqual(1);
    expect(selectionData[0].ranges[0].startOffset).toEqual(10);
    expect(selectionData[0].ranges[0].endOffset).toEqual(2);
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

  it('captures inserted style text nodes correctly', async () => {
    await ctx.page.evaluate(() => {
      const { record } = ((window as unknown) as IWindow).rrweb;

      const styleEl = document.createElement(`style`);
      styleEl.append(document.createTextNode('div { color: red; }'));
      styleEl.append(document.createTextNode('section { color: blue; }'));
      document.head.appendChild(styleEl);

      record({
        emit: ((window as unknown) as IWindow).emit,
      });

      styleEl.append(document.createTextNode('span { color: orange; }'));
      styleEl.append(document.createTextNode('h1 { color: pink; }'));
    });
    await waitForRAF(ctx.page);
    assertSnapshot(ctx.events);
  });

  it('captures stylesheets with `blob:` url', async () => {
    await ctx.page.evaluate(() => {
      const link1 = document.createElement('link');
      link1.setAttribute('rel', 'stylesheet');
      link1.setAttribute(
        'href',
        URL.createObjectURL(
          new Blob(['body { color: pink; }'], {
            type: 'text/css',
          }),
        ),
      );
      document.head.appendChild(link1);
    });
    await waitForRAF(ctx.page);
    await ctx.page.evaluate(() => {
      const { record } = ((window as unknown) as IWindow).rrweb;

      record({
        inlineStylesheet: true,
        emit: ((window as unknown) as IWindow).emit,
      });
    });
    await waitForRAF(ctx.page);
    assertSnapshot(ctx.events);
  });

  it('captures mutations on adopted stylesheets', async () => {
    await ctx.page.evaluate(() => {
      document.body.innerHTML = `
        <div>div in outermost document</div>        
        <iframe></iframe>
      `;

      const sheet = new CSSStyleSheet();
      // Add stylesheet to a document.
      // @ts-ignore - TS doesn't support `CSSStyleSheet.adoptedStyleSheets` yet
      document.adoptedStyleSheets = [sheet];

      const iframe = document.querySelector('iframe');
      // @ts-ignore - TS doesn't support `CSSStyleSheet constructor` yet
      const sheet2 = new iframe!.contentWindow!.CSSStyleSheet();
      // Add stylesheet to an IFrame document.
      // @ts-ignore - TS doesn't support `CSSStyleSheet.adoptedStyleSheets` yet
      iframe.contentDocument.adoptedStyleSheets = [sheet2];
      iframe!.contentDocument!.body.innerHTML = '<h1>h1 in iframe</h1>';

      const { record } = ((window as unknown) as IWindow).rrweb;
      record({
        emit: ((window as unknown) as IWindow).emit,
      });

      setTimeout(() => {
        // @ts-ignore - TS doesn't support `CSSStyleSheet.replaceSync` yet
        sheet.replace('div { color: yellow; }');
        sheet2.replace('h1 { color: blue; }');
      }, 0);

      setTimeout(() => {
        // @ts-ignore - TS doesn't support `CSSStyleSheet.replaceSync` yet
        sheet.replaceSync('div { display: inline ; }');
        sheet2.replaceSync('h1 { font-size: large; }');
      }, 5);

      setTimeout(() => {
        (sheet.cssRules[0] as CSSStyleRule).style.setProperty('color', 'green');
        (sheet.cssRules[0] as CSSStyleRule).style.removeProperty('display');
        (sheet2.cssRules[0] as CSSStyleRule).style.setProperty(
          'font-size',
          'medium',
          'important',
        );
        sheet2.insertRule('h2 { color: red; }');
      }, 10);

      setTimeout(() => {
        sheet.insertRule('body { border: 2px solid blue; }', 1);
        sheet2.deleteRule(0);
      }, 15);
    });
    await waitForRAF(ctx.page);
    assertSnapshot(ctx.events);
  });

  it('captures stylesheets in iframes with `blob:` url', async () => {
    await ctx.page.evaluate(() => {
      const iframe = document.createElement('iframe');
      iframe.setAttribute('src', 'about:blank');
      document.body.appendChild(iframe);

      const linkEl = document.createElement('link');
      linkEl.setAttribute('rel', 'stylesheet');
      linkEl.setAttribute(
        'href',
        URL.createObjectURL(
          new Blob(['body { color: pink; }'], {
            type: 'text/css',
          }),
        ),
      );
      const iframeDoc = iframe.contentDocument!;
      iframeDoc.head.appendChild(linkEl);
    });
    await waitForRAF(ctx.page);
    await ctx.page.evaluate(() => {
      const { record } = ((window as unknown) as IWindow).rrweb;

      record({
        inlineStylesheet: true,
        emit: ((window as unknown) as IWindow).emit,
      });
    });
    await waitForRAF(ctx.page);
    assertSnapshot(ctx.events);
  });

  it('captures stylesheets that are still loading', async () => {
    await ctx.page.evaluate(() => {
      const { record } = ((window as unknown) as IWindow).rrweb;

      record({
        inlineStylesheet: true,
        emit: ((window as unknown) as IWindow).emit,
      });

      const link1 = document.createElement('link');
      link1.setAttribute('rel', 'stylesheet');
      link1.setAttribute(
        'href',
        URL.createObjectURL(
          new Blob(['body { color: pink; }'], {
            type: 'text/css',
          }),
        ),
      );
      document.head.appendChild(link1);
    });

    // `blob:` URLs are not available immediately, so we need to wait for the browser to load them
    await waitForRAF(ctx.page);

    assertSnapshot(ctx.events);
  });

  it('captures stylesheets in iframes that are still loading', async () => {
    await ctx.page.evaluate(() => {
      const iframe = document.createElement('iframe');
      iframe.setAttribute('src', 'about:blank');
      document.body.appendChild(iframe);
      const iframeDoc = iframe.contentDocument!;

      const { record } = ((window as unknown) as IWindow).rrweb;

      record({
        inlineStylesheet: true,
        emit: ((window as unknown) as IWindow).emit,
      });

      const linkEl = document.createElement('link');
      linkEl.setAttribute('rel', 'stylesheet');
      linkEl.setAttribute(
        'href',
        URL.createObjectURL(
          new Blob(['body { color: pink; }'], {
            type: 'text/css',
          }),
        ),
      );
      iframeDoc.head.appendChild(linkEl);
    });

    // `blob:` URLs are not available immediately, so we need to wait for the browser to load them
    await waitForRAF(ctx.page);

    assertSnapshot(ctx.events);
  });

  it('captures CORS stylesheets that are still loading', async () => {
    const corsStylesheetURL =
      'https://cdn.jsdelivr.net/npm/pure@2.85.0/index.css';

    // do not `await` the following function, otherwise `waitForResponse` _might_ not be called
    void ctx.page.evaluate((corsStylesheetURL) => {
      const { record } = ((window as unknown) as IWindow).rrweb;

      record({
        inlineStylesheet: true,
        emit: ((window as unknown) as IWindow).emit,
      });

      const link1 = document.createElement('link');
      link1.setAttribute('rel', 'stylesheet');
      link1.setAttribute('href', corsStylesheetURL);
      document.head.appendChild(link1);
    }, corsStylesheetURL);

    await ctx.page.waitForResponse(corsStylesheetURL); // wait for stylesheet to be loaded
    await waitForRAF(ctx.page); // wait for rrweb to emit events

    assertSnapshot(ctx.events);
  });

  it('captures adopted stylesheets in shadow doms and iframe', async () => {
    await ctx.page.evaluate(() => {
      document.body.innerHTML = `
        <div>div in outermost document</div>
        <div id="shadow-host1"></div>
        <div id="shadow-host2"></div>
        <iframe></iframe>
      `;

      const sheet = new CSSStyleSheet();
      // @ts-ignore - TS doesn't support `CSSStyleSheet.replaceSync` yet
      sheet.replaceSync(
        'div { color: yellow; } h2 { color: orange; } h3 { font-size: larger;}',
      );
      // Add stylesheet to a document.
      // @ts-ignore - TS doesn't support `CSSStyleSheet.adoptedStyleSheets` yet
      document.adoptedStyleSheets = [sheet];

      // Add stylesheet to a shadow host.
      const host = document.querySelector('#shadow-host1');
      const shadow = host!.attachShadow({ mode: 'open' });
      shadow.innerHTML =
        '<div>div in shadow dom 1</div><span>span in shadow dom 1</span>';
      const sheet2 = new CSSStyleSheet();
      // @ts-ignore - TS doesn't support `CSSStyleSheet.adoptedStyleSheets` yet
      sheet2.replaceSync('span { color: red; }');
      // @ts-ignore - TS doesn't support `CSSStyleSheet.adoptedStyleSheets` yet
      shadow.adoptedStyleSheets = [sheet, sheet2];

      // Add stylesheet to an IFrame document.
      const iframe = document.querySelector('iframe');
      // @ts-ignore - TS doesn't support `CSSStyleSheet constructor` yet
      const sheet3 = new iframe!.contentWindow!.CSSStyleSheet();
      sheet3.replaceSync('h1 { color: blue; }');
      // @ts-ignore - TS doesn't support `CSSStyleSheet.adoptedStyleSheets` yet
      iframe.contentDocument.adoptedStyleSheets = [sheet3];
      // @ts-ignore - TS doesn't support `CSSStyleSheet.adoptedStyleSheets` yet
      const ele = iframe.contentDocument.createElement('h1');
      ele.innerText = 'h1 in iframe';
      iframe!.contentDocument!.body.appendChild(ele);

      ((window as unknown) as IWindow).rrweb.record({
        emit: ((window.top as unknown) as IWindow).emit,
      });

      // Make incremental changes to shadow dom.
      setTimeout(() => {
        const host = document.querySelector('#shadow-host2');
        const shadow = host!.attachShadow({ mode: 'open' });
        shadow.innerHTML =
          '<div>div in shadow dom 2</div><span>span in shadow dom 2</span>';
        const sheet3 = new CSSStyleSheet();
        // @ts-ignore - TS doesn't support `CSSStyleSheet.replaceSync` yet
        sheet3.replaceSync('span { color: green; }');
        // @ts-ignore - TS doesn't support `CSSStyleSheet.replaceSync` yet
        shadow.adoptedStyleSheets = [sheet, sheet3];
      }, 10);
    });
    await waitForRAF(ctx.page); // wait till events get sent

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
    await waitForRAF(ctx.page);
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
    await ctx.page.waitForTimeout(50); // wait till setTimeout is called
    await waitForRAF(ctx.page); // wait till events get sent
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
