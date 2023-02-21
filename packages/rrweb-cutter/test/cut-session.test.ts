/**
 * @jest-environment jsdom
 */
import path from 'path';
import fs from 'fs';
import { createMirror, snapshot } from 'rrweb-snapshot';
import { EventType } from 'rrweb';
import { SyncReplayer } from 'rrweb';
import type { eventWithTime } from '@rrweb/types';
import { RRDocument, buildFromDom, printRRDom } from 'rrdom';
import { cutSession, getValidSortedPoints } from '../src';
import { snapshot as RRDomSnapshot } from '../src/snapshot';
import { events as mutationEvents } from './events/mutation.event';
import { eventsFn as inlineStyleEvents } from './events/inline-style.event';

describe('cut session', () => {
  it('should return the same events if the events length is too short', () => {
    const events1: eventWithTime[] = [];
    const config = { points: [10] };
    expect(cutSession(events1, config)).toEqual([
      {
        events: events1,
        startTimestamp: 0,
        endTimestamp: 0,
        startTime: 0,
        endTime: 0,
      },
    ]);

    const events2: eventWithTime[] = [
      {
        type: EventType.Load,
        data: {},
        timestamp: Date.now(),
      } as eventWithTime,
    ];
    expect(cutSession(events2, config)).toEqual([
      {
        events: events2,
        startTimestamp: events2[0].timestamp,
        endTimestamp: events2[0].timestamp,
        startTime: 0,
        endTime: 0,
      },
    ]);
  });

  it('should return the same events if the points length is 0', () => {
    const events: eventWithTime[] = [
      {
        type: EventType.Load,
        data: {},
        timestamp: Date.now(),
      } as eventWithTime,
      {
        type: EventType.Meta,
        data: {},
        timestamp: Date.now() + 100,
      } as eventWithTime,
    ];
    const config = { points: [] };
    expect(cutSession(events, config)).toEqual([
      {
        events,
        startTimestamp: events[0].timestamp,
        endTimestamp: events[1].timestamp,
        startTime: 0,
        endTime: events[1].timestamp - events[0].timestamp,
      },
    ]);
  });

  it('should sort and validate cutting points array', () => {
    const inputPoints = [10, 250.5, -10, -1, 0, 100];
    expect(getValidSortedPoints([], 100)).toEqual([]);
    expect(getValidSortedPoints(inputPoints, 11)).toEqual([10]);
    expect(getValidSortedPoints(inputPoints, 10)).toEqual([]);
    expect(getValidSortedPoints(inputPoints, 100)).toEqual([10]);
    expect(getValidSortedPoints(inputPoints, 300)).toEqual([10, 100, 250.5]);
  });

  it('should cut the simplest mutation events', () => {
    const events = mutationEvents as eventWithTime[];
    const cutTime1 = 1000,
      cutTime2 = 2000;
    const result = cutSession(events, { points: [cutTime1, cutTime2] });
    expect(result).toHaveLength(3);

    // cut session before 1000ms
    const sessionBefore1s = result[0];
    expect(sessionBefore1s.startTimestamp).toEqual(events[0].timestamp);
    expect(sessionBefore1s.endTimestamp).toEqual(
      events[0].timestamp + cutTime1,
    );
    expect(sessionBefore1s.startTime).toEqual(0);
    expect(sessionBefore1s.endTime).toEqual(cutTime1);
    const cutPoint1Length = 5;
    expect(sessionBefore1s.events).toHaveLength(cutPoint1Length);
    // These events are directly sliced from the original events.
    expect(sessionBefore1s.events).toEqual(events.slice(0, cutPoint1Length));

    // all events between 1000ms and 2000ms
    const sessionBetween1s2s = result[1];
    expect(sessionBetween1s2s.startTimestamp).toEqual(
      events[0].timestamp + cutTime1,
    );
    expect(sessionBetween1s2s.endTimestamp).toEqual(
      events[0].timestamp + cutTime2,
    );
    expect(sessionBetween1s2s.startTime).toEqual(cutTime1);
    expect(sessionBetween1s2s.endTime).toEqual(cutTime2);
    expect(sessionBetween1s2s.events).toHaveLength(3);
    expect(sessionBetween1s2s.events[0].type).toEqual(EventType.Meta);
    expect(sessionBetween1s2s.events[1].type).toEqual(EventType.FullSnapshot);
    expect(sessionBetween1s2s.events[2].type).toEqual(
      EventType.IncrementalSnapshot,
    );
    let replayer = new SyncReplayer(sessionBetween1s2s.events.slice(0, 2)); // only play meta and full snapshot events
    replayer.play();
    // screenshot at 1000ms
    expect(
      printRRDom(replayer.virtualDom, replayer.getMirror()),
    ).toMatchSnapshot('screenshot at 1000ms');

    // all events after 2000ms
    const sessionAfter2s = result[2];
    expect(sessionAfter2s.startTimestamp).toEqual(
      events[0].timestamp + cutTime2,
    );
    expect(sessionAfter2s.endTimestamp).toEqual(
      events[events.length - 1].timestamp,
    );
    expect(sessionAfter2s.startTime).toEqual(cutTime2);
    expect(sessionAfter2s.endTime).toEqual(
      events[events.length - 1].timestamp - events[0].timestamp,
    );
    expect(sessionAfter2s.events).toHaveLength(3);
    expect(sessionAfter2s.events[0].type).toEqual(EventType.Meta);
    expect(sessionAfter2s.events[1].type).toEqual(EventType.FullSnapshot);
    expect(sessionAfter2s.events[2].type).toEqual(
      EventType.IncrementalSnapshot,
    );
    replayer = new SyncReplayer(sessionAfter2s.events);
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

  it('should cut events with inline styles', () => {
    const events = inlineStyleEvents() as eventWithTime[];
    const cutTime1 = 1000;
    const result = cutSession(events, { points: [cutTime1] });
    expect(result).toHaveLength(2);
    // all events before 1000ms
    const sessionBefore1s = result[0];
    expect(sessionBefore1s.startTimestamp).toEqual(events[0].timestamp);
    expect(sessionBefore1s.endTimestamp).toEqual(
      events[0].timestamp + cutTime1,
    );
    expect(sessionBefore1s.startTime).toEqual(0);
    expect(sessionBefore1s.endTime).toEqual(cutTime1);
    const cutPoint1Length = 5;
    expect(sessionBefore1s.events).toHaveLength(cutPoint1Length);
    // These events are directly sliced from the original events.
    expect(sessionBefore1s.events).toEqual(events.slice(0, cutPoint1Length));

    // all events after 1000ms
    const sessionAfter1s = result[1];
    expect(sessionAfter1s.startTimestamp).toEqual(
      events[0].timestamp + cutTime1,
    );
    expect(sessionAfter1s.endTimestamp).toEqual(
      events[events.length - 1].timestamp,
    );
    expect(sessionAfter1s.startTime).toEqual(cutTime1);
    expect(sessionAfter1s.endTime).toEqual(
      events[events.length - 1].timestamp - events[0].timestamp,
    );
    expect(sessionAfter1s.events).toHaveLength(3);
    const replayer = new SyncReplayer(sessionAfter1s.events.slice(0, 2)); // only play meta and full snapshot events
    replayer.play();
    // screenshot at 1000ms
    expect(
      printRRDom(replayer.virtualDom, replayer.getMirror()),
    ).toMatchSnapshot('screenshot at 1000ms');
  });
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

function getHtml(fileName: string) {
  const filePath = path.resolve(__dirname, `./html/${fileName}`);
  return fs.readFileSync(filePath, 'utf8');
}
