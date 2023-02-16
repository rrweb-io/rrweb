import { NodeType, serializedNodeWithId } from 'rrweb-snapshot';
import type {
  addedNodeMutation,
  adoptedStyleSheetData,
  eventWithTime,
  mousePosition,
  styleDeclarationData,
  styleSheetRuleData,
} from '@rrweb/types';
import { IncrementalSource } from 'rrweb';
import { EventType } from 'rrweb';
import { SyncReplayer } from 'rrweb';
import cloneDeep from 'lodash.clonedeep';
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
    const cutPoint = validSortedPoints[cutPointIndex];
    if (event.timestamp <= cutPoint && index + 1 < events.length) {
      if (results.length === 0) {
        results.push(events.slice(0, index + 1));
      }
      const nextEvent = events[index + 1];

      let currentTimestamp = cutPoint;
      let eventsCache: eventWithTime[] | null = null;
      /**
       * This loop is for the situation that cutting points are in the middle gap between two events.
       * These cut points have the same cut events so there is no need to generate them for each cut point.
       * We can cache the them and use them for the next cut point.
       */
      while (
        cutPointIndex < validSortedTimestamp.length &&
        // If the next event exceed the cut point, we need to cut the events with the current replayer status.
        nextEvent.timestamp > validSortedTimestamp[cutPointIndex]
      ) {
        cutPointIndex++;
        if (eventsCache !== null) {
          const timeDiff = currentTimestamp - eventsCache[0].timestamp;
          const newEvents = eventsCache.map((e) => {
            const newEvent = cloneDeep(e);
            newEvent.timestamp += timeDiff;
            return newEvent;
          });
          results.push(newEvents);
          continue;
        }

        const nextCutTimestamp =
          cutPointIndex < validSortedPoints.length
            ? validSortedTimestamp[cutPointIndex]
            : events[events.length - 1].timestamp;
        const result = cutEvents(
          events.slice(index + 1),
          replayer,
          currentTimestamp,
          nextCutTimestamp,
        );
        eventsCache = result;
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
 * @param events - The events to be cut.
 * @param replayer - The sync replayer instance.
 * @param currentTimestamp - The current timestamp.
 * @param cutTimeStamp - The timestamp to cut.
 */
function cutEvents(
  events: eventWithTime[],
  replayer: SyncReplayer,
  currentTimestamp: number,
  cutTimeStamp: number,
) {
  const result: eventWithTime[] = [];
  if (replayer.latestMetaEvent) {
    const metaEvent = replayer.latestMetaEvent;
    metaEvent.timestamp = currentTimestamp;
    result.push(cloneDeep(metaEvent));
  }
  const fullsnapshotDelay = 1,
    styleDelay = 2;
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
  const fullSnapshotEvent: eventWithTime = {
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
  result.push(fullSnapshotEvent);
  result.push(
    ...replayer.unhandledEvents.map((e) => {
      e.timestamp = currentTimestamp + fullsnapshotDelay;
      return e;
    }),
  );
  result.push(
    ...filterAdoptedStyleData(
      replayer,
      replayer.adoptedStyleSheets,
      replayer.constructedStyleMutations,
      events
        .filter(
          (event) =>
            event.timestamp <= cutTimeStamp &&
            event.type === EventType.IncrementalSnapshot &&
            event.data.source === IncrementalSource.AdoptedStyleSheet,
        )
        .map((event) => event.data as adoptedStyleSheetData),
      currentTimestamp + styleDelay,
    ),
  );
  // TODO handle viewportResize
  // TODO handle input
  // TODO handle mediaInteraction
  // TODO handle scroll

  result.push(
    ...events
      .filter((event) => event.timestamp <= cutTimeStamp)
      .map((e) => cloneDeep(e)),
  );
  return result;
}

/**
 * Keep the adopted style data and style mutations which are still valid at this time point.
 */
function filterAdoptedStyleData(
  replayer: SyncReplayer,
  adoptedStyleSheetData: adoptedStyleSheetData[],
  constructedStyleMutations: (styleSheetRuleData | styleDeclarationData)[],
  upcomingAdoptedStyleSheets: adoptedStyleSheetData[],
  timestamp: number,
) {
  const events: eventWithTime[] = [];
  // A map from style id without style construction to the owner node id.
  const noConstructStyleIdToNodeIdMap = new Map<number, number>();
  const builtStyleIds = new Set<number>();
  const mirror = replayer.getMirror();
  /**
   * Reversely iterate the adopted style sheet data to find valid styles.
   * @param adoptedStyleSheetData - The adopted style sheet data.
   * @param onValidData - The callback function when the data is valid.
   */
  const reverseIterateAdoptedStyleData = (
    adoptedStyleSheetData: adoptedStyleSheetData[],
    onValidData?: (data: adoptedStyleSheetData) => void,
  ) => {
    for (let i = adoptedStyleSheetData.length - 1; i >= 0; i--) {
      const adoptedStyleSheet = adoptedStyleSheetData[i];
      if (mirror.has(adoptedStyleSheet.id)) {
        adoptedStyleSheet.styleIds?.forEach((styleId: number) => {
          if (builtStyleIds.has(styleId)) return;
          noConstructStyleIdToNodeIdMap.set(styleId, adoptedStyleSheet.id);
        });
        adoptedStyleSheet.styles?.forEach((styleConstruction) => {
          if (noConstructStyleIdToNodeIdMap.has(styleConstruction.styleId))
            noConstructStyleIdToNodeIdMap.delete(styleConstruction.styleId);
        });
        onValidData?.(adoptedStyleSheet);
      }
      // The owner node of style data has been removed but its style construction may still be used by other adoptedStyleSheets.
      else {
        if (!adoptedStyleSheet.styles) continue;
        adoptedStyleSheet.styles.forEach((style) => {
          if (builtStyleIds.has(style.styleId)) return;
          const ownerNodeId = noConstructStyleIdToNodeIdMap.get(style.styleId);
          if (!ownerNodeId) return;
          noConstructStyleIdToNodeIdMap.delete(style.styleId);
          builtStyleIds.add(style.styleId);
          onValidData?.({
            source: IncrementalSource.AdoptedStyleSheet,
            id: ownerNodeId,
            styles: [style],
            styleIds: [style.styleId],
          });
        });
      }
    }
  };
  reverseIterateAdoptedStyleData(upcomingAdoptedStyleSheets);
  reverseIterateAdoptedStyleData(adoptedStyleSheetData, (data) => {
    events.unshift({
      type: EventType.IncrementalSnapshot,
      data: cloneDeep(data),
      timestamp,
    });
  });
  const styleMutationDelay = 1;
  constructedStyleMutations.forEach((styleConstruction) => {
    if (
      styleConstruction.styleId &&
      builtStyleIds.has(styleConstruction.styleId)
    )
      events.push({
        type: EventType.IncrementalSnapshot,
        data: cloneDeep(styleConstruction),
        timestamp: timestamp + styleMutationDelay,
      });
  });
  return events;
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
