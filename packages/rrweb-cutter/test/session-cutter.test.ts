/**
 * @jest-environment jsdom
 */
import path from 'path';
import fs from 'fs';
import { createMirror, snapshot, NodeType } from 'rrweb-snapshot';
import { EventType } from 'rrweb';
import { SyncReplayer } from 'rrweb';
import type { eventWithTime } from '@rrweb/types';
import { RRDocument, buildFromDom, printRRDom } from 'rrdom';
import { sessionCut, getValidSortedPoints, pruneBranches } from '../src';
import { snapshot as RRDomSnapshot } from '../src/snapshot';
import { events as mutationEvents } from './events/mutation.event';
import { eventsFn as inlineStyleEvents } from './events/inline-style.event';
import { assertSnapshot } from 'rrweb/test/utils';

describe('session cutter', () => {
  it('should return the same events if the events length is too short', () => {
    const events1: eventWithTime[] = [];
    const config = { points: [10] };
    expect(sessionCut(events1, config)).toEqual([events1]);

    const events2: eventWithTime[] = [
      {
        type: EventType.Load,
        data: {},
        timestamp: 1,
      } as eventWithTime,
    ];
    expect(sessionCut(events2, config)).toEqual([events2]);
  });

  it('should return the same events if the points length is 0', () => {
    const events: eventWithTime[] = [
      {
        type: EventType.Load,
        data: {},
        timestamp: 1,
      } as eventWithTime,
      {
        type: EventType.Meta,
        data: {},
        timestamp: 2,
      } as eventWithTime,
    ];
    const config = { points: [] };
    expect(sessionCut(events, config)).toEqual([events]);
  });

  it('should sort and validate cutting points array', () => {
    const inputPoints = [10, 250.5, -10, -1, 0, 100];
    expect(getValidSortedPoints([], 100)).toEqual([]);
    expect(getValidSortedPoints(inputPoints, 11)).toEqual([10]);
    expect(getValidSortedPoints(inputPoints, 10)).toEqual([]);
    expect(getValidSortedPoints(inputPoints, 100)).toEqual([10]);
    expect(getValidSortedPoints(inputPoints, 300)).toEqual([10, 100, 250.5]);
  });

  describe('Build full snapshot events from RRDom', () => {
    it("should build full snapshot events from RRDom's mirror: main.html", () => {
      document.write(getHtml('main.html'));
      const rrdom = new RRDocument();
      const mirror = createMirror();
      // the full snapshot that is built on jsdom
      const originalSnapshot = snapshot(document, { mirror });

      // Create a RRDom according to the jsdom (real dom).
      buildFromDom(document, mirror, rrdom);

      const newFullSnapshot = RRDomSnapshot(rrdom, {
        mirror: rrdom.mirror,
      });
      expect(newFullSnapshot).toEqual(originalSnapshot);
    });
  });

  describe('Cut the session events from several time points', () => {
    it('should cut the simplest mutation events', () => {
      const events = mutationEvents as eventWithTime[];
      const result = sessionCut(events, { points: [1000, 2000] });
      expect(result).toHaveLength(3);

      // all events before 1000ms
      const sessionBefore1s = result[0];
      const cutPoint1Length = 5;
      expect(sessionBefore1s).toHaveLength(cutPoint1Length);
      // These events are directly sliced from the original events.
      expect(sessionBefore1s).toEqual(events.slice(0, cutPoint1Length));

      // all events between 1000ms and 2000ms
      const sessionBetween1s2s = result[1];
      expect(sessionBetween1s2s).toHaveLength(3);
      expect(sessionBetween1s2s[0].type).toEqual(EventType.Meta);
      expect(sessionBetween1s2s[1].type).toEqual(EventType.FullSnapshot);
      expect(sessionBetween1s2s[2].type).toEqual(EventType.IncrementalSnapshot);
      let replayer = new SyncReplayer(sessionBetween1s2s.slice(0, 2)); // only play meta and full snapshot events
      replayer.play();
      // screenshot at 1000ms
      expect(
        printRRDom(replayer.virtualDom, replayer.getMirror()),
      ).toMatchSnapshot('screenshot at 1000ms');

      // all events after 2000ms
      const sessionAfter2s = result[2];
      expect(sessionAfter2s).toHaveLength(3);
      expect(sessionAfter2s[0].type).toEqual(EventType.Meta);
      expect(sessionAfter2s[1].type).toEqual(EventType.FullSnapshot);
      expect(sessionAfter2s[2].type).toEqual(EventType.IncrementalSnapshot);
      replayer = new SyncReplayer(sessionAfter2s);
      replayer.play(({ index }) => {
        if (index === 1)
          // full snapshot
          // screen shot at 2000ms
          expect(
            printRRDom(replayer.virtualDom, replayer.getMirror()),
          ).toMatchSnapshot('screenshot at 2000ms');
      });
      // screen shot at 3000ms
      expect(
        printRRDom(replayer.virtualDom, replayer.getMirror()),
      ).toMatchSnapshot('screenshot at 3000ms');
    });
  });

  it('should cut events with inline styles', () => {
    const events = inlineStyleEvents() as eventWithTime[];
    const result = sessionCut(events, { points: [1000] });
    expect(result).toHaveLength(2);
    // all events before 1000ms
    const sessionBefore1s = result[0];
    const cutPoint1Length = 5;
    expect(sessionBefore1s).toHaveLength(cutPoint1Length);
    // These events are directly sliced from the original events.
    expect(sessionBefore1s).toEqual(events.slice(0, cutPoint1Length));

    // all events after 1000ms
    const sessionAfter1s = result[1];
    expect(sessionAfter1s).toHaveLength(3);
    const replayer = new SyncReplayer(sessionAfter1s.slice(0, 2)); // only play meta and full snapshot events
    replayer.play();
    // screenshot at 1000ms
    expect(
      printRRDom(replayer.virtualDom, replayer.getMirror()),
    ).toMatchSnapshot('screenshot at 1000ms');
  });
});

