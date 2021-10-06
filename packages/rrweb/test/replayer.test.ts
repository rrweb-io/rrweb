/* tslint:disable no-string-literal no-console */

import * as fs from 'fs';
import * as path from 'path';
import * as puppeteer from 'puppeteer';
import {
  assertDomSnapshot,
  launchPuppeteer,
  sampleEvents as events,
  sampleStyleSheetRemoveEvents as stylesheetRemoveEvents,
} from './utils';
import styleSheetRuleEvents from './events/style-sheet-rule-events';
import orderingEvents from './events/ordering';

interface ISuite {
  code: string;
  browser: puppeteer.Browser;
  page: puppeteer.Page;
}

describe('replayer', function () {
  jest.setTimeout(10_000);

  let code: ISuite['code'];
  let browser: ISuite['browser'];
  let page: ISuite['page'];

  beforeAll(async () => {
    browser = await launchPuppeteer();

    const bundlePath = path.resolve(__dirname, '../dist/rrweb.min.js');
    code = fs.readFileSync(bundlePath, 'utf8');
  });

  beforeEach(async () => {
    page = await browser.newPage();
    await page.goto('about:blank');
    await page.evaluate(code);
    await page.evaluate(`let events = ${JSON.stringify(events)}`);

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

    await assertDomSnapshot(
      page,
      __filename,
      'style-sheet-rule-events-play-at-1500',
    );
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

    await assertDomSnapshot(
      page,
      __filename,
      'style-sheet-remove-events-play-at-2500',
    );
  });

  it('can fast forward past StyleSheetRule deletion on virtual elements', async () => {
    await page.evaluate(`events = ${JSON.stringify(styleSheetRuleEvents)}`);

    await assertDomSnapshot(
      page,
      __filename,
      'style-sheet-rule-events-play-at-2500',
    );
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

  it('replays same timestamp events in correct order', async () => {
    await page.evaluate(`events = ${JSON.stringify(orderingEvents)}`);
    await page.evaluate(`
      const { Replayer } = rrweb;
      const replayer = new Replayer(events);
      replayer.play();
    `);
    await page.waitForTimeout(50);

    await assertDomSnapshot(page, __filename, 'ordering-events');
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

    await assertDomSnapshot(page, __filename, 'ordering-events');
  });
});
