/**
 * @vitest-environment jsdom
 */
import {
  getRootShadowHost,
  StyleSheetMirror,
  inDom,
  shadowHostInDom,
  getShadowHost,
} from '../src/utils';
import { vi } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { ISuite, launchPuppeteer } from './utils';
import events from './events/merge-events';
import type { eventWithTime } from '@rrweb/types';

describe('Utilities for other modules', () => {
  describe('StyleSheetMirror', () => {
    it('should create a StyleSheetMirror', () => {
      const mirror = new StyleSheetMirror();
      expect(mirror).toBeDefined();
      expect(mirror.add).toBeDefined();
      expect(mirror.has).toBeDefined();
      expect(mirror.reset).toBeDefined();
      expect(mirror.getId).toBeDefined();
    });

    it('can add CSSStyleSheet into the mirror without ID parameter', () => {
      const mirror = new StyleSheetMirror();
      const styleSheet = new CSSStyleSheet();
      expect(mirror.has(styleSheet)).toBeFalsy();
      expect(mirror.add(styleSheet)).toEqual(1);
      expect(mirror.has(styleSheet)).toBeTruthy();
      // This stylesheet has been added before so just return its assigned id.
      expect(mirror.add(styleSheet)).toEqual(1);

      for (let i = 0; i < 10; i++) {
        const styleSheet = new CSSStyleSheet();
        expect(mirror.has(styleSheet)).toBeFalsy();
        expect(mirror.add(styleSheet)).toEqual(i + 2);
        expect(mirror.has(styleSheet)).toBeTruthy();
      }
    });

    it('can add CSSStyleSheet into the mirror with ID parameter', () => {
      const mirror = new StyleSheetMirror();
      for (let i = 0; i < 10; i++) {
        const styleSheet = new CSSStyleSheet();
        expect(mirror.has(styleSheet)).toBeFalsy();
        expect(mirror.add(styleSheet, i)).toEqual(i);
        expect(mirror.has(styleSheet)).toBeTruthy();
      }
    });

    it('can get the id from the mirror', () => {
      const mirror = new StyleSheetMirror();
      for (let i = 0; i < 10; i++) {
        const styleSheet = new CSSStyleSheet();
        mirror.add(styleSheet);
        expect(mirror.getId(styleSheet)).toBe(i + 1);
      }
      expect(mirror.getId(new CSSStyleSheet())).toBe(-1);
    });

    it('can get CSSStyleSheet objects with id', () => {
      const mirror = new StyleSheetMirror();
      for (let i = 0; i < 10; i++) {
        const styleSheet = new CSSStyleSheet();
        mirror.add(styleSheet);
        expect(mirror.getStyle(i + 1)).toBe(styleSheet);
      }
    });

    it('can reset the mirror', () => {
      const mirror = new StyleSheetMirror();
      const styleList: CSSStyleSheet[] = [];
      for (let i = 0; i < 10; i++) {
        const styleSheet = new CSSStyleSheet();
        mirror.add(styleSheet);
        expect(mirror.getId(styleSheet)).toBe(i + 1);
        styleList.push(styleSheet);
      }
      expect(mirror.reset()).toBeUndefined();
      for (let s of styleList) expect(mirror.has(s)).toBeFalsy();
      for (let i = 0; i < 10; i++) expect(mirror.getStyle(i + 1)).toBeNull();
      expect(mirror.add(new CSSStyleSheet())).toBe(1);
    });
  });

  describe('inDom()', () => {
    it('should get correct result given nested shadow doms', () => {
      const shadowHost = document.createElement('div');
      const shadowRoot = shadowHost.attachShadow({ mode: 'open' });
      const shadowHost2 = document.createElement('div');
      const shadowRoot2 = shadowHost2.attachShadow({ mode: 'open' });
      const div = document.createElement('div');
      shadowRoot.appendChild(shadowHost2);
      shadowRoot2.appendChild(div);
      // Not in Dom yet.
      expect(getShadowHost(div)).toBe(shadowHost2);
      expect(getRootShadowHost(div)).toBe(shadowHost);
      expect(shadowHostInDom(div)).toBeFalsy();
      expect(inDom(div)).toBeFalsy();

      // Added to the Dom.
      document.body.appendChild(shadowHost);
      expect(getShadowHost(div)).toBe(shadowHost2);
      expect(getRootShadowHost(div)).toBe(shadowHost);
      expect(shadowHostInDom(div)).toBeTruthy();
      expect(inDom(div)).toBeTruthy();
    });

    it('should get correct result given a normal node', () => {
      const div = document.createElement('div');
      // Not in Dom yet.
      expect(getShadowHost(div)).toBeNull();
      expect(getRootShadowHost(div)).toBe(div);
      expect(shadowHostInDom(div)).toBeFalsy();
      expect(inDom(div)).toBeFalsy();

      // Added to the Dom.
      document.body.appendChild(div);
      expect(getShadowHost(div)).toBeNull();
      expect(getRootShadowHost(div)).toBe(div);
      expect(shadowHostInDom(div)).toBeTruthy();
      expect(inDom(div)).toBeTruthy();
    });

    /**
     * Given the textNode of a detached HTMLAnchorElement, getRootNode() will return the anchor element itself and its host property is a string.
     * This corner case may cause an error in getRootShadowHost().
     */
    it('should get correct result given the textNode of a detached HTMLAnchorElement', () => {
      const a = document.createElement('a');
      a.href = 'example.com';
      a.textContent = 'something';
      // Not in Dom yet.
      expect(getShadowHost(a.childNodes[0])).toBeNull();
      expect(getRootShadowHost(a.childNodes[0])).toBe(a.childNodes[0]);
      expect(shadowHostInDom(a.childNodes[0])).toBeFalsy();
      expect(inDom(a.childNodes[0])).toBeFalsy();

      // Added to the Dom.
      document.body.appendChild(a);
      expect(getShadowHost(a.childNodes[0])).toBeNull();
      expect(getRootShadowHost(a.childNodes[0])).toBe(a.childNodes[0]);
      expect(shadowHostInDom(a.childNodes[0])).toBeTruthy();
      expect(inDom(a.childNodes[0])).toBeTruthy();
    });
  });

  describe('mergeEvents()', () => {
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

    const startTimeStamp = 1734952277674;
    it('Merge existing timestamp', async () => {
      // merge events
      const mergedEvents = (await page.evaluate(`
        const { Replayer, utils } = rrweb;
        let replayer = new Replayer(events);
        const startTimeStamp = ${startTimeStamp};
        replayer.pause(startTimeStamp - events[0].timestamp);
        const mirror = replayer.getMirror();
        utils.mergeEvents({
          events: events,
          startTimeStamp,
          snapshotOptions: {
            mirror,
          },
        });
      `)) as eventWithTime[];

      // expect timestamp
      const [meta, fullsnapshot, targetEvent] = mergedEvents;
      expect(targetEvent.timestamp).toEqual(startTimeStamp);
      expect(fullsnapshot.timestamp).toEqual(startTimeStamp - 1);
      expect(meta.timestamp).toEqual(startTimeStamp - 2);
      expect(mergedEvents.length).toEqual(6);

      // will start actions when play
      const actionLength1 = await page.evaluate(`
        replayer.destroy();
        replayer = new Replayer(${JSON.stringify(mergedEvents)});
        replayer.play();
        replayer['timer']['actions'].length;
      `);
      expect(actionLength1).toEqual(mergedEvents.length);

      // can play at any time offset
      const actionLength2 = await page.evaluate(`
        replayer.destroy();
        replayer = new Replayer(${JSON.stringify(mergedEvents)});
        replayer.play(1500);
        replayer['timer']['actions'].length;
      `);
      expect(actionLength2).toEqual(
        mergedEvents.filter((e) => e.timestamp - startTimeStamp >= 1500).length,
      );
    });

    it('Merge non-existing timestamp from start to the end', async () => {
      const newStartTimeStamp = startTimeStamp + 1;
      const newEndTimeStamp = events[events.length - 1].timestamp - 1;

      // merge events
      const mergedEvents = (await page.evaluate(`
        const { Replayer, utils } = rrweb;
        let replayer = new Replayer(events);
        const startTimeStamp = ${newStartTimeStamp};
        const endTimeStamp = ${newEndTimeStamp};
        replayer.pause(startTimeStamp - events[0].timestamp);
        const mirror = replayer.getMirror();
        utils.mergeEvents({
          events: events,
          startTimeStamp,
          endTimeStamp,
          snapshotOptions: {
            mirror,
          },
        });
      `)) as eventWithTime[];

      // expect timestamp
      const [meta, fullsnapshot, targetEvent] = mergedEvents;
      const target = events.find((item) => item.timestamp > newStartTimeStamp);
      const targetTimestamp = target?.timestamp || 0;
      expect(targetEvent.timestamp).toEqual(targetTimestamp);
      expect(fullsnapshot.timestamp).toEqual(targetTimestamp - 1);
      expect(meta.timestamp).toEqual(targetTimestamp - 2);
      expect(mergedEvents.length).toEqual(4);

      // will start actions when play
      const actionLength1 = await page.evaluate(`
        replayer.destroy();
        replayer = new Replayer(${JSON.stringify(mergedEvents)});
        replayer.play();
        replayer['timer']['actions'].length;
      `);
      expect(actionLength1).toEqual(mergedEvents.length);
    });
  });
});