describe('pruneBranches', () => {
  it("should cut branches that doesn't include id", () => {
    const events = inlineStyleEvents() as eventWithTime[];
    const result = pruneBranches(events, { keep: [14] });
    expect(result).toHaveLength(5);
    const replayer = new SyncReplayer(result);
    replayer.play();

    expect(
      printRRDom(replayer.virtualDom, replayer.getMirror()),
    ).toMatchSnapshot('pruned all but 14');
  });

  it("should remove mutations that don't include ids", () => {
    const mutationEvent = {
      type: EventType.IncrementalSnapshot,
      data: {
        source: 0,
        texts: [
          {
            id: 15,
            value: 'Kept',
          },
          {
            id: 1001,
            value: 'Cut',
          },
        ],
        attributes: [
          {
            id: 14,
            attributes: {
              'data-attr': 'Kept',
            },
          },
          {
            id: 1002,
            attributes: {
              'data-attr': 'Cut',
            },
          },
        ],
        removes: [
          {
            parentId: 14,
            id: 15,
          },
          {
            parentId: 1002,
            id: 1003,
          },
        ],
        adds: [
          {
            parentId: 14,
            nextId: null,
            node: {},
          },
          {
            parentId: 1001,
            nextId: null,
            node: {},
          },
        ],
      },
    };
    const events = [...inlineStyleEvents(), mutationEvent] as eventWithTime[];
    const result = pruneBranches(events, { keep: [14] });
    expect(result[result.length - 1]).toMatchSnapshot();
  });

  it('should remove branches based on nodes that came in after fullsnapshot', () => {
    const mutationEvent = {
      type: EventType.IncrementalSnapshot,
      data: {
        source: 0,
        texts: [],
        attributes: [],
        removes: [],
        adds: [
          {
            parentId: 14,
            nextId: null,
            node: {
              id: 99,
              type: NodeType.Element,
              tagName: 'canvas',
              attributes: {},
              childNodes: [],
            },
          },
        ],
      },
    };
    const events = [...inlineStyleEvents(), mutationEvent] as eventWithTime[];
    const result = pruneBranches(events, { keep: [99] });
    assertSnapshot(result);
  });
  it('should remove branches based on child nodes that came in after fullsnapshot', () => {
    const mutationEvent = {
      type: EventType.IncrementalSnapshot,
      data: {
        source: 0,
        texts: [],
        attributes: [],
        removes: [],
        adds: [
          {
            parentId: 14,
            nextId: null,
            node: {
              id: 98,
              type: NodeType.Element,
              tagName: 'main',
              attributes: {},
              childNodes: [
                {
                  id: 99,
                  type: NodeType.Element,
                  tagName: 'canvas',
                  attributes: {},
                  childNodes: [],
                },
              ],
            },
          },
        ],
      },
    };
    const events = [...inlineStyleEvents(), mutationEvent] as eventWithTime[];
    const result = pruneBranches(events, { keep: [99] });
    assertSnapshot(result);
  });

  it('should keep branches where target child nodes was, and gets moved to', () => {
    const mutationEvent = {
      type: EventType.IncrementalSnapshot,
      data: {
        source: 0,
        texts: [],
        attributes: [],
        removes: [
          {
            parentId: 14,
            id: 15,
          },
        ],
        adds: [
          {
            parentId: 5,
            nextId: null,
            node: { type: 3, textContent: '      \n    ', id: 15 },
          },
        ],
      },
    };
    const events = [...inlineStyleEvents(), mutationEvent] as eventWithTime[];
    const result = pruneBranches(events, { keep: [15] });
    assertSnapshot(result);
  });
});

function getHtml(fileName: string) {
  const filePath = path.resolve(__dirname, `./html/${fileName}`);
  return fs.readFileSync(filePath, 'utf8');
}
