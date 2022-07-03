import rewire from 'rewire';
import { EventType, eventWithTime } from 'rrweb/src/types';
import { RRNode, RRElement, RRIFrameElement, Mirror } from '../src/';
import { sessionCut } from '../src/tools/session-cutter';
import { SyncReplayer } from '../src/tools/SyncReplayer';
import { events as mutationEvents } from './events/mutation.event';

const rewiredSessionCutter = rewire('../lib/session-cutter');
const getValidSortedPoints = rewiredSessionCutter.__get__(
  'getValidSortedPoints',
);

describe('session cutter', () => {
  it('should return the same events if the events length is too short', () => {
    const events1: eventWithTime[] = [];
    const config = { points: [10] };
    expect(sessionCut(events1, config)).toEqual(events1);

    const events2: eventWithTime[] = [
      {
        type: EventType.Load,
        data: {},
        timestamp: 1,
      } as eventWithTime,
    ];
    expect(sessionCut(events2, config)).toEqual(events2);
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
    expect(sessionCut(events, config)).toEqual(events);
  });

  it('should sort and validate cutting points array', () => {
    const inputPoints = [10, 250.5, -10, -1, 0, 100];
    expect(getValidSortedPoints([], 100)).toEqual([]);
    expect(getValidSortedPoints(inputPoints, 10)).toEqual([10]);
    expect(getValidSortedPoints(inputPoints, 100)).toEqual([10, 100]);
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
});

function printRRDom(rootNode: RRNode, mirror: Mirror) {
  return walk(rootNode, mirror, '');
}
function walk(node: RRNode, mirror: Mirror, blankSpace: string) {
  let printText = `${blankSpace}${mirror.getId(node)} ${node.toString()}\n`;
  if (node instanceof RRElement && node.shadowRoot)
    printText += walk(node.shadowRoot, mirror, blankSpace + '  ');
  for (const child of node.childNodes)
    printText += walk(child, mirror, blankSpace + '  ');
  if (node instanceof RRIFrameElement)
    printText += walk(node.contentDocument, mirror, blankSpace + '  ');
  return printText;
}
