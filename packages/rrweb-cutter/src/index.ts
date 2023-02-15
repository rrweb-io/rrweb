import { NodeType, serializedNodeWithId } from 'rrweb-snapshot';
import type {
  addedNodeMutation,
  eventWithTime,
  mousePosition,
} from '@rrweb/types';
import { IncrementalSource } from 'rrweb';
import { EventType } from 'rrweb';
import { SyncReplayer } from 'rrweb';
import snapshot from './snapshot';
type CutterConfig = {
  points: number[];
};

export function sessionCut(
  events: eventWithTime[],
  config: CutterConfig,
): eventWithTime[][] {
  // Events length is too short so that cutting process is not needed.
  if (events.length < 2) return [events];
  const { points } = config;
  if (!points || points.length == 0) return [events];

  events = events.sort((a1, a2) => a1.timestamp - a2.timestamp);
  const totalTime = events[events.length - 1].timestamp - events[0].timestamp;

  const validSortedPoints = getValidSortedPoints(points, totalTime);
  if (validSortedPoints.length < 1) return [events];
  const results: eventWithTime[][] = [];
  const replayer = new SyncReplayer(events);
  let cutPointIndex = 0;
  const baseTime = events[0].timestamp;
  const validSortedTimestamp = validSortedPoints.map(
    (point) => baseTime + point,
  );
  replayer.play(({ index, event }) => {
    if (
      event.timestamp <= validSortedTimestamp[cutPointIndex] &&
      index + 1 < events.length
    ) {
      const nextEvent = events[index + 1];

      let currentTimestamp = event.timestamp;
      let fullSnapshotEvent: eventWithTime | null = null;
      /**
       * This loop is for the situation that cutting points are in the middle gap between two events.
       * These cut points share the same fullsnapshot event so there is no need to generate one for each cut point.
       */
      while (
        cutPointIndex < validSortedTimestamp.length &&
        // If the next event exceed the cut point, we need to cut the events with the current replayer status.
        nextEvent.timestamp > validSortedTimestamp[cutPointIndex]
      ) {
        if (results.length === 0) {
          results.push(events.slice(0, index + 1));
        }
        cutPointIndex++;
        const nextCutTimestamp =
          cutPointIndex < validSortedPoints.length
            ? validSortedTimestamp[cutPointIndex]
            : events[events.length - 1].timestamp;
        if (!fullSnapshotEvent) {
          let fullSnapshot = snapshot(replayer.virtualDom, {
            mirror: replayer.getMirror(),
          });
          if (!fullSnapshot) {
            console.warn(
              `Failed to generate full snapshot at timestamp ${currentTimestamp}. Using a blank snapshot as fallback.`,
            );
            // Fallback to a blank snapshot.
            fullSnapshot = {
              type: NodeType.Document,
              childNodes: [],
              id: 1,
            };
          }
          fullSnapshotEvent = {
            type: EventType.FullSnapshot,
            data: {
              node: fullSnapshot,
              initialOffset: {
                top: replayer.virtualDom.scrollTop,
                left: replayer.virtualDom.scrollLeft,
              },
            },
            timestamp: currentTimestamp,
          };
        }
        fullSnapshotEvent.timestamp = currentTimestamp;
        const result = cutEvents(
          events.slice(index + 1),
          replayer,
          fullSnapshotEvent,
          currentTimestamp,
          nextCutTimestamp,
        );
        results.push(result);
        currentTimestamp = nextCutTimestamp;
      }
      return cutPointIndex < validSortedTimestamp.length;
    }
    return false;
  });
  return results;
}

/**
 * Cut original events at the cutting point which will produce two parts.
 * Only return the events before the cutting point (the previous part).
 * The previous part will be built on the given full snapshot event.
 * @param events - The events to be cut.
 * @param replayer - The sync replayer instance.
 * @param fullSnapshotEvent - The full snapshot event of the current timestamp.
 * @param currentTimestamp - The current timestamp.
 * @param cutTimeStamp - The timestamp to cut.
 */
function cutEvents(
  events: eventWithTime[],
  replayer: SyncReplayer,
  fullSnapshotEvent: eventWithTime,
  currentTimestamp: number,
  cutTimeStamp: number,
) {
  const result: eventWithTime[] = [];
  if (replayer.latestMetaEvent) {
    const metaEvent = replayer.latestMetaEvent;
    metaEvent.timestamp = currentTimestamp;
    result.push(metaEvent);
  }
  result.push(fullSnapshotEvent);
  const properDelay = 10;
  result.push(
    ...replayer.unhandledEvents.map((e) => {
      e.timestamp = currentTimestamp + properDelay;
      return e;
    }),
  );
  // TODO handle adoptedStyleSheets
  // TODO handle viewportResize
  // TODO handle input
  // TODO handle mediaInteraction
  // TODO handle scroll

  result.push(...events.filter((event) => event.timestamp <= cutTimeStamp));
  return result;
}

