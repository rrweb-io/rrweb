import { NodeType } from 'rrweb-snapshot';
import {
  adoptedStyleSheetData,
  eventWithTime,
  MediaInteractions,
  styleDeclarationData,
  styleSheetRuleData,
} from '@rrweb/types';
import {
  RRCanvasElement,
  RRStyleElement,
  RRMediaElement,
  RRIFrameElement,
  RRDocument,
} from 'rrdom';
import type { IRRNode, RRElement } from 'rrdom';
import { IncrementalSource, EventType, SyncReplayer } from 'rrweb';
import { playerConfig } from 'rrweb/typings/types';
import cloneDeep from 'lodash.clonedeep';
import snapshot from './snapshot';
export type CutterConfig = {
  points: number[];
  // config for the Sync Replayer
  replayerConfig?: Partial<playerConfig>;
  /**
   * If true, the sequentialId of the events will be updated.
   * If a string, the sequentialId will be updated with the string as the key.
   */
  updateSequentialId?: boolean | string;
  onSessionCut?: (context: {
    replayer: SyncReplayer;
    cutSession: SessionCut;
    originalEvents: eventWithTime[];
  }) => SessionCut;
  customEventsHandler?: (context: {
    replayer: SyncReplayer;
    events: eventWithTime[];
    currentTimestamp: number;
    cutTimestamp: number;
  }) => eventWithTime[];
};

export type SessionCut = {
  events: eventWithTime[];
  startTimestamp: number;
  endTimestamp: number;
  startTime: number;
  endTime: number;
};

export function cutSession(
  events: eventWithTime[],
  config: CutterConfig,
): SessionCut[] {
  const baseTimestamp = events[0]?.timestamp || 0;
  const defaultResult = [
    wrapCutSession(
      events,
      config,
      baseTimestamp,
      events[events.length - 1]?.timestamp || 0,
      baseTimestamp,
    ),
  ];
  // Events length is too short so that cutting process is not needed.
  if (events.length < 2) return defaultResult;

  const { points } = config;
  if (!points || points.length == 0) return defaultResult;

  events = events.sort((a1, a2) => a1.timestamp - a2.timestamp);
  const totalTime = events[events.length - 1].timestamp - events[0].timestamp;

  const validSortedPoints = getValidSortedPoints(points, totalTime);
  if (validSortedPoints.length < 1) return defaultResult;
  const validSortedTimestamp = validSortedPoints.map(
    (point) => baseTimestamp + point,
  );

  const results: SessionCut[] = [];
  const replayer = new SyncReplayer(events, {
    ...config.replayerConfig,
  });
  let cutPointIndex = 0;
  replayer.play(({ index }) => {
    if (index + 1 >= events.length) return false;

    const nextEvent = events[index + 1];

    let currentTimestamp = validSortedTimestamp[cutPointIndex];
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
      if (results.length === 0) {
        results.push(
          wrapCutSession(
            events
              .slice(0, index + 1)
              .filter((e) => e.timestamp < validSortedTimestamp[cutPointIndex]),
            config,
            baseTimestamp,
            currentTimestamp,
            baseTimestamp,
          ),
        );
      }
      cutPointIndex++;
      const nextCutTimestamp =
        cutPointIndex < validSortedTimestamp.length
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
          wrapCutSession(
            newEvents,
            config,
            currentTimestamp,
            nextCutTimestamp,
            baseTimestamp,
          ),
        );
        continue;
      }

      const session = cutEvents(
        events.slice(index + 1).filter((e) => {
          // If this would be the last session, include all of the rest events.
          if (cutPointIndex >= validSortedTimestamp.length) return true;
          return e.timestamp < nextCutTimestamp;
        }),
        replayer,
        config,
        currentTimestamp,
        nextCutTimestamp,
        baseTimestamp,
      );
      results.push(session);
      eventsCache = session.events;
      currentTimestamp = nextCutTimestamp;
    }
    return cutPointIndex < validSortedTimestamp.length;
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
  // The default sortting function will sort the array as string.
  return validSortedPoints.sort((a, b) => a - b);
}

function wrapCutSession(
  events: eventWithTime[],
  config: CutterConfig,
  startTimestamp: number,
  endTimestamp: number,
  baseTimestamp: number,
): SessionCut {
  let clonedEvents = cloneDeep(events);
  if (config.updateSequentialId) {
    const key =
      typeof config.updateSequentialId === 'string'
        ? config.updateSequentialId
        : '_sid';
    let sequentialId = 0;
    clonedEvents = events.map((e) => {
      Object.assign(e, {
        [key]: ++sequentialId,
      });
      return e;
    });
  }
  return {
    events: clonedEvents,
    startTimestamp,
    endTimestamp,
    startTime: startTimestamp - baseTimestamp,
    endTime: endTimestamp - baseTimestamp,
  };
}

/**
 * Cut original events at the cutting point which will produce two parts.
 * Only return the deep cloned cut session before the cutting point (the previous part).
 * @param events - The events to be cut.
 * @param replayer - The sync replayer instance.
 * @param currentTimestamp - The current timestamp.
 * @param cutTimestamp - The timestamp to cut.
 */
