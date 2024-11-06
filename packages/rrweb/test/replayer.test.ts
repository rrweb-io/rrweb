import * as fs from 'fs';
import * as path from 'path';
import type * as puppeteer from 'puppeteer';
import { vi } from 'vitest';
import 'construct-style-sheets-polyfill';
import {
  assertDomSnapshot,
  launchPuppeteer,
  sampleEvents as events,
  sampleStyleSheetRemoveEvents as stylesheetRemoveEvents,
  waitForRAF,
} from './utils';
import styleSheetRuleEvents from './events/style-sheet-rule-events';
import orderingEvents from './events/ordering';
import scrollEvents from './events/scroll';
import scrollWithParentStylesEvents from './events/scroll-with-parent-styles';
import inputEvents from './events/input';
import iframeEvents from './events/iframe';
import selectionEvents from './events/selection';
import shadowDomEvents from './events/shadow-dom';
import badTextareaEvents from './events/bad-textarea';
import badStyleEvents from './events/bad-style';
import StyleSheetTextMutation from './events/style-sheet-text-mutation';
import canvasInIframe from './events/canvas-in-iframe';
import adoptedStyleSheet from './events/adopted-style-sheet';
import adoptedStyleSheetModification from './events/adopted-style-sheet-modification';
import documentReplacementEvents from './events/document-replacement';
import hoverInIframeShadowDom from './events/iframe-shadowdom-hover';
import customElementDefineClass from './events/custom-element-define-class';
import { ReplayerEvents } from '@saola.ai/rrweb-types';

interface ISuite {
  code: string;
  browser: puppeteer.Browser;
  page: puppeteer.Page;
}

type IWindow = Window &
  typeof globalThis & { rrweb: typeof import('../src'); events: typeof events };

