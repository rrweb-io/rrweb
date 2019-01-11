import { SnapshotState, toMatchSnapshot } from 'jest-snapshot';
import { NodeType } from 'rrweb-snapshot';
import { assert } from 'chai';
import { EventType, IncrementalSource, eventWithTime } from '../src/types';

function matchSnapshot(actual: string, testFile: string, testTitle: string) {
  const snapshotState = new SnapshotState(testFile, {
    updateSnapshot: process.env.SNAPSHOT_UPDATE ? 'all' : 'new',
  });

  const matcher = toMatchSnapshot.bind({
    snapshotState,
    currentTestName: testTitle,
  });
  const result = matcher(actual);
  snapshotState.save();
  return result;
}

/**
 * Puppeteer may cast random mouse move which make our tests flaky.
 * So we only do snapshot test with filtered events.
 * Also remove timestamp from event.
 * @param snapshots incrementalSnapshotEvent[]
 */
function stringifySnapshots(snapshots: eventWithTime[]): string {
  return JSON.stringify(
    snapshots
      .filter(s => {
        if (
          s.type === EventType.IncrementalSnapshot &&
          s.data.source === IncrementalSource.MouseMove
        ) {
          return false;
        }
        return true;
      })
      .map(s => {
        if (s.type === EventType.Meta) {
          s.data.href = 'about:blank';
        }
        // FIXME: travis coordinates seems different with my laptop
        const coordinatesReg = /(bottom|top|left|right)/;
        if (
          s.type === EventType.IncrementalSnapshot &&
          s.data.source === IncrementalSource.MouseInteraction
        ) {
          delete s.data.x;
          delete s.data.y;
        }
        if (
          s.type === EventType.IncrementalSnapshot &&
          s.data.source === IncrementalSource.Mutation
        ) {
          s.data.attributes.forEach(a => {
            if (
              'style' in a.attributes &&
              coordinatesReg.test(a.attributes.style!)
            ) {
              delete a.attributes.style;
            }
          });
          s.data.adds.forEach(add => {
            if (
              add.node.type === NodeType.Element &&
              'style' in add.node.attributes &&
              typeof add.node.attributes.style === 'string' &&
              coordinatesReg.test(add.node.attributes.style)
            ) {
              delete add.node.attributes.style;
            }
          });
        }
        delete s.timestamp;
        return s;
      }),
    null,
    2,
  );
}

export function assertSnapshot(
  snapshots: eventWithTime[],
  filename: string,
  name: string,
) {
  const result = matchSnapshot(stringifySnapshots(snapshots), filename, name);
  assert(result.pass, result.pass ? '' : result.report());
}
