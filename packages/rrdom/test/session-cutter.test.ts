/**
 * @jest-environment jsdom
 */
import rewire from 'rewire';
import path from 'path';
import fs from 'fs';
import { EventType, eventWithTime } from 'rrweb/src/types';
import {
  createMirror,
  snapshot,
  serializedNodeWithId,
  NodeType,
  elementNode,
  documentNode,
} from 'rrweb-snapshot';
import {
  RRNode,
  RRElement,
  RRIFrameElement,
  RRDocument,
  buildFromDom,
  Mirror as RRDomMirror,
} from '../src/';
import { sessionCut } from '../src/tools/session-cutter';
import { snapshot as RRDomSnapshot } from '../src/tools/snapshot';
import { SyncReplayer } from '../src/tools/SyncReplayer';
import { events as mutationEvents } from './events/mutation.event';
import { events as inlineStyleEvents } from './events/inline-style.event';

const rewiredSessionCutter = rewire('../lib/session-cutter');
const getValidSortedPoints: (
  points: number[],
  totalTime: number,
) => number[] = rewiredSessionCutter.__get__('getValidSortedPoints');

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

  describe('A synchronous replayer purely built with RRDom', () => {
    it('should play mutation events synchronously', () => {
      const events = mutationEvents;
      const replayer = new SyncReplayer(events);
      replayer.play(({ event, currentTime }) => {
        if (event.type === EventType.FullSnapshot) {
          expect(
            printRRDom(replayer.virtualDom, replayer.getMirror()),
          ).toMatchSnapshot(`Full Snapshot @ ${currentTime}`);
        } else if (event.type === EventType.IncrementalSnapshot) {
          expect(
            printRRDom(replayer.virtualDom, replayer.getMirror()),
          ).toMatchSnapshot(`Incremental Snapshot @ ${currentTime}`);
        }
      });
    });
  });

  describe('Build full snapshot events from RRDom', () => {
    it("should build full snapshot events from RRDom's mirror: main.html", () => {
      document.write(getHtml('main.html'));
      const rrdom = new RRDocument();
      const mirror = createMirror();
      // the full snapshot that is built on jsdom
      const originalSnapshot = snapshot(document, { mirror });
      if (originalSnapshot) snapshotFilter(originalSnapshot);
      // Create a RRDom according to the jsdom (real dom).
      buildFromDom(document, mirror, rrdom);

      const newFullSnapshot = RRDomSnapshot(rrdom, {
        mirror: rrdom.mirror,
      });
      if (newFullSnapshot) snapshotFilter(newFullSnapshot);
      expect(newFullSnapshot).toEqual(originalSnapshot);
    });
  });

  describe('Cut the session events from several time points', () => {
    it('should cut the simplest mutation events', () => {
      const events = mutationEvents;
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
    const events = inlineStyleEvents;
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

function getHtml(fileName: string) {
  const filePath = path.resolve(__dirname, `./html/${fileName}`);
  return fs.readFileSync(filePath, 'utf8');
}

function printRRDom(rootNode: RRNode, mirror: RRDomMirror) {
  return walk(rootNode, mirror, '');
}
function walk(node: RRNode, mirror: RRDomMirror, blankSpace: string) {
  let printText = `${blankSpace}${mirror.getId(node)} ${node.toString()}\n`;
  if (node instanceof RRElement && node.shadowRoot)
    printText += walk(node.shadowRoot, mirror, blankSpace + '  ');
  for (const child of node.childNodes)
    printText += walk(child, mirror, blankSpace + '  ');
  if (node instanceof RRIFrameElement)
    printText += walk(node.contentDocument, mirror, blankSpace + '  ');
  return printText;
}

/**
 * Some properties in the snapshot shouldn't be checked.
 * 1. css styles' format are different.
 * 2. href and src attributes are different.
 */
function snapshotFilter(n: serializedNodeWithId) {
  if (n.type === NodeType.Element) {
    delete n.attributes['href'];
    delete n.attributes['src'];
  } else if (n.type === NodeType.Text && n.isStyle) n.textContent = '';
  if (
    [NodeType.Document, NodeType.Element].includes(n.type) &&
    (n as documentNode | elementNode).childNodes
  )
    for (const child of (n as elementNode).childNodes) snapshotFilter(child);
}
