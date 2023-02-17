import { NodeType } from 'rrweb-snapshot';
import type {
  adoptedStyleSheetData,
  eventWithTime,
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

export type SessionCut = {
  events: eventWithTime[];
  startTimestamp: number;
  endTimestamp: number;
};

export function cutSession(
  events: eventWithTime[],
  config: CutterConfig,
): SessionCut[] {
  // Events length is too short so that cutting process is not needed.
  if (events.length < 2) return [];
  const { points } = config;
  if (!points || points.length == 0)
    return [wrapCutSession(events, 0, events[events.length - 1].timestamp)];

  events = events.sort((a1, a2) => a1.timestamp - a2.timestamp);
  const totalTime = events[events.length - 1].timestamp - events[0].timestamp;

  const validSortedPoints = getValidSortedPoints(points, totalTime);
  if (validSortedPoints.length < 1)
    return [wrapCutSession(events, 0, events[events.length - 1].timestamp)];
  const results: SessionCut[] = [];
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
        results.push(
          wrapCutSession(events.slice(0, index + 1), 0, cutPoint - baseTime),
        );
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
        const nextCutTimestamp =
          cutPointIndex < validSortedPoints.length
            ? validSortedTimestamp[cutPointIndex]
            : events[events.length - 1].timestamp;
        if (eventsCache !== null) {
          const timeDiff = currentTimestamp - eventsCache[0].timestamp;
          const newEvents = eventsCache.map((e) => ({
            ...e,
            timestamp:
              e.timestamp < currentTimestamp
                ? e.timestamp + timeDiff
                : e.timestamp,
          }));
          results.push(
            wrapCutSession(newEvents, currentTimestamp, nextCutTimestamp),
          );
          continue;
        }

        const result = cutEvents(
          events.slice(index + 1),
          replayer,
          currentTimestamp,
          nextCutTimestamp,
        );
        eventsCache = result;
        results.push(
          wrapCutSession(result, currentTimestamp, nextCutTimestamp),
        );
        currentTimestamp = nextCutTimestamp;
      }
      return cutPointIndex < validSortedTimestamp.length;
    }
    return false;
  });
  return results;
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

function wrapCutSession(
  events: eventWithTime[],
  startTimestamp: number,
  endTimestamp: number,
): SessionCut {
  return {
    events: cloneDeep(events),
    startTimestamp,
    endTimestamp,
  };
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
  let result: eventWithTime[] = [];
  if (replayer.latestMetaEvent) {
    const metaEvent = { ...replayer.latestMetaEvent };
    metaEvent.timestamp = currentTimestamp;
    result.push(metaEvent);
  }
  const fullsnapshotDelay = 1,
    styleDelay = 2,
    unhandledEventDelay = 2;
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
    timestamp: currentTimestamp + fullsnapshotDelay,
  };
  result.push(fullSnapshotEvent);
  result = result.concat(
    replayer.unhandledEvents.map((e) => ({
      ...e,
      timestamp: currentTimestamp + unhandledEventDelay,
    })),
  );
  result = result.concat(
    filterAdoptedStyleData(
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

  result = result.concat(
    events.filter((event) => event.timestamp <= cutTimeStamp),
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
      data,
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
        data: styleConstruction,
        timestamp: timestamp + styleMutationDelay,
      });
  });
  return events;
}
