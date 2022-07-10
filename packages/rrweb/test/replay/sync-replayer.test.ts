import { printRRDom } from 'rrdom';
import { SyncReplayer } from '../../src/replay/sync-replayer';
import { EventType, eventWithTime } from '../../src/types';
import { events as mutationEvents } from '../events/node-mutation';

describe('A synchronous replayer purely built with RRDom', () => {
  it('should play mutation events synchronously', () => {
    const events = mutationEvents as eventWithTime[];
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