export function pruneBranches(
  events: eventWithTime[],
  { keep }: { keep: number[] },
): eventWithTime[] {
  const result: eventWithTime[] = [];
  const replayer = new SyncReplayer(events);
  const treeSet = new Set<number>(keep);
  replayer.reversePlay(({ event }) => {
    if (event.type === EventType.FullSnapshot) {
      const { node } = event.data;
      const tree = getTreeForId(treeSet, node, keep);
      tree.forEach((id) => treeSet.add(id));
    } else if (event.type === EventType.IncrementalSnapshot) {
      if (event.data.source === IncrementalSource.Mutation) {
        const { adds, removes } = event.data;
        removes.forEach((remove) => {
          if (treeSet.has(remove.id)) treeSet.add(remove.parentId);
        });
        adds.forEach((add) => {
          const tree = getTreeForId(treeSet, add.node, keep);
          if (tree.size) {
            treeSet.add(add.parentId);
            tree.forEach((id) => treeSet.add(id));
          } else if (
            'childNodes' in add.node &&
            add.node.childNodes.length > 0
          ) {
            const tree = getTreeForId(treeSet, add.node, keep);
            if (tree.size) treeSet.add(add.parentId);
            tree.forEach((id) => treeSet.add(id));
          }
        });
      }
    }
    return true;
  });

  replayer.play(({ event }) => {
    if (
      [EventType.Meta, EventType.Load, EventType.DomContentLoaded].includes(
        event.type,
      )
    ) {
      result.push(event);
    } else if (event.type === EventType.FullSnapshot) {
      const { node } = event.data;
      const prunedNode = reconstructTreeWithIds(node, treeSet);
      if (prunedNode)
        result.push({
          ...event,
          data: {
            ...event.data,
            node: prunedNode,
          },
        } as eventWithTime);
    } else if (event.type === EventType.IncrementalSnapshot) {
      if ('positions' in event.data) {
        const { positions } = event.data;
        const prunedPositions: mousePosition[] = positions.filter((p) =>
          treeSet.has(p.id),
        );
        if (prunedPositions.length > 0)
          result.push({
            ...event,
            data: {
              ...event.data,
              positions: prunedPositions,
            },
          } as eventWithTime);
      } else if ('id' in event.data) {
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        if (treeSet.has(event.data.id!)) result.push(event);
      } else if (event.data.source === IncrementalSource.Mutation) {
        const { removes, adds, texts, attributes } = event.data;
        const prunedRemoves = removes.filter((remove) =>
          treeSet.has(remove.id),
        );
        const prunedAdds = adds
          .map((add) =>
            treeSet.has(add.parentId) && keep.includes(add.parentId)
              ? add
              : {
                  ...add,
                  node: reconstructTreeWithIds(add.node, treeSet),
                },
          )
          .filter((add) => Boolean(add.node)) as addedNodeMutation[];
        const prunedTexts = texts.filter((text) => treeSet.has(text.id));
        const prunedAttributes = attributes.filter((attr) =>
          treeSet.has(attr.id),
        );
        if (
          prunedRemoves.length > 0 ||
          prunedAdds.length > 0 ||
          prunedTexts.length > 0 ||
          prunedAttributes.length > 0
        )
          result.push({
            ...event,
            data: {
              ...event.data,
              removes: prunedRemoves,
              adds: prunedAdds,
              texts: prunedTexts,
              attributes: prunedAttributes,
            },
          } as eventWithTime);
      }
    }
    return true;
  });
  return result;
}

export function getTreeForId(
  treeSet: Set<number>,
  node: serializedNodeWithId,
  keepIds: number[],
): Set<number> {
  const results = new Set<number>();
  if (treeSet.has(node.id)) {
    getIdsInNode(node, keepIds).forEach((id) => results.add(id));
  } else if ('childNodes' in node) {
    for (let i = 0; i < node.childNodes.length; i++) {
      const child = node.childNodes[i];
      const childTree = getTreeForId(treeSet, child, keepIds);
      if (childTree.size > 0) {
        results.add(node.id);
        childTree.forEach((id) => results.add(id));
      }
    }
  }
  return results;
}

export function getIdsInNode(
  node: serializedNodeWithId,
  keepIds: number[],
): Array<number> {
  const results: number[] = [];
  results.push(node.id);
  if (keepIds.includes(node.id) && 'childNodes' in node) {
    for (let i = 0; i < node.childNodes.length; i++) {
      const child = node.childNodes[i];
      results.push(...getIdsInNode(child, keepIds));
    }
  }
  return results;
}

export function reconstructTreeWithIds(
  node: serializedNodeWithId,
  ids: Set<number>,
): serializedNodeWithId | undefined {
  if (ids.has(node.id)) {
    if ('childNodes' in node) {
      node.childNodes = node.childNodes
        .map((child) => reconstructTreeWithIds(child, ids))
        .filter(Boolean) as serializedNodeWithId[];
    }
    return node;
  }
  return undefined;
}

export function getValidSortedPoints(points: number[], totalTime: number) {
  const validSortedPoints = [];
  for (let i = 0; i < points.length; i++) {
    const point = points[i];
    if (point <= 0 || point >= totalTime) continue;
    validSortedPoints.push(point);
  }
  return validSortedPoints.sort();
}