function cutEvents(
  events: eventWithTime[],
  replayer: SyncReplayer,
  config: CutterConfig,
  currentTimestamp: number,
  cutTimestamp: number,
  baseTimestamp: number,
) {
  let result: eventWithTime[] = [];
  if (replayer.latestMetaEvent) {
    const metaEvent = { ...replayer.latestMetaEvent };
    metaEvent.timestamp = currentTimestamp;
    result.push(metaEvent);
  }
  const FullsnapshotDelay = 1, // The delay between MetaEvent and FullSnapshot.
    // The delay between FullSnapshot and MetaEvent. Make sure the iframe event is after the full snapshot.
    IFrameEventDelay = 2,
    // The delay between IncrementalSnapshot and MetaEvent. Make sure the incremental event is applied after all frames are loaded.
    IncrementalEventDelay = 3;

  const iframeSnapshots: eventWithTime[] = [];
  const incrementalEvents: eventWithTime[] = [];
  const onSerialize = (n: IRRNode) => {
    const timestamp = currentTimestamp + IncrementalEventDelay;
    if (n.RRNodeType === NodeType.Document) {
      const rrDoc = n as RRDocument;
      rrDoc.scrollData &&
        incrementalEvents.push({
          type: EventType.IncrementalSnapshot,
          data: rrDoc.scrollData,
          timestamp,
        });
      return;
    }
    const rrElement = n as RRElement;
    rrElement.inputData &&
      incrementalEvents.push({
        type: EventType.IncrementalSnapshot,
        data: rrElement.inputData,
        timestamp,
      });
    rrElement.scrollData &&
      incrementalEvents.push({
        type: EventType.IncrementalSnapshot,
        data: rrElement.scrollData,
        timestamp,
      });
    if (rrElement instanceof RRCanvasElement)
      rrElement.canvasMutations.forEach((canvasData) =>
        incrementalEvents.push({
          type: EventType.IncrementalSnapshot,
          data: canvasData.mutation,
          timestamp,
        }),
      );
    else if (rrElement instanceof RRStyleElement)
      rrElement.rules.forEach((styleRule) =>
        incrementalEvents.push({
          type: EventType.IncrementalSnapshot,
          data: styleRule,
          timestamp,
        }),
      );
    else if (rrElement instanceof RRMediaElement) {
      (rrElement.volume !== undefined || rrElement.muted !== undefined) &&
        incrementalEvents.push({
          type: EventType.IncrementalSnapshot,
          data: {
            source: IncrementalSource.MediaInteraction,
            type: MediaInteractions.VolumeChange,
            volume: rrElement.volume,
            muted: rrElement.muted,
            id: replayer.getMirror().getId(n),
          },
          timestamp,
        });
      rrElement.playbackRate !== undefined &&
        incrementalEvents.push({
          type: EventType.IncrementalSnapshot,
          data: {
            source: IncrementalSource.MediaInteraction,
            type: MediaInteractions.RateChange,
            playbackRate: rrElement.playbackRate,
            id: replayer.getMirror().getId(n),
          },
          timestamp,
        });
    } else if (rrElement instanceof RRIFrameElement) {
      if (!rrElement.contentDocument) return;
      const iframeSnapshot = snapshot(rrElement.contentDocument, {
        mirror: replayer.getMirror(),
        onSerialize,
      });
      if (!iframeSnapshot) return;
      iframeSnapshots.push({
        type: EventType.IncrementalSnapshot,
        data: {
          source: IncrementalSource.Mutation,
          adds: [
            {
              parentId: replayer.getMirror().getId(rrElement),
              nextId: null,
              node: iframeSnapshot,
            },
          ],
          removes: [],
          texts: [],
          attributes: [],
          isAttachIframe: true,
        },
        timestamp: currentTimestamp + IFrameEventDelay,
      });
    }
  };

  let fullSnapshot = snapshot(replayer.virtualDom, {
    mirror: replayer.getMirror(),
    onSerialize,
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
    timestamp: currentTimestamp + FullsnapshotDelay,
  };
  result.push(fullSnapshotEvent);
  result = result.concat(iframeSnapshots, incrementalEvents);
  result = result.concat(
    replayer.unhandledEvents.map((e) => ({
      ...e,
      timestamp: currentTimestamp + IncrementalEventDelay,
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
            event.timestamp <= cutTimestamp &&
            event.type === EventType.IncrementalSnapshot &&
            event.data.source === IncrementalSource.AdoptedStyleSheet,
        )
        .map((event) => event.data as adoptedStyleSheetData),
      currentTimestamp + IncrementalEventDelay,
    ),
  );

  replayer.mousePos &&
    result.push({
      type: EventType.IncrementalSnapshot,
      data: {
        source: IncrementalSource.MouseMove,
        positions: [
          {
            x: replayer.mousePos.x,
            y: replayer.mousePos.y,
            id: replayer.mousePos.id,
            timeOffset: 0,
          },
        ],
      },
      timestamp: currentTimestamp + IncrementalEventDelay,
    });

  replayer.lastSelectionData &&
    result.push({
      type: EventType.IncrementalSnapshot,
      data: replayer.lastSelectionData,
      timestamp: currentTimestamp + IncrementalEventDelay,
    });
  if (config.customEventsHandler)
    try {
      result = result.concat(
        config.customEventsHandler({
          events,
          replayer,
          currentTimestamp,
          cutTimestamp,
        }),
      );
    } catch (e) {
      warn(config, 'Custom Event Handler error: ', e);
    }
  result = result.concat(events);
  let session = wrapCutSession(
    result,
    config,
    currentTimestamp,
    cutTimestamp,
    baseTimestamp,
  );
  if (config.onSessionCut)
    try {
      session = config.onSessionCut({
        cutSession: session,
        replayer,
        originalEvents: events,
      });
    } catch (e) {
      warn(config, 'Custom Event Handler error: ', e);
    }
  return session;
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

function warn(config: CutterConfig, ...args: unknown[]) {
  const logger = config.replayerConfig?.logger || console;
  if (config.replayerConfig?.showWarning || config.replayerConfig?.showDebug)
    logger.warn(args);
}
