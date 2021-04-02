/* tslint:disable no-string-literal no-console */

import * as fs from 'fs';
import * as path from 'path';
import * as puppeteer from 'puppeteer';
import { expect } from 'chai';
import { Suite } from 'mocha';
import {
  launchPuppeteer,
  sampleEvents as events,
  sampleStyleSheetRemoveEvents as stylesheetRemoveEvents,
} from './utils';
import styleSheetRuleEvents from './events/style-sheet-rule-events';

interface ISuite extends Suite {
  code: string;
  browser: puppeteer.Browser;
  page: puppeteer.Page;
}

describe('replayer', function (this: ISuite) {
  this.timeout(10_000);

  before(async () => {
    this.browser = await launchPuppeteer();

    const bundlePath = path.resolve(__dirname, '../dist/rrweb.min.js');
    this.code = fs.readFileSync(bundlePath, 'utf8');
  });

  beforeEach(async () => {
    const page: puppeteer.Page = await this.browser.newPage();
    await page.goto('about:blank');
    await page.evaluate(this.code);
    await page.evaluate(`let events = ${JSON.stringify(events)}`);
    this.page = page;

    page.on('console', (msg) => console.log('PAGE LOG:', msg.text()));
  });

  afterEach(async () => {
    await this.page.close();
  });

  after(async () => {
    await this.browser.close();
  });

  it('can get meta data', async () => {
    const meta = await this.page.evaluate(`
      const { Replayer } = rrweb;
      const replayer = new Replayer(events);
      replayer.getMetaData();
    `);
    expect(meta).to.deep.equal({
      startTime: events[0].timestamp,
      endTime: events[events.length - 1].timestamp,
      totalTime: events[events.length - 1].timestamp - events[0].timestamp,
    });
  });

  it('will start actions when play', async () => {
    const actionLength = await this.page.evaluate(`
      const { Replayer } = rrweb;
      const replayer = new Replayer(events);
      replayer.play();
      replayer['timer']['actions'].length;
    `);
    expect(actionLength).to.equal(events.length);
  });

  it('will clean actions when pause', async () => {
    const actionLength = await this.page.evaluate(`
      const { Replayer } = rrweb;
      const replayer = new Replayer(events);
      replayer.play();
      replayer.pause();
      replayer['timer']['actions'].length;
    `);
    expect(actionLength).to.equal(0);
  });

  it('can play at any time offset', async () => {
    const actionLength = await this.page.evaluate(`
      const { Replayer } = rrweb;
      const replayer = new Replayer(events);
      replayer.play(1500);
      replayer['timer']['actions'].length;
    `);
    expect(actionLength).to.equal(
      events.filter((e) => e.timestamp - events[0].timestamp >= 1500).length,
    );
  });

  it('can play a second time in the future', async () => {
    const actionLength = await this.page.evaluate(`
      const { Replayer } = rrweb;
      const replayer = new Replayer(events);
      replayer.play(500);
      replayer.play(1500);
      replayer['timer']['actions'].length;
    `);
    expect(actionLength).to.equal(
      events.filter((e) => e.timestamp - events[0].timestamp >= 1500).length,
    );
  });

  it('can play a second time to the past', async () => {
    const actionLength = await this.page.evaluate(`
      const { Replayer } = rrweb;
      const replayer = new Replayer(events);
      replayer.play(1500);
      replayer.play(500);
      replayer['timer']['actions'].length;
    `);
    expect(actionLength).to.equal(
      events.filter((e) => e.timestamp - events[0].timestamp >= 500).length,
    );
  });

  it('can pause at any time offset', async () => {
    const actionLength = await this.page.evaluate(`
      const { Replayer } = rrweb;
      const replayer = new Replayer(events);
      replayer.pause(2500);
      replayer['timer']['actions'].length;
    `);
    const currentTime = await this.page.evaluate(`
      replayer.getCurrentTime();
    `);
    const currentState = await this.page.evaluate(`
      replayer['service']['state']['value'];
    `);
    expect(actionLength).to.equal(0);
    expect(currentTime).to.equal(2500);
    expect(currentState).to.equal('paused');
  });

  it('can fast forward past StyleSheetRule changes on virtual elements', async () => {
    await this.page.evaluate(
      `events = ${JSON.stringify(styleSheetRuleEvents)}`,
    );
    const actionLength = await this.page.evaluate(`
      const { Replayer } = rrweb;
      const replayer = new Replayer(events);
      replayer.play(1500);
      replayer['timer']['actions'].length;
    `);

    const result = await this.page.evaluate(`
      const rules = Array.from(replayer.iframe.contentDocument.head.children)
        .filter(x=>x.nodeName === 'STYLE')
        .reduce((acc, node) => {
          acc.push(...node.sheet.rules);
          return acc;
        }, []);

        rules.some(x=>x.selectorText === ".css-1fbxx79")
    `);

    expect(result).to.equal(true);
    expect(actionLength).to.equal(
      styleSheetRuleEvents.filter(
        (e) => e.timestamp - styleSheetRuleEvents[0].timestamp >= 1500,
      ).length,
    );
  });

  it('can handle removing style elements', async () => {
    await this.page.evaluate(
      `events = ${JSON.stringify(stylesheetRemoveEvents)}`,
    );
    const actionLength = await this.page.evaluate(`
      const { Replayer } = rrweb;
      const replayer = new Replayer(events);
      replayer.play(2500);
      replayer['timer']['actions'].length;
    `);
    expect(actionLength).to.equal(
      stylesheetRemoveEvents.filter(
        (e) => e.timestamp - stylesheetRemoveEvents[0].timestamp >= 2500,
      ).length,
    );
  });

  it('can stream events in live mode', async () => {
    const status = await this.page.evaluate(`
      const { Replayer } = rrweb;
      const replayer = new Replayer(events, {
        liveMode: true
      });
      replayer.startLive();
      replayer.service.state.value;
    `);
    expect(status).to.equal('live');
  });
});