describe('replayer', function () {
  vi.setConfig({ testTimeout: 10_000 });

  let code: ISuite['code'];
  let browser: ISuite['browser'];
  let page: ISuite['page'];

  beforeAll(async () => {
    browser = await launchPuppeteer();

    const bundlePath = path.resolve(__dirname, '../dist/rrweb.umd.cjs');
    code = fs.readFileSync(bundlePath, 'utf8');
  });

  beforeEach(async () => {
    page = await browser.newPage();
    await page.goto('about:blank');
    await page.evaluate(code);
    await page.evaluate(`var events = ${JSON.stringify(events)}`);

    page.on('console', (msg) => console.log('PAGE LOG:', msg.text()));
  });

  afterEach(async () => {
    await page.close();
  });

  afterAll(async () => {
    await browser.close();
  });

  it('can get meta data', async () => {
    const meta = await page.evaluate(`
      const { Replayer } = rrweb;
      const replayer = new Replayer(events);
      replayer.getMetaData();
    `);
    expect(meta).toEqual({
      startTime: events[0].timestamp,
      endTime: events[events.length - 1].timestamp,
      totalTime: events[events.length - 1].timestamp - events[0].timestamp,
    });
  });

  it('will start actions when play', async () => {
    const actionLength = await page.evaluate(`
      const { Replayer } = rrweb;
      const replayer = new Replayer(events);
      replayer.play();
      replayer['timer']['actions'].length;
    `);
    expect(actionLength).toEqual(events.length);
  });

  it('will clean actions when pause', async () => {
    const actionLength = await page.evaluate(`
      const { Replayer } = rrweb;
      const replayer = new Replayer(events);
      replayer.play();
      replayer.pause();
      replayer['timer']['actions'].length;
    `);
    expect(actionLength).toEqual(0);
  });

  it('can play at any time offset', async () => {
    const actionLength = await page.evaluate(`
      const { Replayer } = rrweb;
      const replayer = new Replayer(events);
      replayer.play(1500);
      replayer['timer']['actions'].length;
    `);
    expect(actionLength).toEqual(
      events.filter((e) => e.timestamp - events[0].timestamp >= 1500).length,
    );
  });

  it('can play a second time in the future', async () => {
    const actionLength = await page.evaluate(`
      const { Replayer } = rrweb;
      const replayer = new Replayer(events);
      replayer.play(500);
      replayer.play(1500);
      replayer['timer']['actions'].length;
    `);
    expect(actionLength).toEqual(
      events.filter((e) => e.timestamp - events[0].timestamp >= 1500).length,
    );
  });

  it('can play a second time to the past', async () => {
    const actionLength = await page.evaluate(`
      const { Replayer } = rrweb;
      const replayer = new Replayer(events);
      replayer.play(1500);
      replayer.play(500);
      replayer['timer']['actions'].length;
    `);
    expect(actionLength).toEqual(
      events.filter((e) => e.timestamp - events[0].timestamp >= 500).length,
    );
  });

  it('can pause at any time offset', async () => {
    const actionLength = await page.evaluate(`
      const { Replayer } = rrweb;
      const replayer = new Replayer(events);
      replayer.pause(2500);
      replayer['timer']['actions'].length;
    `);
    const currentTime = await page.evaluate(`
      replayer.getCurrentTime();
    `);
    const currentState = await page.evaluate(`
      replayer['service']['state']['value'];
    `);
    expect(actionLength).toEqual(0);
    expect(currentTime).toEqual(2500);
    expect(currentState).toEqual('paused');
  });

  it('can fast forward past StyleSheetRule changes on virtual elements', async () => {
    await page.evaluate(`events = ${JSON.stringify(styleSheetRuleEvents)}`);
    const actionLength = await page.evaluate(`
      const { Replayer } = rrweb;
      const replayer = new Replayer(events);
      replayer.play(1500);
      replayer['timer']['actions'].length;
    `);

    expect(actionLength).toEqual(
      styleSheetRuleEvents.filter(
        (e) => e.timestamp - styleSheetRuleEvents[0].timestamp >= 1500,
      ).length,
    );

    await assertDomSnapshot(page);
  });

  it('should apply fast forwarded StyleSheetRules that where added', async () => {
    await page.evaluate(`events = ${JSON.stringify(styleSheetRuleEvents)}`);
    const result = await page.evaluate(`
      const { Replayer } = rrweb;
      const replayer = new Replayer(events);
      replayer.pause(1500);
      const rules = [...replayer.iframe.contentDocument.styleSheets].map(
        (sheet) => [...sheet.rules],
      ).flat();
      rules.some((x) => x.selectorText === '.css-added-at-1000-deleted-at-2500');
    `);

    expect(result).toEqual(true);
  });

  it('can handle removing style elements', async () => {
    await page.evaluate(`events = ${JSON.stringify(stylesheetRemoveEvents)}`);
    const actionLength = await page.evaluate(`
      const { Replayer } = rrweb;
      const replayer = new Replayer(events);
      replayer.play(2500);
      replayer['timer']['actions'].length;
    `);
    expect(actionLength).toEqual(
      stylesheetRemoveEvents.filter(
        (e) => e.timestamp - stylesheetRemoveEvents[0].timestamp >= 2500,
      ).length,
    );

    await assertDomSnapshot(page);
  });

  it('can fast forward selection events', async () => {
    await page.evaluate(`events = ${JSON.stringify(selectionEvents)}`);

    /** check the first selection event */
    let [startOffset, endOffset] = (await page.evaluate(`
      const { Replayer } = rrweb;
      const replayer = new Replayer(events);
      replayer.pause(360);
      var range = replayer.iframe.contentDocument.getSelection().getRangeAt(0);
      [range.startOffset, range.endOffset];
    `)) as [startOffset: number, endOffset: number];

    expect(startOffset).toEqual(5);
    expect(endOffset).toEqual(15);

    await page.evaluate('replayer.play(0);');
    await waitForRAF(page);

    /** check the second selection event */
    [startOffset, endOffset] = (await page.evaluate(`      
      replayer.pause(410);
      var range = replayer.iframe.contentDocument.getSelection().getRangeAt(0);
      [range.startOffset, range.endOffset];
    `)) as [startOffset: number, endOffset: number];

    expect(startOffset).toEqual(11);
    expect(endOffset).toEqual(6);
  });

  it('can fast forward past StyleSheetRule deletion on virtual elements', async () => {
    await page.evaluate(`events = ${JSON.stringify(styleSheetRuleEvents)}`);

    const actionLength = await page.evaluate(`
      const { Replayer } = rrweb;
      const replayer = new Replayer(events);
      replayer.pause(2600);
      replayer['timer']['actions'].length;
    `);

    await assertDomSnapshot(page);
  });

  it('should delete fast forwarded StyleSheetRules that where removed', async () => {
    await page.evaluate(`events = ${JSON.stringify(styleSheetRuleEvents)}`);
    const result = await page.evaluate(`
      const { Replayer } = rrweb;
      const replayer = new Replayer(events);
      replayer.pause(3000);
      const rules = [...replayer.iframe.contentDocument.styleSheets].map(
        (sheet) => [...sheet.rules],
      ).flat();
      rules.some((x) => x.selectorText === '.css-added-at-1000-deleted-at-2500');
    `);

    expect(result).toEqual(false);
  });

  it("should overwrite all StyleSheetRules by replacing style element's textContent while fast-forwarding", async () => {
    await page.evaluate(`events = ${JSON.stringify(styleSheetRuleEvents)}`);
    const result = await page.evaluate(`
      const { Replayer } = rrweb;
      const replayer = new Replayer(events);
      replayer.pause(3500);
      const rules = [...replayer.iframe.contentDocument.styleSheets].map(
        (sheet) => [...sheet.rules],
      ).flat();
      rules.some((x) => x.selectorText === '.css-added-at-200-overwritten-at-3000');
    `);

    expect(result).toEqual(false);
  });

  it('should apply fast-forwarded StyleSheetRules that came after stylesheet textContent overwrite', async () => {
    await page.evaluate(`events = ${JSON.stringify(styleSheetRuleEvents)}`);
    const result = await page.evaluate(`
      const { Replayer } = rrweb;
      const replayer = new Replayer(events);
      replayer.pause(3500);
      const rules = [...replayer.iframe.contentDocument.styleSheets].map(
        (sheet) => [...sheet.rules],
      ).flat();
      rules.some((x) => x.selectorText === '.css-added-at-3100') &&
        !rules.some(
          (x) => x.selectorText === '.css-added-at-500-overwritten-at-3000',
        );
    `);

    expect(result).toEqual(true);
  });

  it('should overwrite all StyleSheetRules by appending a text node to stylesheet element while fast-forwarding', async () => {
    await page.evaluate(`events = ${JSON.stringify(StyleSheetTextMutation)}`);
    const result = await page.evaluate(`
      const { Replayer } = rrweb;
      const replayer = new Replayer(events);
      replayer.pause(1600);
      const rules = [...replayer.iframe.contentDocument.styleSheets].map(
        (sheet) => [...sheet.rules],
      ).flat();
      rules.some((x) => x.selectorText === '.css-added-at-1000-overwritten-at-1500');
    `);
    expect(result).toEqual(false);
  });

  it('should apply fast-forwarded StyleSheetRules that came after appending text node to stylesheet element', async () => {
    await page.evaluate(`events = ${JSON.stringify(StyleSheetTextMutation)}`);
    const result = await page.evaluate(`
      const { Replayer } = rrweb;
      const replayer = new Replayer(events);
      replayer.pause(2100);
      const rules = [...replayer.iframe.contentDocument.styleSheets].map(
        (sheet) => [...sheet.rules],
      ).flat();
      rules.some((x) => x.selectorText === '.css-added-at-2000-overwritten-at-2500');
    `);
    expect(result).toEqual(true);
  });

  it('should overwrite all StyleSheetRules by removing text node from stylesheet element while fast-forwarding', async () => {
    await page.evaluate(`events = ${JSON.stringify(StyleSheetTextMutation)}`);
    const result = await page.evaluate(`
      const { Replayer } = rrweb;
      const replayer = new Replayer(events);
      replayer.pause(2600);
      const rules = [...replayer.iframe.contentDocument.styleSheets].map(
        (sheet) => [...sheet.rules],
      ).flat();
      rules.some((x) => x.selectorText === '.css-added-at-2000-overwritten-at-2500');
    `);
    expect(result).toEqual(false);
  });

  it('should apply fast-forwarded StyleSheetRules that came after removing text node from stylesheet element', async () => {
    await page.evaluate(`events = ${JSON.stringify(StyleSheetTextMutation)}`);
    const result = await page.evaluate(`
      const { Replayer } = rrweb;
      const replayer = new Replayer(events);
      replayer.pause(3100);
      const rules = [...replayer.iframe.contentDocument.styleSheets].map(
        (sheet) => [...sheet.rules],
      ).flat();
      rules.some((x) => x.selectorText === '.css-added-at-3000');
    `);
    expect(result).toEqual(true);
  });

  it('can fast forward scroll events', async () => {
    await page.evaluate(`
      events = ${JSON.stringify(scrollEvents)};
      const { Replayer } = rrweb;
      var replayer = new Replayer(events,{showDebug:true});
      replayer.pause(550);
    `);
    // add the "#container" element at 500
    const iframe = await page.$('iframe');
    const contentDocument = await iframe!.contentFrame()!;
    expect(await contentDocument!.$('#container')).not.toBeNull();
    expect(await contentDocument!.$('#block')).not.toBeNull();
    expect(
      await contentDocument!.$eval(
        '#container',
        (element: Element) => element.scrollTop,
      ),
    ).toEqual(0);

    // restart the replayer
    await page.evaluate('replayer.play(0);');
    await waitForRAF(page);

    await page.evaluate('replayer.pause(1050);');
    // scroll the "#container" div' at 1000
    expect(
      await contentDocument!.$eval(
        '#container',
        (element: Element) => element.scrollTop,
      ),
    ).toEqual(2500);

    await page.evaluate('replayer.play(0);');
    await waitForRAF(page);
    await page.evaluate('replayer.pause(1550);');
    // scroll the document at 1500
    expect(
      await page.$eval(
        'iframe',
        (element: Element) =>
          (element as HTMLIFrameElement)!.contentWindow!.scrollY,
      ),
    ).toEqual(250);

    await page.evaluate('replayer.play(0);');
    await waitForRAF(page);
    await page.evaluate('replayer.pause(2050);');
    // remove the "#container" element at 2000
    expect(await contentDocument!.$('#container')).toBeNull();
    expect(await contentDocument!.$('#block')).toBeNull();
    expect(
      await page.$eval(
        'iframe',
        (element: Element) =>
          (element as HTMLIFrameElement)!.contentWindow!.scrollY,
      ),
    ).toEqual(0);
  });

  it('can fast forward scroll events w/ a parent node that affects a child nodes height', async () => {
    await page.evaluate(`
      events = ${JSON.stringify(scrollWithParentStylesEvents)};
      const { Replayer } = rrweb;
      var replayer = new Replayer(events,{showDebug:true});
      replayer.pause(550);
    `);
    // add the ".container" element at 500
    const iframe = await page.$('iframe');
    const contentDocument = await iframe!.contentFrame()!;
    expect(await contentDocument!.$('.container')).not.toBeNull();
    expect(
      await contentDocument!.$eval(
        '.container',
        (element: Element) => element.scrollTop,
      ),
    ).toEqual(0);

    // restart the replayer
    await page.evaluate('replayer.play(0);');
    await waitForRAF(page);

    await page.evaluate('replayer.pause(1050);');
    // scroll the ".container" div' at 1000
    expect(
      await contentDocument!.$eval(
        '.container',
        (element: Element) => element.scrollTop,
      ),
    ).toEqual(800);

    await page.evaluate('replayer.play(0);');
    await waitForRAF(page);
    await page.evaluate('replayer.pause(2050);');
    // remove the ".container" element at 2000
    expect(await contentDocument!.$('.container')).toBeNull();
    expect(
      await page.$eval(
        'iframe',
        (element: Element) =>
          (element as HTMLIFrameElement)!.contentWindow!.scrollY,
      ),
    ).toEqual(0);
  });

  it('can fast forward input events', async () => {
    await page.evaluate(`
      events = ${JSON.stringify(inputEvents)};
      const { Replayer } = rrweb;
      var replayer = new Replayer(events,{showDebug:true});
      replayer.pause(1050);
    `);
    const iframe = await page.$('iframe');
    const contentDocument = await iframe!.contentFrame()!;
    expect(await contentDocument!.$('select')).not.toBeNull();
    expect(
      await contentDocument!.$eval(
        'select',
        (element: Element) => (element as HTMLSelectElement).value,
      ),
    ).toEqual('valueB'); // the default value

    // restart the replayer
    await page.evaluate('replayer.play(0);');
    await waitForRAF(page);

    await page.evaluate('replayer.pause(1550);');
    // the value get changed to 'valueA' at 1500
    expect(
      await contentDocument!.$eval(
        'select',
        (element: Element) => (element as HTMLSelectElement).value,
      ),
    ).toEqual('valueA');

    await page.evaluate('replayer.play(0);');
    await waitForRAF(page);
    await page.evaluate('replayer.pause(2050);');
    // the value get changed to 'valueC' at 2000
    expect(
      await contentDocument!.$eval(
        'select',
        (element: Element) => (element as HTMLSelectElement).value,
      ),
    ).toEqual('valueC');

    await page.evaluate('replayer.play(0);');
    await waitForRAF(page);
    await page.evaluate('replayer.pause(2550);');
    // add a new input element at 2500
    expect(
      await contentDocument!.$eval(
        'input',
        (element: Element) => (element as HTMLSelectElement).value,
      ),
    ).toEqual('');

    await page.evaluate('replayer.play(0);');
    await waitForRAF(page);
    await page.evaluate('replayer.pause(3050);');
    // set the value 'test input' for the input element at 3000
    expect(
      await contentDocument!.$eval(
        'input',
        (element: Element) => (element as HTMLSelectElement).value,
      ),
    ).toEqual('test input');

    await page.evaluate('replayer.play(0);');
    await waitForRAF(page);
    await page.evaluate('replayer.pause(3550);');
    // remove the select element at 3500
    expect(await contentDocument!.$('select')).toBeNull();

    await page.evaluate('replayer.play(0);');
    await waitForRAF(page);
    await page.evaluate('replayer.pause(4050);');
    // remove the input element at 4000
    expect(await contentDocument!.$('input')).toBeNull();
  });

  it('can fast-forward mutation events containing nested iframe elements', async () => {
    await page.evaluate(`
      events = ${JSON.stringify(iframeEvents)};
      const { Replayer } = rrweb;
      var replayer = new Replayer(events,{showDebug:true});
      replayer.pause(250);
    `);
    const iframe = await page.$('iframe');
    const contentDocument = await iframe!.contentFrame()!;
    expect(await contentDocument!.$('iframe')).toBeNull();

    // restart the replayer
    await page.evaluate('replayer.play(0);');
    await waitForRAF(page);
    await page.evaluate('replayer.pause(550);'); // add 'iframe one' at 500
    expect(await contentDocument!.$('iframe')).not.toBeNull();
    let iframeOneDocument = await (await contentDocument!.$(
      'iframe',
    ))!.contentFrame();
    expect(iframeOneDocument).not.toBeNull();
    expect(await iframeOneDocument!.$('noscript')).not.toBeNull();
    // make sure custom style rules are inserted rules
    expect((await iframeOneDocument!.$$('style')).length).toBe(1);
    expect(
      await iframeOneDocument!.$eval(
        'noscript',
        (element) => window.getComputedStyle(element).display,
      ),
    ).toEqual('none');

    // add 'iframe two' and 'iframe three' at 1000
    await page.evaluate('replayer.play(0);');
    await waitForRAF(page);
    await page.evaluate('replayer.pause(1050);');
    // check the inserted style of iframe 'one' again
    iframeOneDocument = await (await contentDocument!.$(
      'iframe',
    ))!.contentFrame();
    expect((await iframeOneDocument!.$$('style')).length).toBe(1);

    expect((await contentDocument!.$$('iframe')).length).toEqual(2);
    let iframeTwoDocument = await (
      await contentDocument!.$$('iframe')
    )[1]!.contentFrame();
    expect(iframeTwoDocument).not.toBeNull();
    expect((await iframeTwoDocument!.$$('iframe')).length).toEqual(2);
    expect((await iframeTwoDocument!.$$('style')).length).toBe(1);
    const iframeThreeDocument = await (
      await iframeTwoDocument!.$$('iframe')
    )[0]!.contentFrame();
    let iframeFourDocument = await (
      await iframeTwoDocument!.$$('iframe')
    )[1]!.contentFrame();
    expect(iframeThreeDocument).not.toBeNull();
    expect((await iframeThreeDocument!.$$('style')).length).toBe(1);
    expect(iframeFourDocument).not.toBeNull();

    // add 'iframe four' at 1500
    await page.evaluate('replayer.play(0);');
    await waitForRAF(page);
    await page.evaluate('replayer.pause(1550);');
    iframeTwoDocument = await (
      await contentDocument!.$$('iframe')
    )[1]!.contentFrame();
    expect((await iframeTwoDocument!.$$('style')).length).toBe(1);
    iframeFourDocument = await (
      await iframeTwoDocument!.$$('iframe')
    )[1]!.contentFrame();
    expect(await iframeFourDocument!.$('iframe')).toBeNull();
    expect((await iframeFourDocument!.$$('style')).length).toBe(1);
    expect(await iframeFourDocument!.title()).toEqual('iframe 4');

    // add 'iframe five' at 2000
    await page.evaluate('replayer.play(0);');
    await waitForRAF(page);
    await page.evaluate('replayer.pause(2050);');
    iframeTwoDocument = await (
      await contentDocument!.$$('iframe')
    )[1]!.contentFrame();
    iframeFourDocument = await (
      await iframeTwoDocument!.$$('iframe')
    )[1]!.contentFrame();
    expect((await iframeFourDocument!.$$('style')).length).toBe(1);
    expect(await iframeFourDocument!.$('iframe')).not.toBeNull();
    const iframeFiveDocument = await (await iframeFourDocument!.$(
      'iframe',
    ))!.contentFrame();
    expect(iframeFiveDocument).not.toBeNull();
    expect((await iframeFiveDocument!.$$('style')).length).toBe(1);
    expect(await iframeFiveDocument!.$('noscript')).not.toBeNull();
    expect(
      await iframeFiveDocument!.$eval(
        'noscript',
        (element) => window.getComputedStyle(element).display,
      ),
    ).toEqual('none');

    // remove the html element of 'iframe four' at 2500
    await page.evaluate('replayer.play(0);');
    await waitForRAF(page);
    await page.evaluate('replayer.pause(2550);');
    iframeTwoDocument = await (
      await contentDocument!.$$('iframe')
    )[1]!.contentFrame();
    iframeFourDocument = await (
      await iframeTwoDocument!.$$('iframe')
    )[1]!.contentFrame();
    // the html element should be removed
    expect(await iframeFourDocument!.$('html')).toBeNull();
    // the doctype should still exist
    expect(
      await iframeTwoDocument!.evaluate(
        (iframe) => (iframe as HTMLIFrameElement)!.contentDocument!.doctype,
        (
          await iframeTwoDocument!.$$('iframe')
        )[1],
      ),
    ).not.toBeNull();
  });

  it('can fast-forward mutation events containing nested shadow doms', async () => {
    await page.evaluate(`
      events = ${JSON.stringify(shadowDomEvents)};
      const { Replayer } = rrweb;
      var replayer = new Replayer(events,{showDebug:true});
      replayer.pause(550);
    `);
    // add shadow dom 'one' at 500
    const iframe = await page.$('iframe');
    const contentDocument = await iframe!.contentFrame()!;
    expect(
      await contentDocument!.$eval('div', (element) => element.shadowRoot),
    ).not.toBeNull();
    expect(
      await contentDocument!.evaluate(
        () =>
          document
            .querySelector('body > div')!
            .shadowRoot!.querySelector('span')!.textContent,
      ),
    ).toEqual('shadow dom one');

    // add shadow dom 'two' at 1000
    await page.evaluate('replayer.play(0);');
    await waitForRAF(page);
    await page.evaluate('replayer.pause(1050);');
    expect(
      await contentDocument!.evaluate(
        () =>
          document
            .querySelector('body > div')!
            .shadowRoot!.querySelector('div')!.shadowRoot,
      ),
    ).not.toBeNull();
    expect(
      await contentDocument!.evaluate(
        () =>
          document
            .querySelector('body > div')!
            .shadowRoot!.querySelector('div')!
            .shadowRoot!.querySelector('span')!.textContent,
      ),
    ).toEqual('shadow dom two');
  });

  it('can fast-forward mutation events containing painted canvas in iframe', async () => {
    await page.evaluate(`
      events = ${JSON.stringify(canvasInIframe)};
      const { Replayer } = rrweb;
      var replayer = new Replayer(events,{showDebug:true});
      replayer.pause(550);            
    `);
    const replayerIframe = await page.$('iframe');
    const contentDocument = await replayerIframe!.contentFrame()!;
    const iframe = await contentDocument!.$('iframe');
    expect(iframe).not.toBeNull();
    const docInIFrame = await iframe?.contentFrame();
    expect(docInIFrame).not.toBeNull();
    const canvasElements = await docInIFrame!.$$('canvas');
    // The first canvas is a blank one and the second is a painted one.
    expect(canvasElements.length).toEqual(2);

    const dataUrls = await docInIFrame?.$$eval('canvas', (elements) =>
      elements.map((element) => (element as HTMLCanvasElement).toDataURL()),
    );
    expect(dataUrls?.length).toEqual(2);
    // The painted canvas's data should not be empty.
    expect(dataUrls![1]).not.toEqual(dataUrls![0]);
  });

  it('can stream events in live mode', async () => {
    const status = await page.evaluate(`
      const { Replayer } = rrweb;
      const replayer = new Replayer(events, {
        liveMode: true
      });
      replayer.startLive();
      replayer.service.state.value;
    `);
    expect(status).toEqual('live');
  });

  it("shouldn't trigger ReplayerEvents.Finish in live mode", async () => {
    const status = await page.evaluate((FinishState) => {
      return new Promise((resolve) => {
        const win = window as IWindow;
        let triggeredFinish = false;
        const { Replayer } = win.rrweb;
        const replayer = new Replayer([], {
          liveMode: true,
        });
        replayer.on(FinishState, () => {
          triggeredFinish = true;
        });
        replayer.startLive();
        replayer.addEvent(win.events[0]);
        requestAnimationFrame(() => {
          resolve(triggeredFinish);
        });
      });
    }, ReplayerEvents.Finish);

    expect(status).toEqual(false);
  });

  it('replays same timestamp events in correct order', async () => {
    await page.evaluate(`events = ${JSON.stringify(orderingEvents)}`);
    await page.evaluate(`
      const { Replayer } = rrweb;
      const replayer = new Replayer(events);
      replayer.play();
    `);
    await page.waitForTimeout(50);

    await assertDomSnapshot(page);
  });

  it('replays same timestamp events in correct order (with addAction)', async () => {
    await page.evaluate(`events = ${JSON.stringify(orderingEvents)}`);
    await page.evaluate(`
      const { Replayer } = rrweb;
      const replayer = new Replayer(events.slice(0, events.length-2));
      replayer.play();
      replayer.addEvent(events[events.length-2]);
      replayer.addEvent(events[events.length-1]);
    `);
    await page.waitForTimeout(50);

    await assertDomSnapshot(page);
  });

  it('should destroy the replayer after calling destroy()', async () => {
    await page.evaluate(`events = ${JSON.stringify(events)}`);
    await page.evaluate(`
      const { Replayer } = rrweb;
      let replayer = new Replayer(events);
      replayer.play();      
    `);

    const replayerWrapperClassName = 'replayer-wrapper';
    let wrapper = await page.$(`.${replayerWrapperClassName}`);
    expect(wrapper).not.toBeNull();

    await page.evaluate(`replayer.destroy(); replayer = null;`);
    wrapper = await page.$(`.${replayerWrapperClassName}`);
    expect(wrapper).toBeNull();
  });

  it('can replay adopted stylesheet events', async () => {
    await page.evaluate(`
      events = ${JSON.stringify(adoptedStyleSheet)};
      const { Replayer } = rrweb;
      var replayer = new Replayer(events,{showDebug:true});
      replayer.play();
    `);
    await page.waitForTimeout(600);
    const iframe = await page.$('iframe');
    const contentDocument = await iframe!.contentFrame()!;
    const colorRGBMap = {
      yellow: 'rgb(255, 255, 0)',
      red: 'rgb(255, 0, 0)',
      blue: 'rgb(0, 0, 255)',
      green: 'rgb(0, 128, 0)',
    };
    const checkCorrectness = async () => {
      // check the adopted stylesheet is applied on the outermost document
      expect(
        await contentDocument!.$eval(
          'div',
          (element) => window.getComputedStyle(element).color,
        ),
      ).toEqual(colorRGBMap.yellow);

      // check the adopted stylesheet is applied on the shadow dom #1's root
      expect(
        await contentDocument!.evaluate(
          () =>
            window.getComputedStyle(
              document
                .querySelector('#shadow-host1')!
                .shadowRoot!.querySelector('span')!,
            ).color,
        ),
      ).toEqual(colorRGBMap.red);

      // check the adopted stylesheet is applied on document of the IFrame element
      expect(
        await contentDocument!.$eval(
          'iframe',
          (element) =>
            window.getComputedStyle(
              (element as HTMLIFrameElement).contentDocument!.querySelector(
                'h1',
              )!,
            ).color,
        ),
      ).toEqual(colorRGBMap.blue);

      // check the adopted stylesheet is applied on the shadow dom #2's root
      expect(
        await contentDocument!.evaluate(
          () =>
            window.getComputedStyle(
              document
                .querySelector('#shadow-host2')!
                .shadowRoot!.querySelector('span')!,
            ).color,
        ),
      ).toEqual(colorRGBMap.green);
    };
    await checkCorrectness();

    // To test the correctness of replaying adopted stylesheet events in the fast-forward mode.
    await page.evaluate('replayer.play(0);');
    await waitForRAF(page);
    await page.evaluate('replayer.pause(600);');
    await checkCorrectness();
  });

  it('can replay modification events for adoptedStyleSheet', async () => {
    await page.evaluate(`
    events = ${JSON.stringify(adoptedStyleSheetModification)};
    const { Replayer } = rrweb;
    var replayer = new Replayer(events,{showDebug:true});
    replayer.pause(0);

    async function playTill(offsetTime) {
      replayer.play();
      return new Promise((resolve) => {
        const checkTime = () => {
          if (replayer.getCurrentTime() >= offsetTime) {
            replayer.pause();
            resolve(undefined);
          } else {
            requestAnimationFrame(checkTime);
          }
        };
        checkTime();
      });
    }`);

    const iframe = await page.$('iframe');
    const contentDocument = await iframe!.contentFrame()!;

    // At 250ms, the adopted stylesheet is still empty.
    const check250ms = async () => {
      expect(
        await contentDocument!.evaluate(
          () =>
            document.adoptedStyleSheets.length === 1 &&
            document.adoptedStyleSheets[0].cssRules.length === 0,
        ),
      ).toBeTruthy();
      expect(
        await contentDocument!.evaluate(
          () =>
            document.querySelector('iframe')!.contentDocument!
              .adoptedStyleSheets.length === 1 &&
            document.querySelector('iframe')!.contentDocument!
              .adoptedStyleSheets[0].cssRules.length === 0,
        ),
      ).toBeTruthy();
    };

    // At 300ms, the adopted stylesheet is replaced with new content.
    const check300ms = async () => {
      expect(
        await contentDocument!.evaluate(
          () =>
            document.adoptedStyleSheets[0].cssRules.length === 1 &&
            document.adoptedStyleSheets[0].cssRules[0].cssText ===
              'div { color: yellow; }',
        ),
      ).toBeTruthy();
      expect(
        await contentDocument!.evaluate(
          () =>
            document.querySelector('iframe')!.contentDocument!
              .adoptedStyleSheets[0].cssRules.length === 1 &&
            document.querySelector('iframe')!.contentDocument!
              .adoptedStyleSheets[0].cssRules[0].cssText ===
              'h1 { color: blue; }',
        ),
      ).toBeTruthy();
    };

    // At 400ms, check replaceSync API.
    const check400ms = async () => {
      expect(
        await contentDocument!.evaluate(
          () =>
            document.adoptedStyleSheets[0].cssRules.length === 1 &&
            document.adoptedStyleSheets[0].cssRules[0].cssText ===
              'div { display: inline; }',
        ),
      ).toBeTruthy();
      expect(
        await contentDocument!.evaluate(
          () =>
            document.querySelector('iframe')!.contentDocument!
              .adoptedStyleSheets[0].cssRules.length === 1 &&
            document.querySelector('iframe')!.contentDocument!
              .adoptedStyleSheets[0].cssRules[0].cssText ===
              'h1 { font-size: large; }',
        ),
      ).toBeTruthy();
    };

    // At 500ms, check CSSStyleDeclaration API.
    const check500ms = async () => {
      expect(
        await contentDocument!.evaluate(
          () =>
            document.adoptedStyleSheets[0].cssRules.length === 1 &&
            document.adoptedStyleSheets[0].cssRules[0].cssText ===
              'div { color: green; }',
        ),
      ).toBeTruthy();
      expect(
        await contentDocument!.evaluate(
          () =>
            document.querySelector('iframe')!.contentDocument!
              .adoptedStyleSheets[0].cssRules.length === 2 &&
            document.querySelector('iframe')!.contentDocument!
              .adoptedStyleSheets[0].cssRules[0].cssText ===
              'h2 { color: red; }' &&
            document.querySelector('iframe')!.contentDocument!
              .adoptedStyleSheets[0].cssRules[1].cssText ===
              'h1 { font-size: medium !important; }',
        ),
      ).toBeTruthy();
    };

    // At 600ms, check insertRule and deleteRule API.
    const check600ms = async () => {
      expect(
        await contentDocument!.evaluate(
          () =>
            document.adoptedStyleSheets[0].cssRules.length === 2 &&
            document.adoptedStyleSheets[0].cssRules[0].cssText ===
              'div { color: green; }' &&
            document.adoptedStyleSheets[0].cssRules[1].cssText ===
              'body { border: 2px solid blue; }',
        ),
      ).toBeTruthy();
      expect(
        await contentDocument!.evaluate(
          () =>
            document.querySelector('iframe')!.contentDocument!
              .adoptedStyleSheets[0].cssRules.length === 1 &&
            document.querySelector('iframe')!.contentDocument!
              .adoptedStyleSheets[0].cssRules[0].cssText ===
              'h1 { font-size: medium !important; }',
        ),
      ).toBeTruthy();
    };

    await page.evaluate(`playTill(250)`);
    await check250ms();

    await page.evaluate(`playTill(300)`);
    await check300ms();

    await page.evaluate(`playTill(400)`);
    await check400ms();

    await page.evaluate(`playTill(500)`);
    await check500ms();

    await page.evaluate(`playTill(600)`);
    await check600ms();

    // To test the correctness of replaying adopted stylesheet mutation events in the fast-forward mode.
    await page.evaluate('replayer.play(0);');
    await waitForRAF(page);
    await page.evaluate('replayer.pause(280);');
    await check250ms();

    await page.evaluate('replayer.pause(330);');
    await check300ms();

    await page.evaluate('replayer.pause(430);');
    await check400ms();

    await page.evaluate('replayer.pause(530);');
    await check500ms();

    await page.evaluate('replayer.pause(630);');
    await check600ms();
  });

  it('should replay document replacement events without warnings or errors', async () => {
    await page.evaluate(
      `events = ${JSON.stringify(documentReplacementEvents)}`,
    );
    const warningThrown = vi.fn();
    page.on('console', warningThrown);
    const errorThrown = vi.fn();
    page.on('pageerror', errorThrown);
    await page.evaluate(`
      const { Replayer } = rrweb;
      const replayer = new Replayer(events);
      replayer.play(500);
    `);
    await waitForRAF(page);

    // No warnings should be logged.
    expect(warningThrown).not.toHaveBeenCalled();
    // No errors should be thrown.
    expect(errorThrown).not.toHaveBeenCalled();
  });

  it('should remove outdated hover styles in iframes and shadow doms', async () => {
    await page.evaluate(`events = ${JSON.stringify(hoverInIframeShadowDom)}`);

    await page.evaluate(`
      const { Replayer } = rrweb;
      const replayer = new Replayer(events);
      replayer.pause(550);
    `);
    const replayerIframe = await page.$('iframe');
    const contentDocument = await replayerIframe!.contentFrame()!;
    const iframe = await contentDocument!.$('iframe');
    expect(iframe).not.toBeNull();
    const docInIFrame = await iframe?.contentFrame();
    expect(docInIFrame).not.toBeNull();

    // hover element in iframe at 500ms
    expect(
      await docInIFrame?.evaluate(
        () => document.querySelector('span')?.className,
      ),
    ).toBe(':hover');
    // At this time, there should be no class name in shadow dom
    expect(
      await docInIFrame?.evaluate(() => {
        const shadowRoot = document.querySelector('div')?.shadowRoot;
        return (shadowRoot?.childNodes[0] as HTMLElement).className;
      }),
    ).toBe('');

    // hover element in shadow dom at 1000ms
    await page.evaluate('replayer.pause(1050);');
    // :hover style should be removed from iframe
    expect(
      await docInIFrame?.evaluate(
        () => document.querySelector('span')?.className,
      ),
    ).toBe('');
    expect(
      await docInIFrame?.evaluate(() => {
        const shadowRoot = document.querySelector('div')?.shadowRoot;
        return (shadowRoot?.childNodes[0] as HTMLElement).className;
      }),
    ).toBe(':hover');

    // hover element in iframe at 1500ms again
    await page.evaluate('replayer.pause(1550);');
    // hover style should be removed from shadow dom
    expect(
      await docInIFrame?.evaluate(() => {
        const shadowRoot = document.querySelector('div')?.shadowRoot;
        return (shadowRoot?.childNodes[0] as HTMLElement).className;
      }),
    ).toBe('');
    expect(
      await docInIFrame?.evaluate(
        () => document.querySelector('span')?.className,
      ),
    ).toBe(':hover');
  });

  it('should replay styles with :define pseudo-class', async () => {
    await page.evaluate(`events = ${JSON.stringify(customElementDefineClass)}`);

    const displayValue = await page.evaluate(`
      const { Replayer } = rrweb;
      const replayer = new Replayer(events);
      replayer.pause(200);
      const customElement = replayer.iframe.contentDocument.querySelector('custom-element');
      window.getComputedStyle(customElement).display;
    `);
    // If the custom element is not defined, the display value will be 'none'.
    // If the custom element is defined, the display value will be 'block'.
    expect(displayValue).toEqual('block');
  });

  it('can deal with legacy duplicate/conflicting values on textareas', async () => {
    await page.evaluate(`events = ${JSON.stringify(badTextareaEvents)}`);

    const displayValue = await page.evaluate(`
      const { Replayer } = rrweb;
      const replayer = new Replayer(events);
      replayer.pause(100);
      const textarea = replayer.iframe.contentDocument.querySelector('textarea');
      textarea.value;
    `);
    // If the custom element is not defined, the display value will be 'none'.
    // If the custom element is defined, the display value will be 'block'.
    expect(displayValue).toEqual('this value is used for replay');
  });

  it('can deal with duplicate/conflicting values on style elements', async () => {
    await page.evaluate(`events = ${JSON.stringify(badStyleEvents)}`);

    const changedColors = await page.evaluate(`
      const { Replayer } = rrweb;
      const replayer = new Replayer(events);
      replayer.pause(1000);
      // Get the color of the elements after applying the style mutation event
      [
        replayer.iframe.contentWindow.getComputedStyle(
          replayer.iframe.contentDocument.querySelector('#one'),
        ).color,
        replayer.iframe.contentWindow.getComputedStyle(
          replayer.iframe.contentDocument.querySelector('#two'),
        ).color,
      ];
`);
    const newColor = 'rgb(255, 255, 0)'; // yellow
    expect(changedColors).toEqual([newColor, newColor]);
  });
});
