/**
 * @jest-environment jsdom
 */
import path from 'path';
import fs from 'fs';
import { createMirror, snapshot } from 'rrweb-snapshot';
import { EventType } from 'rrweb';
import { SyncReplayer } from 'rrweb';
import { IncrementalSource, eventWithTime, metaEvent } from '@rrweb/types';
import { RRDocument, RRElement, buildFromDom, printRRDom } from 'rrdom';
import { cutSession, getValidSortedPoints } from '../src';
import { snapshot as RRDomSnapshot } from '../src/snapshot';
import { events as mutationEvents } from './events/mutation.event';
import { events as inputEvents } from './events/input.event';
import { eventsFn as inlineStyleEvents } from './events/inline-style.event';
import { events as multipleSnapshotEvents } from './events/multi-fullsnapshot.event';

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

  it('new generated session should have a correct meta event', () => {
    const cutTime = 1000;
    const result = cutSession(mutationEvents, { points: [cutTime] });
    expect(result).toHaveLength(2);
    const generatedSession = result[1];
    const originalMetaEvent = mutationEvents.filter(
      (event) => event.type === EventType.Meta,
    )[0] as metaEvent;
    expect(originalMetaEvent.type).toEqual(EventType.Meta);
    const metaEvent = generatedSession.events[0] as eventWithTime;
    expect(metaEvent.type).toEqual(EventType.Meta);
    expect(metaEvent.data).toEqual(originalMetaEvent.data);
    expect(metaEvent.timestamp).toEqual(generatedSession.startTimestamp);
  });

  it('should generate correct meta events from multiple meta events', () => {
    const points = [2000, 4000];
    const results = cutSession(multipleSnapshotEvents, { points });
    expect(results).toHaveLength(3);

    // All meta events in the original events
    const metaEvents = multipleSnapshotEvents.filter(
      (e) => e.type === EventType.Meta,
    );
    expect(metaEvents).toHaveLength(2);

    // The first session should have the first meta event
    expect(
      results[0].events.filter((e) => e.type === EventType.Meta)[0].data,
    ).toEqual(metaEvents[0].data);

    // The session after 2000ms should still have the first meta event
    expect(
      results[1].events.filter((e) => e.type === EventType.Meta)[0].data,
    ).toEqual(metaEvents[0].data);

    // The session after 4000ms should start from the second meta event
    expect(
      results[2].events.filter((e) => e.type === EventType.Meta)[0].data,
    ).toEqual(metaEvents[1].data);
  });

  it('should cut events with input events correctly', () => {
    const points = [1000, 1500];
    const results = cutSession(inputEvents, { points });
    expect(results).toHaveLength(3);

    const Input1NodeId = 6,
      Input2NodeId = 33,
      SelectionNodeId = 26;

    let replayer = new SyncReplayer(results[0].events);
    replayer.play();
    let inputElement1 = replayer.getMirror().getNode(Input1NodeId);
    expect(inputElement1).not.toBeNull();
    expect((inputElement1 as RRElement).getAttribute('value')).toEqual(
      'valueA',
    );

    // The new session start from 1000ms
    replayer = new SyncReplayer(results[1].events);
    replayer.play();
    let incrementalInputEvents = results[1].events.filter(
      (e) =>
        e.type === EventType.IncrementalSnapshot &&
        e.data.source === IncrementalSource.Input,
    );
    expect(incrementalInputEvents).toHaveLength(1);
    // The incremental input event should be played within 5ms
    const inputEvent = incrementalInputEvents[0];
    expect(inputEvent.timestamp - results[1].startTimestamp).toBeLessThan(5);
    inputElement1 = replayer.getMirror().getNode(Input1NodeId);
    expect(inputElement1).not.toBeNull();
    expect((inputElement1 as RRElement).inputData).toEqual(inputEvent.data);
    let selectionElement = replayer.getMirror().getNode(SelectionNodeId);
    expect(selectionElement).not.toBeNull();
    expect(selectionElement?.childNodes).toHaveLength(3);
    let inputElement2 = replayer.getMirror().getNode(Input2NodeId);
    expect(inputElement2).not.toBeNull();
    expect(inputElement2?.nodeType).toBe(document.ELEMENT_NODE);

    // The new session start from 1500ms
    replayer = new SyncReplayer(results[2].events);
    replayer.play();
    // The incremental input event should be played within 5ms
    incrementalInputEvents = results[2].events.filter(
      (e) =>
        e.type === EventType.IncrementalSnapshot &&
        e.data.source === IncrementalSource.Input,
    );
    expect(incrementalInputEvents).toHaveLength(3);
    // All incremental input events should be played within 5ms
    expect(
      incrementalInputEvents.filter(
        (e) => e.timestamp - results[2].startTimestamp < 5,
      ),
    ).toHaveLength(3);
    inputElement1 = replayer.getMirror().getNode(Input1NodeId);
    expect((inputElement1 as RRElement).inputData).toEqual(
      incrementalInputEvents[0].data,
    );
    selectionElement = replayer.getMirror().getNode(SelectionNodeId);
    expect(selectionElement).not.toBeNull();
    expect((selectionElement as RRElement).inputData).toEqual(
      incrementalInputEvents[1].data,
    );
    inputElement2 = replayer.getMirror().getNode(Input2NodeId);
    expect(inputElement2).not.toBeNull();
    expect((inputElement2 as RRElement).inputData).toEqual(
      incrementalInputEvents[2].data,
    );
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
